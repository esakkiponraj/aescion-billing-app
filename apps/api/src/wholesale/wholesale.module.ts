import { Module } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { WholesaleController } from './wholesale.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [WholesaleController],
  providers: [WholesaleService, PrismaService, AuditService],
  exports: [WholesaleService]
})
export class WholesaleModule {}
