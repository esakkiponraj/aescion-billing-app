import { Module } from '@nestjs/common';
import { InvoiceService } from './invoices.service';
import { InvoiceController } from './invoices.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, PrismaService, AuditService],
  exports: [InvoiceService]
})
export class InvoiceModule {}
