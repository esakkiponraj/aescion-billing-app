import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { StockEventType, InvoiceStatus, TaxMode } from '@aescion/shared-types';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class WholesaleService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async getSalesOrders(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (status && status !== 'ALL') where.status = status;
    const orders = await this.prisma.wholesaleSalesOrder.findMany({
      where,
      include: { customer: true, branch: true },
      orderBy: { createdAt: 'desc' }
    });

    return orders.map(order => {
      const details = (order.dispatchDetails as any) || {};
      return {
        ...order,
        items: details.items || [],
        dispatches: details.dispatches || [],
        paymentTerms: details.paymentTerms || 'Net 30',
        creditDays: details.creditDays || 30,
        notes: details.notes || ''
      };
    });
  }

  async getSalesOrderById(organizationId: string, orderId: string) {
    const order = await this.prisma.wholesaleSalesOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { customer: true, branch: true }
    });
    if (!order) throw new NotFoundException('Sales Order not found');

    const details = (order.dispatchDetails as any) || {};
    return {
      ...order,
      items: details.items || [],
      dispatches: details.dispatches || [],
      paymentTerms: details.paymentTerms || 'Net 30',
      creditDays: details.creditDays || 30,
      notes: details.notes || ''
    };
  }

  async createSalesOrder(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    const count = await this.prisma.wholesaleSalesOrder.count({ where: { organizationId } });
    const orderNumber = formatDocumentNumber('SO', count + 1);

    let customerId = data.customerId;
    let customerName = data.customerName;

    if (!customerId && data.customerName) {
      const cust = await this.prisma.customer.create({
        data: {
          organizationId,
          name: data.customerName,
          phone: data.customerPhone || '9876543210',
          gstin: data.gstin,
          creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : 50000
        }
      });
      customerId = cust.id;
      customerName = cust.name;
    } else if (customerId) {
      const existingCust = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (existingCust) customerName = existingCust.name;
    }

    let calculatedTotal = 0;
    const items = (data.items || []).map((it: any) => {
      const qty = parseFloat(it.quantityOrdered) || 1;
      const rate = parseFloat(it.unitPrice) || 0;
      const taxRate = parseFloat(it.taxRate) || 0;
      const gross = qty * rate;
      const tax = (gross * taxRate) / 100;
      const lineTotal = Math.round((gross + tax) * 100) / 100;

      calculatedTotal += lineTotal;

      return {
        productId: it.productId || '',
        name: it.name || 'Wholesale Commodity Product',
        quantityOrdered: qty,
        dispatchedQuantity: 0,
        pendingQuantity: qty,
        unitPrice: rate,
        taxRate,
        total: lineTotal
      };
    });

    const finalAmount = data.totalAmount ? parseFloat(data.totalAmount) : Math.round(calculatedTotal * 100) / 100;

    const order = await this.prisma.wholesaleSalesOrder.create({
      data: {
        organizationId,
        branchId,
        orderNumber,
        customerId,
        customerName: customerName || 'Wholesale Buyer',
        salesmanName: data.salesmanName || userName,
        status: 'ORDER_PLACED',
        totalAmount: finalAmount,
        dispatchDetails: {
          items,
          dispatches: [],
          paymentTerms: data.paymentTerms || 'Net 30',
          creditDays: data.creditDays || 30,
          notes: data.notes || ''
        }
      },
      include: { customer: true }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName,
      action: 'WHOLESALE_ORDER_CREATED',
      entityType: 'WHOLESALE_ORDER',
      entityId: order.id,
      details: { orderNumber, totalAmount: order.totalAmount, itemCount: items.length }
    });

    this.eventsGateway.emitWholesaleOrderUpdated(organizationId, branchId, order);
    this.eventsGateway.emitPulseUpdate(organizationId, branchId, { trigger: 'WHOLESALE_ORDER_CREATED', orderId: order.id });

    return {
      ...order,
      items,
      dispatches: [],
      paymentTerms: data.paymentTerms || 'Net 30',
      creditDays: data.creditDays || 30
    };
  }

  async dispatchOrder(organizationId: string, orderId: string, userId: string, userName: string, dispatchData: {
    vehicleNo: string;
    transporterName?: string;
    driverName?: string;
    notes?: string;
    items?: Array<{ productId?: string; name?: string; quantity: number }>;
  }) {
    const order = await this.prisma.wholesaleSalesOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { branch: true }
    });
    if (!order) throw new NotFoundException('Sales Order not found');

    const details = (order.dispatchDetails as any) || {};
    const items = details.items || [];
    const existingDispatches = details.dispatches || [];

    const challanCount = await this.prisma.wholesaleSalesOrder.count({
      where: { organizationId, status: { in: ['DISPATCHED', 'PARTIALLY_DISPATCHED'] } }
    });
    const challanNumber = formatDocumentNumber('DC', challanCount + 1, order.branch?.code || 'MAIN');

    return this.prisma.$transaction(async (tx) => {
      const dispatchedLines: any[] = [];
      let allFullyDispatched = true;

      // Update line items and deduct inventory
      for (const line of items) {
        let dispatchQty = 0;
        if (dispatchData.items && dispatchData.items.length > 0) {
          const match = dispatchData.items.find(
            (d) => (line.productId && d.productId === line.productId) || d.name === line.name
          );
          if (match) dispatchQty = Math.min(line.pendingQuantity, match.quantity);
        } else {
          // Default to dispatching all pending
          dispatchQty = line.pendingQuantity;
        }

        if (dispatchQty > 0) {
          line.dispatchedQuantity += dispatchQty;
          line.pendingQuantity = Math.max(0, line.quantityOrdered - line.dispatchedQuantity);

          dispatchedLines.push({
            productId: line.productId,
            name: line.name,
            quantity: dispatchQty,
            unitPrice: line.unitPrice
          });

          // If product is in inventory, deduct stock & log StockLedger
          if (line.productId) {
            const product = await tx.product.findUnique({ where: { id: line.productId } });
            if (product) {
              const newStock = Math.max(0, product.currentStock - dispatchQty);
              await tx.product.update({
                where: { id: product.id },
                data: { currentStock: newStock }
              });

              await tx.stockLedger.create({
                data: {
                  organizationId,
                  branchId: order.branchId,
                  productId: product.id,
                  eventType: StockEventType.SALE,
                  quantityChange: -dispatchQty,
                  balanceAfter: newStock,
                  referenceType: 'DELIVERY_CHALLAN',
                  referenceId: challanNumber,
                  unitCost: line.unitPrice,
                  notes: `Wholesale dispatch ${challanNumber} for ${order.orderNumber}`,
                  createdById: userId
                }
              });
            }
          }
        }

        if (line.pendingQuantity > 0) {
          allFullyDispatched = false;
        }
      }

      const newStatus = allFullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED';

      const newDispatchRecord = {
        challanNumber,
        dispatchDate: new Date().toISOString(),
        vehicleNo: dispatchData.vehicleNo,
        transporterName: dispatchData.transporterName || 'Direct Delivery',
        driverName: dispatchData.driverName || 'Primary Driver',
        notes: dispatchData.notes || '',
        items: dispatchedLines
      };

      const updatedDispatches = [...existingDispatches, newDispatchRecord];

      const updated = await tx.wholesaleSalesOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          dispatchDetails: {
            ...details,
            items,
            dispatches: updatedDispatches,
            lastChallanNumber: challanNumber,
            vehicleNo: dispatchData.vehicleNo,
            transporterName: dispatchData.transporterName
          }
        },
        include: { customer: true, branch: true }
      });

      await this.auditService.log({
        organizationId,
        branchId: order.branchId,
        userId,
        userName,
        action: 'WHOLESALE_ORDER_DISPATCHED',
        entityType: 'WHOLESALE_ORDER',
        entityId: order.id,
        details: { challanNumber, vehicleNo: dispatchData.vehicleNo, status: newStatus }
      });

      return {
        ...updated,
        items,
        dispatches: updatedDispatches,
        challanNumber
      };
    }).then(res => {
      this.eventsGateway.emitWholesaleOrderUpdated(organizationId, order.branchId, res);
      this.eventsGateway.emitPulseUpdate(organizationId, order.branchId, { trigger: 'WHOLESALE_ORDER_DISPATCHED', orderId: order.id });
      return res;
    });
  }

  async convertOrderToInvoice(organizationId: string, orderId: string, userId: string, userName: string) {
    const order = await this.prisma.wholesaleSalesOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { customer: true, branch: true }
    });
    if (!order) throw new NotFoundException('Sales Order not found');

    const details = (order.dispatchDetails as any) || {};
    const items = details.items || [];

    const docSettings = await this.prisma.documentSettings.findUnique({ where: { organizationId } });
    const invoiceCount = await this.prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = formatDocumentNumber(docSettings?.invoicePrefix || 'INV', invoiceCount + 1, order.branch?.code || 'MAIN');

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const lines = items.map((it: any) => {
      const qty = it.quantityOrdered || 1;
      const rate = it.unitPrice || 0;
      const lineSubtotal = qty * rate;
      const tax = (lineSubtotal * (it.taxRate || 0)) / 100;
      const lineTotal = lineSubtotal + tax;

      subtotal += lineSubtotal;
      taxTotal += tax;
      grandTotal += lineTotal;

      return {
        productId: it.productId || 'wholesale-custom-prod',
        name: it.name,
        sku: 'WHL-SKU',
        quantity: qty,
        unit: 'PCS',
        unitPrice: rate,
        discountRate: 0,
        discountAmount: 0,
        taxRate: it.taxRate || 0,
        taxMode: TaxMode.EXCLUSIVE,
        taxableAmount: lineSubtotal,
        cgstAmount: tax / 2,
        sgstAmount: tax / 2,
        igstAmount: 0,
        cessAmount: 0,
        totalTax: tax,
        lineSubtotal,
        lineTotal
      };
    });

    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedTaxTotal = Math.round(taxTotal * 100) / 100;
    const roundedGrandTotal = Math.round(grandTotal * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          branchId: order.branchId,
          invoiceNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          status: InvoiceStatus.ISSUED,
          subtotal: roundedSubtotal,
          taxTotal: roundedTaxTotal,
          grandTotal: roundedGrandTotal,
          paidAmount: 0,
          balanceAmount: roundedGrandTotal,
          createdById: userId,
          lines: { create: lines }
        },
        include: { lines: true, branch: true }
      });

      // Update customer outstanding
      if (order.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: order.customerId } });
        if (customer) {
          const newOutstanding = customer.currentOutstanding + roundedGrandTotal;
          await tx.customer.update({
            where: { id: customer.id },
            data: { currentOutstanding: newOutstanding }
          });

          await tx.customerLedger.create({
            data: {
              organizationId,
              customerId: customer.id,
              transactionType: 'INVOICE_DEBIT',
              amount: roundedGrandTotal,
              balanceAfter: newOutstanding,
              referenceId: invoice.id,
              notes: `Wholesale Order ${order.orderNumber} converted to ${invoice.invoiceNumber}`
            }
          });
        }
      }

      // Update Sales Order status
      const updatedOrder = await tx.wholesaleSalesOrder.update({
        where: { id: order.id },
        data: {
          status: 'INVOICED',
          dispatchDetails: {
            ...details,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber
          }
        }
      });

      await this.auditService.log({
        organizationId,
        branchId: order.branchId,
        userId,
        userName,
        action: 'WHOLESALE_ORDER_INVOICED',
        entityType: 'WHOLESALE_ORDER',
        entityId: order.id,
        details: { orderNumber: order.orderNumber, invoiceNumber }
      });

      return { invoice, order: updatedOrder };
    }).then(res => {
      this.eventsGateway.emitInvoiceCreated(organizationId, order.branchId, res.invoice);
      this.eventsGateway.emitWholesaleOrderUpdated(organizationId, order.branchId, res.order);
      this.eventsGateway.emitPulseUpdate(organizationId, order.branchId, { trigger: 'WHOLESALE_ORDER_INVOICED' });
      return res;
    });
  }
}
