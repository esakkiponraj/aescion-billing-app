import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class PharmacyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async getMedicines(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }
    return this.prisma.medicineMaster.findMany({
      where,
      include: { batches: true },
      orderBy: { name: 'asc' }
    });
  }

  async getBatches(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    return this.prisma.medicineBatch.findMany({
      where,
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' }
    });
  }

  async getExpiryAlerts(organizationId: string, branchId?: string) {
    const now = new Date();
    const d30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;

    const batches = await this.prisma.medicineBatch.findMany({
      where,
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' }
    });

    const expired: any[] = [];
    const within30Days: any[] = [];
    const within60Days: any[] = [];
    const within90Days: any[] = [];

    for (const b of batches) {
      const expTime = new Date(b.expiryDate).getTime();
      const daysToExpiry = Math.ceil((expTime - now.getTime()) / (24 * 60 * 60 * 1000));
      const formatted = { ...b, daysToExpiry };

      if (expTime < now.getTime() || b.isExpired) {
        expired.push(formatted);
      } else if (expTime <= d30.getTime()) {
        within30Days.push(formatted);
      } else if (expTime <= d60.getTime()) {
        within60Days.push(formatted);
      } else if (expTime <= d90.getTime()) {
        within90Days.push(formatted);
      }
    }

    return {
      expired,
      within30Days,
      within60Days,
      within90Days,
      counts: {
        expired: expired.length,
        within30Days: within30Days.length,
        within60Days: within60Days.length,
        within90Days: within90Days.length
      }
    };
  }

  async createMedicine(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const medicine = await tx.medicineMaster.create({
        data: {
          organizationId,
          name: data.name,
          genericName: data.genericName,
          manufacturer: data.manufacturer,
          dosageForm: data.dosageForm || 'Tablet',
          hsn: data.hsn || '3004',
          taxRate: data.taxRate || 12,
          mrp: data.mrp || 0,
          currentStock: data.initialQuantity || 0
        }
      });

      if (data.batchNumber && data.expiryDate) {
        await tx.medicineBatch.create({
          data: {
            organizationId,
            branchId,
            medicineId: medicine.id,
            medicineName: medicine.name,
            batchNumber: data.batchNumber,
            manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : new Date(),
            expiryDate: new Date(data.expiryDate),
            purchaseRate: data.purchaseRate || 0,
            sellingRate: data.sellingRate || medicine.mrp,
            mrp: medicine.mrp,
            quantityRemaining: data.initialQuantity || 0,
            isExpired: new Date(data.expiryDate).getTime() < Date.now()
          }
        });
      }

      await this.auditService.log({
        organizationId,
        branchId,
        userId,
        userName,
        action: 'MEDICINE_CREATED',
        entityType: 'MEDICINE',
        entityId: medicine.id,
        details: { name: medicine.name, genericName: medicine.genericName }
      });

      return medicine;
    });
  }
}
