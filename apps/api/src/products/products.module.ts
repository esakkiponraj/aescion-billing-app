import { Module } from '@nestjs/common';
import { ProductService } from './products.service';
import { ProductController } from './products.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, PrismaService, AuditService],
  exports: [ProductService]
})
export class ProductModule {}
