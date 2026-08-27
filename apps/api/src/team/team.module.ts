import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [TeamController],
  providers: [TeamService, PrismaService, AuditService],
  exports: [TeamService]
})
export class TeamModule {}
