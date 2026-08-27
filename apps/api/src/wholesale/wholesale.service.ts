import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class WholesaleService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async getSalesOrders(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.wholesaleSalesOrder.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSalesOrder(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    const count = await this.prisma.wholesaleSalesOrder.count({ where: { organizationId } });
    const orderNumber = formatDocumentNumber('SO', count + 1);

    let customerId = data.customerId;
    if (!customerId) {
      const cust = await this.prisma.customer.create({
        data: {
          organizationId,
          name: data.customerName || 'Wholesale Buyer',
          phone: data.customerPhone || '9876543210',
          gstin: data.gstin
        }
      });
      customerId = cust.id;
    }

    const order = await this.prisma.wholesaleSalesOrder.create({
      data: {
        organizationId,
        branchId,
        orderNumber,
        customerId,
        customerName: data.customerName,
        salesmanName: data.salesmanName || userName,
        status: 'ORDER_PLACED',
        totalAmount: data.totalAmount || 0
      }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName,
      action: 'WHOLESALE_ORDER_CREATED',
      entityType: 'WHOLESALE_ORDER',
      entityId: order.id,
      details: { orderNumber, totalAmount: order.totalAmount }
    });

    return order;
  }

  async dispatchOrder(organizationId: string, orderId: string, userId: string, userName: string, dispatchData: {
    vehicleNo: string;
    transporterName: string;
    notes?: string;
  }) {
    const order = await this.prisma.wholesaleSalesOrder.findFirst({
      where: { id: orderId, organizationId }
    });
    if (!order) throw new NotFoundException('Sales Order not found');

    const challanCount = await this.prisma.wholesaleSalesOrder.count({
      where: { organizationId, status: 'DISPATCHED' }
    });
    const challanNumber = formatDocumentNumber('DC', challanCount + 1);

    const updated = await this.prisma.wholesaleSalesOrder.update({
      where: { id: order.id },
      data: {
        status: 'DISPATCHED',
        dispatchDetails: {
          dispatchDate: new Date(),
          vehicleNo: dispatchData.vehicleNo,
          transporterName: dispatchData.transporterName,
          challanNumber,
          notes: dispatchData.notes
        }
      }
    });

    await this.auditService.log({
      organizationId,
      branchId: order.branchId,
      userId,
      userName,
      action: 'WHOLESALE_ORDER_DISPATCHED',
      entityType: 'WHOLESALE_ORDER',
      entityId: order.id,
      details: { challanNumber, vehicleNo: dispatchData.vehicleNo }
    });

    return updated;
  }
}
