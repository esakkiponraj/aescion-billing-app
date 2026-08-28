import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { PresenceService } from './presence.service';
import { PrismaService } from '../common/prisma.service';

@Global()
@Module({
  providers: [EventsGateway, PresenceService, PrismaService],
  exports: [EventsGateway, PresenceService]
})
export class RealtimeModule {}
