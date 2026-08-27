import { Module } from '@nestjs/common';
import { BranchService } from './branches.service';
import { BranchController } from './branches.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [BranchController],
  providers: [BranchService, PrismaService, AuditService],
  exports: [BranchService]
})
export class BranchModule {}
