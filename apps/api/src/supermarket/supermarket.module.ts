import { Module } from '@nestjs/common';
import { SupermarketService } from './supermarket.service';
import { SupermarketController } from './supermarket.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [SupermarketController],
  providers: [SupermarketService, PrismaService],
  exports: [SupermarketService]
})
export class SupermarketModule {}
