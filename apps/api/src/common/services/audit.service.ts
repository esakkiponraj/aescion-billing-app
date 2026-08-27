import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    organizationId: string;
    branchId?: string;
    userId?: string;
    userName: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          userId: params.userId,
          userName: params.userName,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details || {},
          ipAddress: params.ipAddress
        }
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}
