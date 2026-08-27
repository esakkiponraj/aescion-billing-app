import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*'
  }
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBranchRoom')
  handleJoinBranch(client: Socket, payload: { organizationId: string; branchId: string }) {
    if (payload.organizationId && payload.branchId) {
      const room = `org_${payload.organizationId}_branch_${payload.branchId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { status: 'joined', room };
    }
  }

  emitKOTUpdate(organizationId: string, branchId: string, kot: any) {
    const room = `org_${organizationId}_branch_${branchId}`;
    if (this.server) {
      this.server.to(room).emit('kot_updated', kot);
      this.server.emit('kot_updated', kot); // Broadcast to all connected clients
    }
  }

  emitShiftUpdate(organizationId: string, branchId: string, shift: any) {
    const room = `org_${organizationId}_branch_${branchId}`;
    if (this.server) {
      this.server.to(room).emit('shift_updated', shift);
    }
  }

  emitPulseUpdate(organizationId: string, branchId: string, data: any) {
    const room = `org_${organizationId}_branch_${branchId}`;
    if (this.server) {
      this.server.to(room).emit('pulse_updated', data);
    }
  }
}
