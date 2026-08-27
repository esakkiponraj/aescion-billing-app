import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [RestaurantController],
  providers: [RestaurantService, PrismaService, AuditService],
  exports: [RestaurantService]
})
export class RestaurantModule {}
