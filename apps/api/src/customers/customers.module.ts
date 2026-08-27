import { Module } from '@nestjs/common';
import { CustomerService } from './customers.service';
import { CustomerController } from './customers.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, PrismaService, AuditService],
  exports: [CustomerService]
})
export class CustomerModule {}
