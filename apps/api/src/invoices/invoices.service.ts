import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateInvoiceInput } from '@aescion/validation';
import { calculateLineTax, computeInvoiceTotals, formatDocumentNumber, generateIdempotencyKey } from '@aescion/shared-utils';
import { InvoiceStatus, PaymentMethod, PaymentStatus, StockEventType, TaxMode } from '@aescion/shared-types';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async findAll(organizationId: string, branchId?: string, status?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
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
        receipts: true
      },
      orderBy: { createdAt: 'desc' }
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
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(organizationId: string, branchId: string, userId: string, userName: string, dto: CreateInvoiceInput) {
    // 1. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.invoice.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { lines: true, payments: true, receipts: true }
      });
      if (existing) {
        return existing; // Return existing without duplicate processing
      }
    }

    // 2. Fetch Organization Settings & Branch
    const [org, docSettings, branch] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.documentSettings.findUnique({ where: { organizationId } }),
      this.prisma.branch.findUnique({ where: { id: branchId } })
    ]);

    if (!branch) throw new BadRequestException('Invalid branch specified');

    // 3. Authoritative Line Calculation & Medicine Expiry Guard
    const calculatedLines: any[] = [];
    for (const item of dto.lines) {
      // If batch is provided, check if it is expired
      if (item.batchNumber && item.productId) {
        const batch = await this.prisma.medicineBatch.findFirst({
          where: {
            organizationId,
            medicineId: item.productId,
            batchNumber: item.batchNumber
          }
        });
        if (batch && (batch.isExpired || new Date(batch.expiryDate).getTime() < Date.now())) {
          throw new ForbiddenException(`SAFETY BLOCK: Medicine batch ${item.batchNumber} is expired and cannot be billed.`);
        }
      }

      const lineCalc = calculateLineTax({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate,
        taxMode: item.taxMode || TaxMode.EXCLUSIVE,
        isInterState: dto.isInterState
      });

      calculatedLines.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unit || 'PCS',
        unitPrice: item.unitPrice,
        discountRate: item.discountRate || 0,
        discountAmount: lineCalc.appliedDiscount,
        taxRate: item.taxRate,
        taxMode: item.taxMode || 'EXCLUSIVE',
        taxableAmount: lineCalc.taxableAmount,
        cgstAmount: lineCalc.cgstAmount,
        sgstAmount: lineCalc.sgstAmount,
        igstAmount: lineCalc.igstAmount,
        cessAmount: lineCalc.cessAmount,
        totalTax: lineCalc.totalTax,
        lineSubtotal: lineCalc.lineSubtotal,
        lineTotal: lineCalc.lineTotal,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        notes: item.notes
      });
    }

    // 4. Compute Invoice Totals
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
      })),
      docSettings?.enableRoundOff ?? true
    );

    // 5. Payment details
    let paidAmount = 0;
    let paymentMethod: PaymentMethod = PaymentMethod.CASH;
    let paymentRef = '';
    let splitDetails: any = null;

    if (dto.payment) {
      paidAmount = Math.min(totals.grandTotal, dto.payment.amount);
      paymentMethod = dto.payment.method;
      paymentRef = dto.payment.referenceNumber || '';
      splitDetails = dto.payment.splitDetails || null;
    }

    const balanceAmount = Math.max(0, Math.round((totals.grandTotal - paidAmount) * 100) / 100);
    const invoiceStatus = balanceAmount === 0 ? InvoiceStatus.PAID : paidAmount > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;

    // Customer Credit Check
    if (balanceAmount > 0 && dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (customer && customer.creditLimit > 0) {
        if (customer.currentOutstanding + balanceAmount > customer.creditLimit) {
          throw new ForbiddenException(`Customer credit limit exceeded. Max available: ₹${(customer.creditLimit - customer.currentOutstanding).toFixed(2)}`);
        }
      }
    }

    // 6. Execute atomic transaction
    return this.prisma.$transaction(async (tx) => {
      // Generate sequential invoice number
      const invoiceCount = await tx.invoice.count({ where: { organizationId } });
      const invoiceNumber = formatDocumentNumber(docSettings?.invoicePrefix || 'INV', invoiceCount + 1, branch.code);

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          branchId,
          registerId: dto.registerId,
          invoiceNumber,
          customerId: dto.customerId,
          customerName: dto.customerName || 'Walk-in Customer',
          customerPhone: dto.customerPhone,
          customerGstin: dto.customerGstin,
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
          createdById: userId,
          idempotencyKey: dto.idempotencyKey || generateIdempotencyKey('inv'),
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
                await tx.medicineBatch.update({
                  where: { id: batch.id },
                  data: { quantityRemaining: Math.max(0, batch.quantityRemaining - line.quantity) }
                });
              }
            }
          }
        }
      }

      // Customer Ledger debit if credit balance exists
      if (balanceAmount > 0 && dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (customer) {
          const newOutstanding = customer.currentOutstanding + balanceAmount;
          await tx.customer.update({
            where: { id: customer.id },
            data: { currentOutstanding: newOutstanding }
          });

          await tx.customerLedger.create({
            data: {
              organizationId,
              customerId: customer.id,
              transactionType: 'INVOICE_DEBIT',
              amount: balanceAmount,
              balanceAfter: newOutstanding,
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
  }

  async voidInvoice(organizationId: string, id: string, userId: string, userName: string, reason: string) {
    const invoice = await this.findOne(organizationId, id);
    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice is already void or cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.VOID, notes: `VOIDED: ${reason}` }
      });

      // Restore stock
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

      // Reverse Customer Credit if applicable
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
              notes: `Reversal for voided invoice ${invoice.invoiceNumber}`
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
        details: { reason }
      });

      return updated;
    });
  }
}
