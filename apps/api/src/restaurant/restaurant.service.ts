import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { KitchenStatus, RestaurantTableStatus, InvoiceStatus, PaymentMethod, PaymentStatus, TaxMode } from '@aescion/shared-types';
import { formatDocumentNumber, calculateLineTax } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';
import { InvoiceService } from '../invoices/invoices.service';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
    private invoicesService: InvoiceService
  ) {}

  // ==========================================
  // 1. TABLE MANAGEMENT & CRUD
  // ==========================================

  async getTables(organizationId: string, branchId?: string, section?: string) {
    const where: any = { organizationId, isActive: true };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (section && section !== 'ALL') where.section = section;

    return this.prisma.restaurantTable.findMany({
      where,
      orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }]
    });
  }

  async createTable(
    organizationId: string,
    branchId: string,
    userId: string,
    data: { tableNumber: string; capacity?: number; section?: string }
  ) {
    if (!data.tableNumber?.trim()) {
      throw new BadRequestException('Table number is required');
    }

    const existing = await this.prisma.restaurantTable.findFirst({
      where: {
        organizationId,
        branchId,
        tableNumber: data.tableNumber.trim(),
        isActive: true
      }
    });

    if (existing) {
      throw new BadRequestException(`Table ${data.tableNumber} already exists in this branch`);
    }

    const table = await this.prisma.restaurantTable.create({
      data: {
        organizationId,
        branchId,
        tableNumber: data.tableNumber.trim(),
        capacity: Number(data.capacity) || 4,
        section: data.section?.trim() || 'Ground Floor',
        status: RestaurantTableStatus.AVAILABLE,
        isActive: true
      }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_TABLE_CREATED',
      entityType: 'RestaurantTable',
      entityId: table.id,
      details: { tableId: table.id, tableNumber: table.tableNumber, section: table.section, capacity: table.capacity }
    });

    this.eventsGateway.emitTableUpdate(organizationId, branchId, table);
    return table;
  }

  async updateTable(
    organizationId: string,
    tableId: string,
    userId: string,
    data: { tableNumber?: string; capacity?: number; section?: string; isActive?: boolean }
  ) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    const updateData: any = {};
    if (data.tableNumber !== undefined) updateData.tableNumber = data.tableNumber.trim();
    if (data.capacity !== undefined) updateData.capacity = Number(data.capacity);
    if (data.section !== undefined) updateData.section = data.section.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: updateData
    });

    await this.auditService.log({
      organizationId,
      branchId: updated.branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_TABLE_UPDATED',
      entityType: 'RestaurantTable',
      entityId: updated.id,
      details: { tableId: updated.id, changes: updateData }
    });

    this.eventsGateway.emitTableUpdate(organizationId, updated.branchId, updated);
    return updated;
  }

  async deleteTable(organizationId: string, tableId: string, userId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    if (table.status !== RestaurantTableStatus.AVAILABLE && table.status !== 'PAID') {
      throw new BadRequestException(`Cannot delete table while active order is in progress (${table.status})`);
    }

    const deactivated = await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: { isActive: false }
    });

    await this.auditService.log({
      organizationId,
      branchId: deactivated.branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_TABLE_DELETED',
      entityType: 'RestaurantTable',
      entityId: deactivated.id,
      details: { tableId: deactivated.id, tableNumber: deactivated.tableNumber }
    });

    this.eventsGateway.emitTableUpdate(organizationId, deactivated.branchId, deactivated);
    return { success: true, tableId };
  }

  async occupyTable(organizationId: string, tableId: string, guestCount?: number, waiterName?: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    const activeOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const updated = await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: RestaurantTableStatus.OCCUPIED,
        activeOrderId
      }
    });

    this.eventsGateway.emitTableUpdate(organizationId, updated.branchId, updated);
    return updated;
  }

  async transferTable(organizationId: string, branchId: string, userId: string, fromTableId: string, toTableId: string) {
    const fromTable = await this.prisma.restaurantTable.findFirst({
      where: { id: fromTableId, organizationId }
    });
    if (!fromTable) throw new NotFoundException('Source table not found');

    const toTable = await this.prisma.restaurantTable.findFirst({
      where: { id: toTableId, organizationId }
    });
    if (!toTable) throw new NotFoundException('Target table not found');

    if (toTable.status !== RestaurantTableStatus.AVAILABLE) {
      throw new BadRequestException(`Target table ${toTable.tableNumber} is not available (${toTable.status})`);
    }

    const activeOrderId = fromTable.activeOrderId;
    if (!activeOrderId) {
      throw new BadRequestException(`Source table ${fromTable.tableNumber} has no active order to transfer`);
    }

    // Update all active KOTs to point to target table number
    await this.prisma.kitchenOrderTicket.updateMany({
      where: { organizationId, orderId: activeOrderId },
      data: { tableNumber: toTable.tableNumber }
    });

    // Move order to target table
    const [updatedFrom, updatedTo] = await this.prisma.$transaction([
      this.prisma.restaurantTable.update({
        where: { id: fromTable.id },
        data: { status: RestaurantTableStatus.AVAILABLE, activeOrderId: null }
      }),
      this.prisma.restaurantTable.update({
        where: { id: toTable.id },
        data: { status: fromTable.status, activeOrderId }
      })
    ]);

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_TABLE_TRANSFERRED',
      entityType: 'RestaurantTable',
      entityId: toTable.id,
      details: { fromTable: fromTable.tableNumber, toTable: toTable.tableNumber, orderId: activeOrderId }
    });

    this.eventsGateway.emitTableUpdate(organizationId, branchId, updatedFrom);
    this.eventsGateway.emitTableUpdate(organizationId, branchId, updatedTo);

    return { success: true, fromTable: updatedFrom, toTable: updatedTo };
  }

  async closeTable(organizationId: string, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    const updated = await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: RestaurantTableStatus.AVAILABLE,
        activeOrderId: null
      }
    });

    this.eventsGateway.emitTableUpdate(organizationId, updated.branchId, updated);
    return updated;
  }

  // ==========================================
  // 2. KOT & KITCHEN DISPLAY OPERATIONS
  // ==========================================

  async getKOTs(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (status && status !== 'ALL') where.status = status;

    return this.prisma.kitchenOrderTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async sendKOT(
    organizationId: string,
    branchId: string,
    userId: string,
    userName: string,
    data: {
      tableId?: string;
      tableNumber?: string;
      orderType?: 'DINE_IN' | 'TAKEAWAY';
      items: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        unitPrice?: number;
        modifiers?: string[];
        notes?: string;
      }>;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one menu item is required for KOT');
    }

    let targetTableNumber = data.tableNumber || 'TAKEAWAY';
    let orderId: string = `ORD-TKW-${Date.now().toString(36).toUpperCase()}`;
    let table: any = null;

    if (data.tableId) {
      table = await this.prisma.restaurantTable.findFirst({
        where: { id: data.tableId, organizationId }
      });
      if (!table) throw new NotFoundException('Table not found');
      targetTableNumber = table.tableNumber;
      orderId = table.activeOrderId || `ORD-${Date.now().toString(36).toUpperCase()}`;
    }

    const count = await this.prisma.kitchenOrderTicket.count({ where: { organizationId } });
    const kotNumber = formatDocumentNumber('KOT', count + 1);

    const itemsWithStatus = data.items.map((it) => ({
      menuItemId: it.menuItemId,
      name: it.name,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      modifiers: it.modifiers || [],
      notes: it.notes || '',
      status: KitchenStatus.NEW
    }));

    const kot = await this.prisma.kitchenOrderTicket.create({
      data: {
        organizationId,
        branchId,
        kotNumber,
        tableNumber: targetTableNumber,
        orderId,
        items: itemsWithStatus,
        waiterName: userName,
        status: KitchenStatus.NEW
      }
    });

    if (table) {
      await this.prisma.restaurantTable.update({
        where: { id: table.id },
        data: {
          status: RestaurantTableStatus.KOT_SENT,
          activeOrderId: orderId
        }
      });
      this.eventsGateway.emitTableUpdate(organizationId, branchId, { ...table, status: RestaurantTableStatus.KOT_SENT, activeOrderId: orderId });
    }

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName: userName || 'Staff',
      action: 'RESTAURANT_KOT_CREATED',
      entityType: 'KitchenOrderTicket',
      entityId: kot.id,
      details: { kotNumber, tableNumber: targetTableNumber, orderId, itemCount: itemsWithStatus.length }
    });

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

    // Advance table status if appropriate
    if (status === KitchenStatus.PREPARING) {
      await this.prisma.restaurantTable.updateMany({
        where: { organizationId, tableNumber: kot.tableNumber, status: RestaurantTableStatus.KOT_SENT },
        data: { status: RestaurantTableStatus.PREPARING }
      });
    } else if (status === KitchenStatus.READY) {
      await this.prisma.restaurantTable.updateMany({
        where: { organizationId, tableNumber: kot.tableNumber },
        data: { status: RestaurantTableStatus.READY }
      });
    }

    this.eventsGateway.emitKOTUpdate(organizationId, kot.branchId, updated);
    this.eventsGateway.emitTableUpdate(organizationId, kot.branchId, { tableNumber: kot.tableNumber, status });
    return updated;
  }

  async cancelKOT(organizationId: string, kotId: string, userId: string, reason?: string) {
    const kot = await this.prisma.kitchenOrderTicket.findFirst({
      where: { id: kotId, organizationId }
    });
    if (!kot) throw new NotFoundException('KOT not found');

    const updated = await this.prisma.kitchenOrderTicket.update({
      where: { id: kot.id },
      data: { status: KitchenStatus.CANCELLED }
    });

    await this.auditService.log({
      organizationId,
      branchId: kot.branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_KOT_CANCELLED',
      entityType: 'KitchenOrderTicket',
      entityId: kot.id,
      details: { kotNumber: kot.kotNumber, tableNumber: kot.tableNumber, reason: reason || 'Not specified' }
    });

    this.eventsGateway.emitKOTUpdate(organizationId, kot.branchId, updated);
    return updated;
  }

  // ==========================================
  // 3. TABLE BILLING & SETTLEMENT
  // ==========================================

  async getTableBillSummary(organizationId: string, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, organizationId }
    });
    if (!table) throw new NotFoundException('Table not found');

    if (!table.activeOrderId) {
      return { table, activeOrderId: null, items: [], subtotal: 0, taxAmount: 0, grandTotal: 0 };
    }

    const activeKots = await this.prisma.kitchenOrderTicket.findMany({
      where: {
        organizationId,
        orderId: table.activeOrderId,
        status: { not: KitchenStatus.CANCELLED }
      }
    });

    // Aggregate items across all active KOTs for this order
    const aggregatedItemsMap = new Map<string, { menuItemId: string; name: string; quantity: number; unitPrice: number; modifiers: string[]; notes: string }>();

    for (const kot of activeKots) {
      const items = (kot.items as any[]) || [];
      for (const it of items) {
        if (it.status === KitchenStatus.CANCELLED) continue;
        const key = `${it.menuItemId || it.name}_${it.unitPrice}`;
        if (aggregatedItemsMap.has(key)) {
          const existing = aggregatedItemsMap.get(key)!;
          existing.quantity += Number(it.quantity) || 1;
        } else {
          aggregatedItemsMap.set(key, {
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            modifiers: it.modifiers || [],
            notes: it.notes || ''
          });
        }
      }
    }

    const items = Array.from(aggregatedItemsMap.values());
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% standard GST for restaurant
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    return {
      table,
      activeOrderId: table.activeOrderId,
      kotCount: activeKots.length,
      items,
      subtotal,
      taxAmount,
      grandTotal
    };
  }

  async settleTable(
    organizationId: string,
    branchId: string,
    userId: string,
    tableId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      amountPaid?: number;
      customerId?: string;
      discountAmount?: number;
      notes?: string;
    }
  ) {
    const summary = await this.getTableBillSummary(organizationId, tableId);
    if (!summary.items || summary.items.length === 0) {
      throw new BadRequestException('No active order items found to bill for this table');
    }

    const table = summary.table;
    const targetBranchId = branchId || table.branchId;

    const invoiceLines = summary.items.map((it) => ({
      productId: it.menuItemId || undefined,
      name: it.name,
      quantity: it.quantity,
      unit: 'PORTION',
      unitPrice: it.unitPrice,
      taxRate: 5,
      taxMode: TaxMode.EXCLUSIVE
    }));

    const invoice = await this.invoicesService.create(
      organizationId,
      targetBranchId,
      userId,
      'Restaurant Staff',
      {
        customerId: paymentData.customerId,
        customerName: `Table ${table.tableNumber} Guest`,
        isB2B: false,
        isInterState: false,
        lines: invoiceLines,
        payment: {
          amount: Number(paymentData.amountPaid) || summary.grandTotal,
          method: paymentData.paymentMethod || PaymentMethod.CASH,
          referenceNumber: summary.activeOrderId || undefined
        }
      }
    );

    if (!invoice) {
      throw new BadRequestException('Failed to generate settlement invoice');
    }

    if (summary.activeOrderId) {
      // Mark all KOTs for this order as SERVED
      await this.prisma.kitchenOrderTicket.updateMany({
        where: { organizationId, orderId: summary.activeOrderId },
        data: { status: KitchenStatus.SERVED }
      });
    }

    // Reset Table to AVAILABLE
    const updatedTable = await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        status: RestaurantTableStatus.AVAILABLE,
        activeOrderId: null
      }
    });

    await this.auditService.log({
      organizationId,
      branchId: targetBranchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_TABLE_BILLED',
      entityType: 'Invoice',
      entityId: invoice.id,
      details: { invoiceNumber: invoice.invoiceNumber, tableNumber: table.tableNumber, grandTotal: invoice.grandTotal }
    });

    this.eventsGateway.emitTableUpdate(organizationId, targetBranchId, updatedTable);

    return {
      success: true,
      invoice,
      table: updatedTable,
      tableNumber: table.tableNumber,
      totalAmount: invoice.grandTotal,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.balanceAmount
    };
  }

  // ==========================================
  // 4. RESERVATIONS
  // ==========================================

  async getReservations(organizationId: string, branchId?: string, date?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (status && status !== 'ALL') where.status = status;

    return this.prisma.restaurantReservation.findMany({
      where,
      orderBy: [{ reservationDate: 'asc' }, { reservationTime: 'asc' }]
    });
  }

  async createReservation(
    organizationId: string,
    branchId: string,
    userId: string,
    data: {
      customerName: string;
      customerPhone: string;
      guestCount?: number;
      reservationDate: string | Date;
      reservationTime: string;
      tableNumber?: string;
      section?: string;
      notes?: string;
    }
  ) {
    if (!data.customerName?.trim() || !data.customerPhone?.trim()) {
      throw new BadRequestException('Customer name and phone number are required');
    }

    const reservation = await this.prisma.restaurantReservation.create({
      data: {
        organizationId,
        branchId,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        guestCount: Number(data.guestCount) || 2,
        reservationDate: new Date(data.reservationDate),
        reservationTime: data.reservationTime || '19:00',
        tableNumber: data.tableNumber?.trim() || null,
        section: data.section?.trim() || 'Ground Floor',
        notes: data.notes || '',
        status: 'CONFIRMED'
      }
    });

    if (data.tableNumber) {
      await this.prisma.restaurantTable.updateMany({
        where: { organizationId, branchId, tableNumber: data.tableNumber.trim(), status: RestaurantTableStatus.AVAILABLE },
        data: { status: 'OCCUPIED' }
      });
      this.eventsGateway.emitTableUpdate(organizationId, branchId, { tableNumber: data.tableNumber, status: 'OCCUPIED' });
    }

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName: 'Restaurant Staff',
      action: 'RESTAURANT_RESERVATION_CREATED',
      entityType: 'RestaurantReservation',
      entityId: reservation.id,
      details: { reservationId: reservation.id, customerName: reservation.customerName, tableNumber: reservation.tableNumber }
    });

    this.eventsGateway.emitReservationUpdate(organizationId, branchId, reservation);
    return reservation;
  }

  async updateReservationStatus(organizationId: string, reservationId: string, status: string) {
    const res = await this.prisma.restaurantReservation.findFirst({
      where: { id: reservationId, organizationId }
    });
    if (!res) throw new NotFoundException('Reservation not found');

    const updated = await this.prisma.restaurantReservation.update({
      where: { id: res.id },
      data: { status }
    });

    if (res.tableNumber && (status === 'SEATED' || status === 'COMPLETED' || status === 'CANCELLED')) {
      const tableStatus = status === 'SEATED' ? RestaurantTableStatus.OCCUPIED : RestaurantTableStatus.AVAILABLE;
      await this.prisma.restaurantTable.updateMany({
        where: { organizationId, branchId: res.branchId, tableNumber: res.tableNumber },
        data: { status: tableStatus }
      });
      this.eventsGateway.emitTableUpdate(organizationId, res.branchId, { tableNumber: res.tableNumber, status: tableStatus });
    }

    this.eventsGateway.emitReservationUpdate(organizationId, res.branchId, updated);
    return updated;
  }
}
