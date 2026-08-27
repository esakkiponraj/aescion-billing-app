import { Module } from '@nestjs/common';
import { ShiftService } from './shifts.service';
import { ShiftController } from './shifts.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [ShiftController],
  providers: [ShiftService, PrismaService, AuditService],
  exports: [ShiftService]
})
export class ShiftModule {}
