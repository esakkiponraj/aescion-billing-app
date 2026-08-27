import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SupermarketService {
  constructor(private prisma: PrismaService) {}

  async getWeightScaleProduct(organizationId: string, itemCode: string) {
    return this.prisma.product.findFirst({
      where: {
        organizationId,
        isWeightBased: true,
        OR: [{ barcode: itemCode }, { sku: itemCode }]
      }
    });
  }

  async getRegistersStatus(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;

    const registers = await this.prisma.register.findMany({
      where,
      include: {
        cashierShifts: {
          where: { shiftStatus: 'OPEN' },
          take: 1
        }
      }
    });

    return registers.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      isActive: r.isActive,
      isOccupied: r.cashierShifts.length > 0,
      activeCashier: r.cashierShifts[0]?.cashierName || null,
      shiftOpenedAt: r.cashierShifts[0]?.openedAt || null
    }));
  }
}
