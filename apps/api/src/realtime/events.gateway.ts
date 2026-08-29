import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PresenceService, ClientSessionInfo } from './presence.service';
import { PrismaService } from '../common/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(
    private presenceService: PresenceService,
    private prisma: PrismaService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const { disconnectedSession, isUserCompletelyOffline, snapshot } = this.presenceService.removeSession(client.id);

    if (disconnectedSession) {
      // Notify Super Admin of real-time presence change
      if (this.server) {
        this.server.to('platform_super_admin').emit('presence_updated', {
          trigger: 'DISCONNECT',
          userId: disconnectedSession.userId,
          companyName: disconnectedSession.companyName,
          platform: disconnectedSession.platform,
          isUserCompletelyOffline,
          onlineOwnersCount: snapshot.onlineOwnersCount,
          activeSessionsCount: snapshot.activeSessionsCount,
          onlineOwners: this.presenceService.getOnlineOwners()
        });

        this.server.to('platform_super_admin').emit('platform_pulse_updated', {
          trigger: 'PRESENCE_DISCONNECT',
          timestamp: new Date().toISOString(),
          onlineOwnersCount: snapshot.onlineOwnersCount,
          activeSessionsCount: snapshot.activeSessionsCount
        });

        // Notify specific tenant
        this.server.to(`org_${disconnectedSession.organizationId}`).emit('tenant_presence_updated', {
          userId: disconnectedSession.userId,
          status: isUserCompletelyOffline ? 'OFFLINE' : 'ONLINE',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  @SubscribeMessage('identify_presence')
  async handleIdentifyPresence(
    client: Socket,
    payload: {
      userId: string;
      organizationId: string;
      branchId?: string;
      platform?: 'desktop' | 'mobile';
      roleType?: string;
    }
  ) {
    if (!payload?.userId || !payload?.organizationId) {
      return { status: 'rejected', reason: 'Missing userId or organizationId' };
    }

    try {
      // Authoritatively verify user, organization, and membership in PostgreSQL
      const membership = await this.prisma.membership.findFirst({
        where: {
          userId: payload.userId,
          organizationId: payload.organizationId,
          isActive: true
        },
        include: {
          user: true,
          organization: true,
          branch: true,
          role: true
        }
      });

      if (!membership) {
        return { status: 'rejected', reason: 'Invalid or inactive membership' };
      }

      const roleType = membership.role?.roleType || payload.roleType || 'STAFF';
      const platform: 'desktop' | 'mobile' = payload.platform === 'mobile' ? 'mobile' : 'desktop';

      const sessionInfo: ClientSessionInfo = {
        socketId: client.id,
        userId: membership.user.id,
        userName: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
        userEmail: membership.user.email,
        organizationId: membership.organization.id,
        companyName: membership.organization.name,
        businessType: membership.organization.businessType,
        roleType,
        branchId: membership.branch?.id || payload.branchId,
        branchName: membership.branch?.name || 'Main Branch',
        platform,
        connectedAt: new Date(),
        lastSeen: new Date()
      };

      const snapshot = this.presenceService.registerSession(sessionInfo);

      // Auto-join room for this tenant
      const orgRoom = `org_${sessionInfo.organizationId}`;
      client.join(orgRoom);
      if (sessionInfo.branchId && sessionInfo.branchId !== 'ALL') {
        client.join(`org_${sessionInfo.organizationId}_branch_${sessionInfo.branchId}`);
      }

      // If Super Admin role, auto-join platform room
      if (roleType === 'SUPER_ADMIN') {
        client.join('platform_super_admin');
      }

      // Broadcast presence update to Super Admin
      if (this.server) {
        this.server.to('platform_super_admin').emit('presence_updated', {
          trigger: 'CONNECT',
          userId: sessionInfo.userId,
          userName: sessionInfo.userName,
          companyName: sessionInfo.companyName,
          platform: sessionInfo.platform,
          roleType: sessionInfo.roleType,
          onlineOwnersCount: snapshot.onlineOwnersCount,
          activeSessionsCount: snapshot.activeSessionsCount,
          onlineOwners: this.presenceService.getOnlineOwners()
        });

        this.server.to('platform_super_admin').emit('platform_pulse_updated', {
          trigger: 'PRESENCE_CONNECT',
          timestamp: new Date().toISOString(),
          onlineOwnersCount: snapshot.onlineOwnersCount,
          activeSessionsCount: snapshot.activeSessionsCount
        });

        this.server.to(orgRoom).emit('tenant_presence_updated', {
          userId: sessionInfo.userId,
          status: 'ONLINE',
          platform: sessionInfo.platform,
          timestamp: new Date().toISOString()
        });
      }

      return {
        status: 'identified',
        roleType,
        platform,
        onlineOwnersCount: snapshot.onlineOwnersCount,
        activeSessionsCount: snapshot.activeSessionsCount
      };
    } catch (err: any) {
      this.logger.error(`Error identifying presence: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(client: Socket) {
    this.presenceService.touchHeartbeat(client.id);
    return { status: 'pong', timestamp: new Date().toISOString() };
  }

  @SubscribeMessage('joinBranchRoom')
  handleJoinBranch(client: Socket, payload: { organizationId: string; branchId?: string }) {
    return this.subscribeClientToRooms(client, payload);
  }

  @SubscribeMessage('join_branch')
  handleJoinBranchAlias(client: Socket, payload: { organizationId: string; branchId?: string }) {
    return this.subscribeClientToRooms(client, payload);
  }

  @SubscribeMessage('join_org')
  handleJoinOrg(client: Socket, payload: { organizationId: string; branchId?: string }) {
    return this.subscribeClientToRooms(client, payload);
  }

  @SubscribeMessage('join_super_admin')
  handleJoinSuperAdmin(client: Socket) {
    client.join('platform_super_admin');
    this.logger.log(`Super Admin client ${client.id} joined room: platform_super_admin`);
    return {
      status: 'joined',
      room: 'platform_super_admin',
      onlineOwners: this.presenceService.getOnlineOwners(),
      snapshot: this.presenceService.getPresenceSnapshot()
    };
  }

  @SubscribeMessage('join_platform')
  handleJoinPlatform(client: Socket) {
    client.join('platform_super_admin');
    this.logger.log(`Platform client ${client.id} joined room: platform_super_admin`);
    return {
      status: 'joined',
      room: 'platform_super_admin',
      onlineOwners: this.presenceService.getOnlineOwners(),
      snapshot: this.presenceService.getPresenceSnapshot()
    };
  }

  private subscribeClientToRooms(client: Socket, payload: { organizationId: string; branchId?: string }) {
    if (payload?.organizationId) {
      const orgRoom = `org_${payload.organizationId}`;
      client.join(orgRoom);

      if (payload.branchId && payload.branchId !== 'ALL') {
        const branchRoom = `org_${payload.organizationId}_branch_${payload.branchId}`;
        client.join(branchRoom);
        this.logger.log(`Client ${client.id} joined rooms: [${orgRoom}, ${branchRoom}]`);
        return { status: 'joined', orgRoom, branchRoom };
      }
      this.logger.log(`Client ${client.id} joined room: [${orgRoom}]`);
      return { status: 'joined', orgRoom };
    }
  }

  emitInvoiceCreated(organizationId: string, branchId: string, invoice: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('invoice_created', invoice);
    this.server.to(orgRoom).emit('invoice_created', invoice);
    this.server.to('platform_super_admin').emit('platform_invoice_created', { organizationId, branchId, invoice });
    this.server.to('platform_super_admin').emit('invoice_created', { organizationId, branchId, invoice });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'INVOICE_CREATED', invoiceId: invoice?.id });
  }

  emitProductUpdated(organizationId: string, branchId?: string, product?: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('product_updated', product || {});
    if (branchId && branchId !== 'ALL') {
      const branchRoom = `org_${organizationId}_branch_${branchId}`;
      this.server.to(branchRoom).emit('product_updated', product || {});
    }
    this.server.to('platform_super_admin').emit('platform_product_updated', { organizationId, branchId, product });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'PRODUCT_UPDATED' });
  }

  emitCustomerUpdated(organizationId: string, customer: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('customer_updated', customer);
    this.server.to('platform_super_admin').emit('platform_customer_updated', { organizationId, customer });
    this.emitPulseUpdate(organizationId, undefined, { trigger: 'CUSTOMER_UPDATED' });
  }

  emitQuotationUpdated(organizationId: string, branchId: string, quotation: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('quotation_updated', quotation);
    this.server.to(orgRoom).emit('quotation_updated', quotation);
    this.server.to('platform_super_admin').emit('platform_quotation_updated', { organizationId, branchId, quotation });
    this.server.to('platform_super_admin').emit('quotation_updated', { organizationId, branchId, quotation });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'QUOTATION_UPDATED', quotationId: quotation?.id });
  }

  emitPaymentCreated(organizationId: string, branchId: string, payment: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('payment_created', payment);
    this.server.to(orgRoom).emit('payment_created', payment);
    this.server.to('platform_super_admin').emit('platform_payment_created', { organizationId, branchId, payment });
    this.server.to('platform_super_admin').emit('payment_created', { organizationId, branchId, payment });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'PAYMENT_CREATED', paymentId: payment?.id });
  }

  emitWholesaleOrderUpdated(organizationId: string, branchId: string, order: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('wholesale_order_updated', order);
    this.server.to(orgRoom).emit('wholesale_order_updated', order);
    this.server.to('platform_super_admin').emit('platform_wholesale_order_updated', { organizationId, branchId, order });
    this.server.to('platform_super_admin').emit('wholesale_order_updated', { organizationId, branchId, order });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'WHOLESALE_ORDER_UPDATED', orderId: order?.id });
  }

  emitSupplierUpdated(organizationId: string, supplier: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('supplier_updated', supplier);
    this.server.to('platform_super_admin').emit('platform_supplier_updated', { organizationId, supplier });
  }

  emitAuditLogCreated(organizationId: string, auditLog: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('audit_log_created', auditLog);
    this.server.to('platform_super_admin').emit('platform_activity_created', { organizationId, auditLog });
  }

  emitInventoryUpdate(organizationId: string, branchId: string, data: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('inventory_updated', data);
    this.server.to(orgRoom).emit('inventory_updated', data);
    this.server.to('platform_super_admin').emit('platform_inventory_updated', { organizationId, branchId, data });
  }

  emitShiftUpdate(organizationId: string, branchId: string, data: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    const orgRoom = `org_${organizationId}`;
    this.server.to(branchRoom).emit('shift_updated', data);
    this.server.to(orgRoom).emit('shift_updated', data);
    this.server.to('platform_super_admin').emit('platform_shift_updated', { organizationId, branchId, data });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'SHIFT_UPDATED' });
  }

  emitPulseUpdate(organizationId: string, branchId?: string, extraData?: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    const payload = { timestamp: new Date().toISOString(), organizationId, ...extraData };
    this.server.to(orgRoom).emit('pulse_updated', payload);
    if (branchId && branchId !== 'ALL') {
      const branchRoom = `org_${organizationId}_branch_${branchId}`;
      this.server.to(branchRoom).emit('pulse_updated', payload);
    }
    this.server.to('platform_super_admin').emit('platform_pulse_updated', payload);
    this.server.to('platform_super_admin').emit('pulse_updated', payload);
  }

  emitBranchUpdated(organizationId: string, branch: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('branch_updated', branch);
    this.server.to('platform_super_admin').emit('platform_branch_updated', { organizationId, branch });
    this.server.to('platform_super_admin').emit('branch_updated', { organizationId, branch });
    this.emitPulseUpdate(organizationId, undefined, { trigger: 'BRANCH_UPDATED' });
  }

  emitTeamUpdated(organizationId: string, member: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('team_updated', member);
    this.server.to('platform_super_admin').emit('platform_team_updated', { organizationId, member });
    this.server.to('platform_super_admin').emit('team_updated', { organizationId, member });
    this.emitPulseUpdate(organizationId, undefined, { trigger: 'TEAM_UPDATED' });
  }

  emitTableUpdate(organizationId: string, branchId?: string, data?: any) {
    if (!this.server || !organizationId) return;
    if (branchId && branchId !== 'ALL') {
      const branchRoom = `org_${organizationId}_branch_${branchId}`;
      this.server.to(branchRoom).emit('table_updated', data);
    } else {
      const orgRoom = `org_${organizationId}`;
      this.server.to(orgRoom).emit('table_updated', data);
    }
    this.server.to('platform_super_admin').emit('platform_table_updated', { organizationId, branchId, data });
    this.server.to('platform_super_admin').emit('table_updated', { organizationId, branchId, data });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'TABLE_UPDATED' });
  }

  emitKOTUpdate(organizationId: string, branchId: string, data: any) {
    if (!this.server || !organizationId) return;
    if (branchId && branchId !== 'ALL') {
      const branchRoom = `org_${organizationId}_branch_${branchId}`;
      this.server.to(branchRoom).emit('kot_updated', data);
    } else {
      const orgRoom = `org_${organizationId}`;
      this.server.to(orgRoom).emit('kot_updated', data);
    }
    this.server.to('platform_super_admin').emit('platform_kot_updated', { organizationId, branchId, data });
    this.server.to('platform_super_admin').emit('kot_updated', { organizationId, branchId, data });
    this.emitPulseUpdate(organizationId, branchId, { trigger: 'KOT_UPDATED' });
  }

  emitReservationUpdate(organizationId: string, branchId?: string, data?: any) {
    if (!this.server || !organizationId) return;
    const orgRoom = `org_${organizationId}`;
    this.server.to(orgRoom).emit('reservation_updated', data);
    if (branchId && branchId !== 'ALL') {
      const branchRoom = `org_${organizationId}_branch_${branchId}`;
      this.server.to(branchRoom).emit('reservation_updated', data);
    }
    this.server.to('platform_super_admin').emit('platform_reservation_updated', { organizationId, branchId, data });
  }

  emitJobCardUpdate(organizationId: string, branchId: string, data: any) {
    if (!this.server || !organizationId) return;
    const branchRoom = `org_${organizationId}_branch_${branchId}`;
    this.server.to(branchRoom).emit('jobcard_updated', data);
  }
}
