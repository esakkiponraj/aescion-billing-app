import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PrismaService } from '../common/prisma.service';
import { InvoiceModule } from '../invoices/invoices.module';
import { PaymentModule } from '../payments/payments.module';

@Module({
  imports: [InvoiceModule, PaymentModule],
  controllers: [SyncController],
  providers: [SyncService, PrismaService],
  exports: [SyncService]
})
export class SyncModule {}
