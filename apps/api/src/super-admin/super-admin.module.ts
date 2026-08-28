import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [RealtimeModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, PrismaService, AuditService],
  exports: [SuperAdminService]
})
export class SuperAdminModule {}
