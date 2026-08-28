import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StockEventType } from '@aescion/shared-types';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class SupplierService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async getSuppliers(organizationId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { organizationId },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return suppliers.map(s => {
      let pendingPayables = 0;
      for (const po of s.purchaseOrders) {
        if (po.status !== 'CANCELLED') {
          pendingPayables += po.grandTotal;
        }
      }
      return {
        ...s,
        pendingPayables: Math.round(pendingPayables * 100) / 100
      };
    });
  }

  async createSupplier(organizationId: string, userId: string, userName: string, data: any) {
    const supplier = await this.prisma.supplier.create({
      data: {
        organizationId,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        address: data.address
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      details: { name: supplier.name }
    });

    this.eventsGateway.emitSupplierUpdated(organizationId, supplier);
    return supplier;
  }

  async getPurchaseOrders(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    return this.prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createPurchaseOrder(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId } });
    const poNumber = formatDocumentNumber('PO', count + 1);

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const items = (data.items || []).map((it: any) => {
      const gross = it.quantityOrdered * it.unitCost;
      const tax = (gross * (it.taxRate || 0)) / 100;
      const total = gross + tax;

      subtotal += gross;
      taxTotal += tax;
      grandTotal += total;

      return {
        productId: it.productId,
        name: it.name,
        quantityOrdered: it.quantityOrdered,
        quantityReceived: 0,
        unitCost: it.unitCost,
        taxRate: it.taxRate || 0,
        total: Math.round(total * 100) / 100
      };
    });

    const po = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        branchId,
        poNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        status: 'APPROVED',
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        createdById: userId,
        items: { create: items }
      },
      include: { items: true, supplier: true }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      details: { poNumber, grandTotal }
    });

    this.eventsGateway.emitPulseUpdate(organizationId, branchId, { trigger: 'PURCHASE_ORDER_CREATED', poId: po.id });
    return po;
  }

  async receiveGoods(organizationId: string, poId: string, branchId: string, userId: string, userName: string, receivedItems: Array<{ productId: string; quantity: number }>) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
      include: { items: true }
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const result = await this.prisma.$transaction(async (tx) => {
      for (const rec of receivedItems) {
        const item = po.items.find((i) => i.productId === rec.productId);
        if (item) {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { quantityReceived: item.quantityReceived + rec.quantity }
          });

          // Increase stock and write StockLedger
          const product = await tx.product.findUnique({ where: { id: rec.productId } });
          if (product) {
            const newStock = product.currentStock + rec.quantity;
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: newStock }
            });

            await tx.stockLedger.create({
              data: {
                organizationId,
                branchId,
                productId: product.id,
                eventType: StockEventType.PURCHASE_RECEIPT,
                quantityChange: rec.quantity,
                balanceAfter: newStock,
                referenceType: 'GRN',
                referenceId: po.id,
                unitCost: item.unitCost,
                notes: `GRN for ${po.poNumber}`,
                createdById: userId
              }
            });
          }
        }
      }

      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'COMPLETED' },
        include: { items: true }
      });

      await this.auditService.log({
        organizationId,
        branchId,
        userId,
        userName,
        action: 'GOODS_RECEIVED_NOTE',
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        details: { poNumber: po.poNumber }
      });

      return updatedPo;
    });

    this.eventsGateway.emitInventoryUpdate(organizationId, branchId, { poId: po.id, trigger: 'GRN_RECEIVED' });
    this.eventsGateway.emitPulseUpdate(organizationId, branchId, { trigger: 'GRN_RECEIVED' });
    return result;
  }
}
