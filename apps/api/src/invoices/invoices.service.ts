import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  StockEventType,
  TaxMode
} from '@aescion/shared-types';
import { CreateInvoiceInput } from '@aescion/validation';
import { calculateLineTax, computeInvoiceTotals, formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async findAll(organizationId: string, branchId?: string, status?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { organizationId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        lines: true,
        payments: true,
        receipts: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        lines: true,
        payments: true,
        receipts: true,
        branch: true
      }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async create(organizationId: string, branchId: string, userId: string, userName: string, dto: CreateInvoiceInput) {
    // 1. Idempotency protection check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.invoice.findFirst({
        where: { organizationId, idempotencyKey: dto.idempotencyKey },
        include: { lines: true, payments: true, receipts: true, branch: true }
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch branch and settings for doc numbering
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId }
    });
    if (!branch) {
      throw new NotFoundException('Target branch not found');
    }

    const docSettings = await this.prisma.documentSettings.findUnique({
      where: { organizationId }
    });

    // 3. Batch Compliance & Line Item Calculations
    const calculatedLines: any[] = [];
    for (const item of dto.lines) {
      if (item.productId && item.batchNumber) {
        const batch = await this.prisma.medicineBatch.findFirst({
          where: {
            organizationId,
            medicineId: item.productId,
            batchNumber: item.batchNumber
          }
        });

        if (batch && (batch.isExpired || new Date(batch.expiryDate) < new Date())) {
          throw new ForbiddenException(
            `COMPLIANCE BLOCK: Batch ${batch.batchNumber} of ${batch.medicineName} is EXPIRED (${new Date(
              batch.expiryDate
            ).toLocaleDateString()}). Sale strictly prohibited.`
          );
        }
      }

      const lineTax = calculateLineTax({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountRate: item.discountRate || 0,
        taxRate: item.taxRate,
        taxMode: (item.taxMode as TaxMode) || TaxMode.EXCLUSIVE,
        isInterState: dto.isInterState
      });

      calculatedLines.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku || 'SKU-GENERIC',
        hsn: item.hsn || '',
        quantity: item.quantity,
        unit: item.unit || 'PCS',
        unitPrice: item.unitPrice,
        discountRate: item.discountRate || 0,
        discountAmount: lineTax.appliedDiscount,
        taxRate: item.taxRate,
        taxMode: item.taxMode || TaxMode.EXCLUSIVE,
        taxableAmount: lineTax.taxableAmount,
        cgstAmount: lineTax.cgstAmount,
        sgstAmount: lineTax.sgstAmount,
        igstAmount: lineTax.igstAmount,
        cessAmount: lineTax.cessAmount,
        totalTax: lineTax.totalTax,
        lineSubtotal: lineTax.lineSubtotal,
        lineTotal: lineTax.lineTotal,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        notes: item.notes
      });
    }

    // 4. Compute Master Invoice Totals
    const totals = computeInvoiceTotals(
      calculatedLines.map((l) => ({
        lineSubtotal: l.lineSubtotal,
        totalTax: l.totalTax,
        cgstAmount: l.cgstAmount,
        sgstAmount: l.sgstAmount,
        igstAmount: l.igstAmount,
        cessAmount: l.cessAmount,
        appliedDiscount: l.discountAmount,
        lineTotal: l.lineTotal
      }))
    );

    // 5. Payment calculations
    const paidAmount = dto.payment ? dto.payment.amount : 0;
    const balanceAmount = Math.max(0, totals.grandTotal - paidAmount);
    const invoiceStatus = balanceAmount === 0 ? InvoiceStatus.PAID : paidAmount > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;

    const paymentMethod = dto.payment?.method || PaymentMethod.CASH;
    const paymentRef = dto.payment?.referenceNumber;
    const splitDetails = dto.payment?.splitDetails;

    // 6. Atomic Transaction for Invoice, StockLedger, Customer, Payment, and Receipt
    const createdInvoice = await this.prisma.$transaction(async (tx) => {
      const invoiceCount = await tx.invoice.count({
        where: { organizationId }
      });

      const invoiceNumber = formatDocumentNumber(
        docSettings?.invoicePrefix || 'INV',
        invoiceCount + 1,
        branch.code
      );

      // Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          branchId,
          registerId: dto.registerId,
          customerId: dto.customerId,
          customerName: dto.customerName || 'Walk-in Customer',
          customerPhone: dto.customerPhone,
          customerGstin: dto.customerGstin,
          invoiceNumber,
          isB2B: dto.isB2B || false,
          isInterState: dto.isInterState || false,
          status: invoiceStatus,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          cessTotal: totals.cessTotal,
          taxTotal: totals.taxTotal,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          paidAmount,
          balanceAmount,
          idempotencyKey: dto.idempotencyKey,
          createdById: userId,
          lines: {
            create: calculatedLines
          }
        },
        include: { lines: true }
      });

      // Stock reduction & Stock Ledger Entries
      for (const line of calculatedLines) {
        if (line.productId) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (product) {
            const newStock = Math.max(0, product.currentStock - line.quantity);
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: newStock }
            });

            await tx.stockLedger.create({
              data: {
                organizationId,
                branchId,
                productId: product.id,
                variantId: line.variantId,
                eventType: StockEventType.SALE,
                quantityChange: -line.quantity,
                balanceAfter: newStock,
                referenceType: 'INVOICE',
                referenceId: invoice.id,
                unitCost: product.costPrice,
                batchNumber: line.batchNumber,
                expiryDate: line.expiryDate,
                notes: `Sale on ${invoice.invoiceNumber}`,
                createdById: userId
              }
            });

            // If medicine batch, reduce batch quantity
            if (line.batchNumber) {
              const batch = await tx.medicineBatch.findFirst({
                where: { organizationId, medicineId: product.id, batchNumber: line.batchNumber }
              });
              if (batch) {
                const newBatchQty = Math.max(0, batch.quantityRemaining - line.quantity);
                await tx.medicineBatch.update({
                  where: { id: batch.id },
                  data: { quantityRemaining: newBatchQty }
                });
              }
            }
          }
        }
      }

      // Customer outstanding balance update & Customer Ledger entry
      if (balanceAmount > 0 && dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (customer) {
          const updatedOutstanding = customer.currentOutstanding + balanceAmount;
          await tx.customer.update({
            where: { id: customer.id },
            data: { currentOutstanding: updatedOutstanding }
          });

          await tx.customerLedger.create({
            data: {
              organizationId,
              customerId: customer.id,
              transactionType: 'INVOICE_DEBIT',
              amount: balanceAmount,
              balanceAfter: updatedOutstanding,
              referenceId: invoice.id,
              notes: `Credit invoice ${invoice.invoiceNumber}`
            }
          });
        }
      }

      // Payment & Receipt generation if payment made
      if (paidAmount > 0) {
        const paymentCount = await tx.payment.count({ where: { organizationId } });
        const receiptNumber = formatDocumentNumber(docSettings?.receiptPrefix || 'RCP', paymentCount + 1, branch.code);

        const payment = await tx.payment.create({
          data: {
            organizationId,
            branchId,
            invoiceId: invoice.id,
            receiptNumber,
            amount: paidAmount,
            method: paymentMethod,
            status: PaymentStatus.COMPLETED,
            splitDetails: splitDetails || {},
            referenceNumber: paymentRef,
            receivedById: userId,
            notes: `Payment for ${invoice.invoiceNumber}`
          }
        });

        const receipt = await tx.receipt.create({
          data: {
            organizationId,
            branchId,
            invoiceId: invoice.id,
            paymentId: payment.id,
            receiptNumber,
            customerName: invoice.customerName,
            amountPaid: paidAmount,
            paymentMethod,
            remainingBalance: balanceAmount,
            cashierName: userName
          }
        });
      }

      await this.auditService.log({
        organizationId,
        branchId,
        userId,
        userName,
        action: 'INVOICE_CREATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal, paidAmount }
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { lines: true, payments: true, receipts: true, branch: true }
      });
    });

    // Real-time notification broadcast
    this.eventsGateway.emitInvoiceCreated(organizationId, branchId, createdInvoice);

    return createdInvoice;
  }

  async voidInvoice(organizationId: string, id: string, userId: string, userName: string, reason: string) {
    const invoice = await this.findOne(organizationId, id);
    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice is already void or cancelled');
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.VOID, notes: `VOIDED: ${reason}` }
      });

      // Restore inventory
      for (const line of invoice.lines) {
        if (line.productId) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (product) {
            const restoredStock = product.currentStock + line.quantity;
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: restoredStock }
            });

            await tx.stockLedger.create({
              data: {
                organizationId,
                branchId: invoice.branchId,
                productId: product.id,
                variantId: line.variantId,
                eventType: StockEventType.SALE_RETURN,
                quantityChange: line.quantity,
                balanceAfter: restoredStock,
                referenceType: 'INVOICE_VOID',
                referenceId: invoice.id,
                unitCost: product.costPrice,
                notes: `Void of ${invoice.invoiceNumber}: ${reason}`,
                createdById: userId
              }
            });
          }
        }
      }

      // Revert customer outstanding balance if credit was used
      if (invoice.balanceAmount > 0 && invoice.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          const newOutstanding = Math.max(0, customer.currentOutstanding - invoice.balanceAmount);
          await tx.customer.update({
            where: { id: customer.id },
            data: { currentOutstanding: newOutstanding }
          });

          await tx.customerLedger.create({
            data: {
              organizationId,
              customerId: customer.id,
              transactionType: 'RETURN_CREDIT',
              amount: invoice.balanceAmount,
              balanceAfter: newOutstanding,
              referenceId: invoice.id,
              notes: `Void of invoice ${invoice.invoiceNumber}`
            }
          });
        }
      }

      await this.auditService.log({
        organizationId,
        branchId: invoice.branchId,
        userId,
        userName,
        action: 'INVOICE_VOID',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: { invoiceNumber: invoice.invoiceNumber, reason }
      });

      return updated;
    });

    this.eventsGateway.emitPulseUpdate(organizationId, invoice.branchId);
    return voided;
  }
}
