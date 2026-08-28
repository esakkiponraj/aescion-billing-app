import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QuotationStatus } from '@aescion/shared-types';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { InvoiceService } from '../invoices/invoices.service';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class QuotationService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async findAll(organizationId: string, branchId?: string, status?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    return this.prisma.quotation.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(organizationId: string, id: string) {
    const qtn = await this.prisma.quotation.findFirst({
      where: { id, organizationId },
      include: { lines: true }
    });
    if (!qtn) throw new NotFoundException('Quotation not found');
    return qtn;
  }

  async create(organizationId: string, branchId: string, userId: string, userName: string, data: any) {
    const [docSettings, branch] = await Promise.all([
      this.prisma.documentSettings.findUnique({ where: { organizationId } }),
      this.prisma.branch.findUnique({ where: { id: branchId } })
    ]);

    const count = await this.prisma.quotation.count({ where: { organizationId } });
    const quotationNumber = formatDocumentNumber(docSettings?.quotationPrefix || 'QTN', count + 1, branch?.code);

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const lines = (data.lines || []).map((l: any) => {
      const gross = (l.quantity || 1) * (l.unitPrice || 0);
      const discount = l.discountAmount || 0;
      const net = Math.max(0, gross - discount);
      const tax = (net * (l.taxRate || 0)) / 100;
      const total = net + tax;

      subtotal += net;
      taxTotal += tax;
      grandTotal += total;

      return {
        productId: l.productId || undefined,
        name: l.name,
        hsn: l.hsn,
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || 0,
        discountAmount: discount,
        taxRate: l.taxRate || 0,
        lineTotal: Math.round(total * 100) / 100
      };
    });

    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId,
        branchId,
        quotationNumber,
        customerId: data.customerId || undefined,
        customerName: data.customerName || 'Prospect Customer',
        status: QuotationStatus.DRAFT,
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        createdById: userId,
        lines: { create: lines }
      },
      include: { lines: true }
    });

    await this.auditService.log({
      organizationId,
      branchId,
      userId,
      userName,
      action: 'QUOTATION_CREATE',
      entityType: 'QUOTATION',
      entityId: quotation.id,
      details: { quotationNumber, grandTotal }
    });

    this.eventsGateway.emitQuotationUpdated(organizationId, branchId, quotation);

    return quotation;
  }

  async update(organizationId: string, id: string, userId: string, userName: string, data: any) {
    const qtn = await this.findOne(organizationId, id);
    if (qtn.status === QuotationStatus.CONVERTED) {
      throw new BadRequestException('Converted quotations cannot be modified.');
    }

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const lines = (data.lines || []).map((l: any) => {
      const gross = (l.quantity || 1) * (l.unitPrice || 0);
      const discount = l.discountAmount || 0;
      const net = Math.max(0, gross - discount);
      const tax = (net * (l.taxRate || 0)) / 100;
      const total = net + tax;

      subtotal += net;
      taxTotal += tax;
      grandTotal += total;

      return {
        productId: l.productId || undefined,
        name: l.name,
        hsn: l.hsn,
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || 0,
        discountAmount: discount,
        taxRate: l.taxRate || 0,
        lineTotal: Math.round(total * 100) / 100
      };
    });

    return this.prisma.$transaction(async (tx) => {
      // Delete old lines
      await tx.quotationLine.deleteMany({ where: { quotationId: qtn.id } });

      const updated = await tx.quotation.update({
        where: { id: qtn.id },
        data: {
          customerId: data.customerId !== undefined ? data.customerId : qtn.customerId,
          customerName: data.customerName || qtn.customerName,
          status: data.status || qtn.status,
          subtotal: Math.round(subtotal * 100) / 100,
          taxTotal: Math.round(taxTotal * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100,
          validUntil: data.validUntil ? new Date(data.validUntil) : qtn.validUntil,
          lines: { create: lines }
        },
        include: { lines: true }
      });

      await this.auditService.log({
        organizationId,
        branchId: qtn.branchId,
        userId,
        userName,
        action: 'QUOTATION_UPDATE',
        entityType: 'QUOTATION',
        entityId: qtn.id,
        details: { quotationNumber: qtn.quotationNumber, grandTotal }
      });

      return updated;
    });
  }

  async updateStatus(organizationId: string, id: string, userId: string, userName: string, status: string) {
    const qtn = await this.findOne(organizationId, id);
    if (qtn.status === QuotationStatus.CONVERTED) {
      throw new BadRequestException('Converted quotation status cannot be changed.');
    }

    const updated = await this.prisma.quotation.update({
      where: { id: qtn.id },
      data: { status }
    });

    await this.auditService.log({
      organizationId,
      branchId: qtn.branchId,
      userId,
      userName,
      action: 'QUOTATION_STATUS_CHANGE',
      entityType: 'QUOTATION',
      entityId: qtn.id,
      details: { from: qtn.status, to: status }
    });

    return updated;
  }

  async convertToInvoice(organizationId: string, id: string, userId: string, userName: string) {
    const qtn = await this.findOne(organizationId, id);
    if (qtn.status === QuotationStatus.CONVERTED) {
      throw new ConflictException('This quotation has already been converted to an invoice.');
    }

    // Convert quotation lines into invoice format
    const invoiceLines = qtn.lines.map((l) => ({
      productId: l.productId || undefined,
      name: l.name,
      hsn: l.hsn || undefined,
      quantity: l.quantity,
      unit: 'PCS',
      unitPrice: l.unitPrice,
      discountAmount: l.discountAmount,
      taxRate: l.taxRate,
      taxMode: 'EXCLUSIVE' as any
    }));

    const invoice = await this.invoiceService.create(organizationId, qtn.branchId, userId, userName, {
      branchId: qtn.branchId,
      customerId: qtn.customerId || undefined,
      customerName: qtn.customerName,
      isB2B: false,
      isInterState: false,
      lines: invoiceLines
    });

    if (!invoice) {
      throw new BadRequestException('Failed to generate invoice from quotation');
    }

    await this.prisma.quotation.update({
      where: { id: qtn.id },
      data: { status: QuotationStatus.CONVERTED }
    });

    await this.auditService.log({
      organizationId,
      branchId: qtn.branchId,
      userId,
      userName,
      action: 'QUOTATION_CONVERTED',
      entityType: 'QUOTATION',
      entityId: qtn.id,
      details: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }
    });

    return invoice;
  }
}
