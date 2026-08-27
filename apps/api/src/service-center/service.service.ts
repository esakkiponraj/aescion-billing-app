import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ServiceJobStatus } from '@aescion/shared-types';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class ServiceJobService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async findAll(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.serviceJobCard.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(organizationId: string, id: string) {
    const job = await this.prisma.serviceJobCard.findFirst({
      where: { id, organizationId },
      include: { customer: true }
    });
    if (!job) throw new NotFoundException('Service Job Card not found');
    return job;
  }

  async create(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    const count = await this.prisma.serviceJobCard.count({ where: { organizationId } });
    const jobNumber = formatDocumentNumber('JOB', count + 1);

    let customerId = data.customerId;
    if (!customerId) {
      const cust = await this.prisma.customer.create({
        data: {
          organizationId,
          name: data.customerName || 'Service Customer',
          phone: data.customerPhone || '9876543210'
        }
      });
      customerId = cust.id;
    }

    const job = await this.prisma.serviceJobCard.create({
      data: {
        organizationId,
        branchId,
        jobNumber,
        customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        assetDetails: data.assetDetails || {},
        complaint: data.complaint,
        inspectionNotes: data.inspectionNotes,
        status: ServiceJobStatus.RECEIVED,
        technicianId: data.technicianId,
        technicianName: data.technicianName,
        estimatedAmount: data.estimatedAmount || 0,
        advancePaid: data.advancePaid || 0,
        partsUsed: data.partsUsed || [],
        labourCharges: data.labourCharges || 0
      }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName,
      action: 'SERVICE_JOB_CREATED',
      entityType: 'SERVICE_JOB',
      entityId: job.id,
      details: { jobNumber, complaint: data.complaint }
    });

    return job;
  }

  async updateStatus(organizationId: string, id: string, userId: string, userName: string, status: ServiceJobStatus, notes?: string) {
    const job = await this.findOne(organizationId, id);
    const updated = await this.prisma.serviceJobCard.update({
      where: { id: job.id },
      data: {
        status,
        inspectionNotes: notes ? `${job.inspectionNotes ? job.inspectionNotes + ' | ' : ''}${notes}` : job.inspectionNotes,
        deliveryDate: status === ServiceJobStatus.DELIVERED ? new Date() : job.deliveryDate
      }
    });

    await this.auditService.log({
      organizationId,
      branchId: job.branchId,
      userId,
      userName,
      action: 'SERVICE_JOB_STATUS_UPDATE',
      entityType: 'SERVICE_JOB',
      entityId: job.id,
      details: { fromStatus: job.status, toStatus: status }
    });

    return updated;
  }

  async updatePartsAndLabour(organizationId: string, id: string, userId: string, userName: string, data: { partsUsed: any[]; labourCharges: number }) {
    const job = await this.findOne(organizationId, id);
    const updated = await this.prisma.serviceJobCard.update({
      where: { id: job.id },
      data: {
        partsUsed: data.partsUsed || [],
        labourCharges: data.labourCharges || 0
      }
    });

    return updated;
  }
}
