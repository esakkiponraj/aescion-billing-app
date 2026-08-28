import { Module } from '@nestjs/common';
import { PaymentService } from './payments.service';
import { PaymentController } from './payments.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService, AuditService],
  exports: [PaymentService]
})
export class PaymentModule {}
