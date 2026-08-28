import { Module } from '@nestjs/common';
import { SupplierService } from './suppliers.service';
import { SupplierController } from './suppliers.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [SupplierController],
  providers: [SupplierService, PrismaService, AuditService],
  exports: [SupplierService]
})
export class SupplierModule {}
