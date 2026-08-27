import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { KitchenStatus, RestaurantTableStatus } from '@aescion/shared-types';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async getTables(organizationId: string, branchId?: string) {
    const where: any = { organizationId, isActive: true };
    if (branchId) where.branchId = branchId;
    return this.prisma.restaurantTable.findMany({
      where,
      orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }]
    });
  }

  async getKOTs(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.kitchenOrderTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async sendKOT(organizationId: string, branchId: string, userId: string, userName: string, data: {
    tableId: string;
    items: Array<{ menuItemId: string; name: string; quantity: number; modifiers?: string[]; notes?: string }>;
  }) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: data.tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    const count = await this.prisma.kitchenOrderTicket.count({ where: { organizationId } });
    const kotNumber = formatDocumentNumber('KOT', count + 1);

    const itemsWithStatus = data.items.map((it) => ({
      ...it,
      status: KitchenStatus.NEW
    }));

    const kot = await this.prisma.kitchenOrderTicket.create({
      data: {
        organizationId,
        branchId,
        kotNumber,
        tableNumber: table.tableNumber,
        orderId: table.activeOrderId || `ORD-${Date.now().toString(36).toUpperCase()}`,
        items: itemsWithStatus,
        waiterName: userName,
        status: KitchenStatus.NEW
      }
    });

    // Update table status to KOT_SENT
    await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: RestaurantTableStatus.KOT_SENT,
        activeOrderId: kot.orderId
      }
    });

    // Emit live WebSocket event for kitchen screen
    this.eventsGateway.emitKOTUpdate(organizationId, branchId, kot);

    return kot;
  }

  async updateKOTStatus(organizationId: string, kotId: string, status: KitchenStatus) {
    const kot = await this.prisma.kitchenOrderTicket.findFirst({
      where: { id: kotId, organizationId }
    });
    if (!kot) throw new NotFoundException('KOT not found');

    const updated = await this.prisma.kitchenOrderTicket.update({
      where: { id: kot.id },
      data: { status }
    });

    // If KOT is ready, update table status
    if (status === KitchenStatus.READY) {
      await this.prisma.restaurantTable.updateMany({
        where: { organizationId, tableNumber: kot.tableNumber },
        data: { status: RestaurantTableStatus.READY }
      });
    }

    this.eventsGateway.emitKOTUpdate(organizationId, kot.branchId, updated);
    return updated;
  }

  async closeTable(organizationId: string, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    return this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: RestaurantTableStatus.AVAILABLE,
        activeOrderId: null
      }
    });
  }
}
