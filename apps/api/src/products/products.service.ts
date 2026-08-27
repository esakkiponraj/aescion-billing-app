import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProductInput } from '@aescion/validation';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async findAll(organizationId: string, search?: string, category?: string) {
    const where: any = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    return this.prisma.product.findMany({
      where,
      include: { variants: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: { variants: true }
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcodeOrSku(organizationId: string, query: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        organizationId,
        OR: [
          { barcode: { equals: query, mode: 'insensitive' } },
          { sku: { equals: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { variants: true }
    });
    return product;
  }

  async create(organizationId: string, branchId: string, userId: string, userName: string, dto: CreateProductInput) {
    const existing = await this.prisma.product.findFirst({
      where: { organizationId, sku: dto.sku }
    });
    if (existing) {
      throw new ConflictException(`A product with SKU ${dto.sku} already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          organizationId,
          name: dto.name,
          sku: dto.sku,
          barcode: dto.barcode,
          category: dto.category,
          brand: dto.brand,
          unit: dto.unit || 'PCS',
          costPrice: dto.costPrice || 0,
          sellingPrice: dto.sellingPrice,
          mrp: dto.mrp,
          taxRate: dto.taxRate || 0,
          hsn: dto.hsn,
          isBatchTracked: dto.isBatchTracked || false,
          isWeightBased: dto.isWeightBased || false,
          minStockAlert: dto.minStockAlert || 5,
          currentStock: dto.initialStock || 0
        }
      });

      if (dto.initialStock && dto.initialStock > 0) {
        await tx.stockLedger.create({
          data: {
            organizationId,
            branchId,
            productId: product.id,
            eventType: 'PURCHASE_RECEIPT',
            quantityChange: dto.initialStock,
            balanceAfter: dto.initialStock,
            unitCost: dto.costPrice || 0,
            notes: 'Initial opening stock',
            createdById: userId
          }
        });
      }

      await this.auditService.log({
        organizationId,
        branchId,
        userId,
        userName,
        action: 'PRODUCT_CREATE',
        entityType: 'PRODUCT',
        entityId: product.id,
        details: { name: product.name, sku: product.sku }
      });

      return product;
    });
  }

  async update(organizationId: string, id: string, userId: string, userName: string, data: any) {
    const product = await this.findOne(organizationId, id);
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'PRODUCT_UPDATE',
      entityType: 'PRODUCT',
      entityId: product.id
    });

    return updated;
  }

  async getStockLedger(organizationId: string, branchId?: string, productId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (productId) where.productId = productId;

    return this.prisma.stockLedger.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
