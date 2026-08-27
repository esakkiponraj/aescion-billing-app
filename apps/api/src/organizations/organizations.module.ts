import { Module } from '@nestjs/common';
import { OrganizationService } from './organizations.service';
import { OrganizationController } from './organizations.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService, PrismaService, AuditService],
  exports: [OrganizationService]
})
export class OrganizationModule {}
