import { Module } from '@nestjs/common';
import { QuotationService } from './quotations.service';
import { QuotationController } from './quotations.controller';
import { PrismaService } from '../common/prisma.service';
import { InvoiceModule } from '../invoices/invoices.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [InvoiceModule],
  controllers: [QuotationController],
  providers: [QuotationService, PrismaService, AuditService]
})
export class QuotationModule {}
