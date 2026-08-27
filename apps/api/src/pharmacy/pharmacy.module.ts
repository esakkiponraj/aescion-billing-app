import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [PharmacyController],
  providers: [PharmacyService, PrismaService, AuditService],
  exports: [PharmacyService]
})
export class PharmacyModule {}
