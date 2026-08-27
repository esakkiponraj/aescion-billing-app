import { Module } from '@nestjs/common';
import { ServiceJobService } from './service.service';
import { ServiceJobController } from './service.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [ServiceJobController],
  providers: [ServiceJobService, PrismaService, AuditService],
  exports: [ServiceJobService]
})
export class ServiceJobModule {}
