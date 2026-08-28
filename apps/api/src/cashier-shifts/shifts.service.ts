import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ShiftStatus } from '@aescion/shared-types';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class ShiftService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async getCurrentShift(organizationId: string, branchId: string, cashierId: string) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: { organizationId, branchId, cashierId, shiftStatus: ShiftStatus.OPEN },
      include: { register: true }
    });

    if (!shift) {
      return null;
    }

    // Calculate live cash sales during this open shift
    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        organizationId,
        branchId: shift.branchId,
        receivedById: shift.cashierId,
        method: 'CASH',
        createdAt: { gte: shift.openedAt }
      },
      _sum: { amount: true }
    });

    const totalCashSales = cashPayments._sum.amount || 0;
    const expectedCash = shift.openingCash + totalCashSales;

    return {
      ...shift,
      shiftNumber: `SH-${shift.id.slice(0, 8).toUpperCase()}`,
      status: shift.shiftStatus,
      openingFloat: shift.openingCash,
      startTime: shift.openedAt,
      endTime: shift.closedAt,
      totalCashSales,
      expectedCash,
      actualCashCounted: shift.actualCash
    };
  }

  async getAllShifts(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    const shifts = await this.prisma.cashierShift.findMany({
      where,
      include: { register: true },
      orderBy: { openedAt: 'desc' }
    });

    return shifts.map((shift) => ({
      ...shift,
      shiftNumber: `SH-${shift.id.slice(0, 8).toUpperCase()}`,
      status: shift.shiftStatus,
      openingFloat: shift.openingCash,
      expectedCash: shift.closingCash ?? shift.openingCash,
      actualCashCounted: shift.actualCash,
      startTime: shift.openedAt,
      endTime: shift.closedAt
    }));
  }

  async openShift(
    organizationId: string,
    branchId: string,
    cashierId: string,
    cashierName: string,
    data: {
      registerId?: string;
      openingCash?: number;
      openingFloat?: number;
      notes?: string;
    }
  ) {
    const active = await this.prisma.cashierShift.findFirst({
      where: { organizationId, branchId, cashierId, shiftStatus: ShiftStatus.OPEN }
    });
    if (active) {
      throw new BadRequestException('You already have an active open shift on this register.');
    }

    const openingCash = data.openingCash !== undefined ? data.openingCash : data.openingFloat !== undefined ? data.openingFloat : 0;

    // Validate or resolve Register
    let targetRegisterId = data.registerId;
    const regExists = targetRegisterId
      ? await this.prisma.register.findFirst({
          where: { id: targetRegisterId, organizationId }
        })
      : null;

    if (!regExists) {
      let branchReg = await this.prisma.register.findFirst({
        where: { branchId, organizationId }
      });
      if (!branchReg) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        branchReg = await this.prisma.register.create({
          data: {
            organizationId,
            branchId,
            name: `${branch?.code || 'MAIN'}-REG-01`,
            code: 'REG-01'
          }
        });
      }
      targetRegisterId = branchReg.id;
    }

    const shift = await this.prisma.cashierShift.create({
      data: {
        organizationId,
        branchId,
        registerId: targetRegisterId!,
        cashierId,
        cashierName,
        openingCash,
        shiftStatus: ShiftStatus.OPEN,
        notes: data.notes
      },
      include: { register: true }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId: cashierId,
      userName: cashierName,
      action: 'SHIFT_OPEN',
      entityType: 'SHIFT',
      entityId: shift.id,
      details: { openingCash }
    });

    const result = {
      ...shift,
      shiftNumber: `SH-${shift.id.slice(0, 8).toUpperCase()}`,
      status: shift.shiftStatus,
      openingFloat: shift.openingCash,
      startTime: shift.openedAt,
      endTime: shift.closedAt,
      totalCashSales: 0,
      expectedCash: shift.openingCash,
      actualCashCounted: null
    };

    this.eventsGateway.emitShiftUpdate(organizationId, branchId, result);
    return result;
  }

  async closeShift(
    organizationId: string,
    shiftId: string,
    cashierId: string,
    cashierName: string,
    data: {
      actualCash?: number;
      actualCashCounted?: number;
      notes?: string;
    }
  ) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: { id: shiftId, organizationId }
    });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.shiftStatus === ShiftStatus.CLOSED) throw new BadRequestException('Shift is already closed');

    // Calculate cash collections during shift
    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        organizationId,
        branchId: shift.branchId,
        receivedById: shift.cashierId,
        method: 'CASH',
        createdAt: { gte: shift.openedAt }
      },
      _sum: { amount: true }
    });

    const totalCashCollected = cashPayments._sum.amount || 0;
    const expectedClosingCash = shift.openingCash + totalCashCollected;
    const actualCash = data.actualCash !== undefined ? data.actualCash : data.actualCashCounted !== undefined ? data.actualCashCounted : 0;
    const cashDifference = Math.round((actualCash - expectedClosingCash) * 100) / 100;

    const closedShift = await this.prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        closingCash: expectedClosingCash,
        actualCash,
        cashDifference,
        shiftStatus: ShiftStatus.CLOSED,
        closedAt: new Date(),
        notes: data.notes ? `${shift.notes ? shift.notes + ' | ' : ''}${data.notes}` : shift.notes
      }
    });

    await this.auditService.log({
      organizationId,
      branchId: shift.branchId,
      userId: cashierId,
      userName: cashierName,
      action: 'SHIFT_CLOSE',
      entityType: 'SHIFT',
      entityId: shift.id,
      details: { expectedClosingCash, actualCash, cashDifference }
    });

    const result = {
      ...closedShift,
      shiftNumber: `SH-${closedShift.id.slice(0, 8).toUpperCase()}`,
      status: closedShift.shiftStatus,
      openingFloat: closedShift.openingCash,
      expectedCash: closedShift.closingCash,
      actualCashCounted: closedShift.actualCash,
      startTime: closedShift.openedAt,
      endTime: closedShift.closedAt
    };

    this.eventsGateway.emitShiftUpdate(organizationId, shift.branchId, result);
    return result;
  }

  async closeCurrentShift(
    organizationId: string,
    branchId: string,
    cashierId: string,
    cashierName: string,
    data: {
      actualCash?: number;
      actualCashCounted?: number;
      notes?: string;
    }
  ) {
    const active = await this.prisma.cashierShift.findFirst({
      where: { organizationId, branchId, cashierId, shiftStatus: ShiftStatus.OPEN }
    });
    if (!active) {
      throw new BadRequestException('No active open shift found to close.');
    }
    return this.closeShift(organizationId, active.id, cashierId, cashierName, data);
  }
}
