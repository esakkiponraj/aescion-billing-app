import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@aescion/shared-types';
import { formatDocumentNumber } from '@aescion/shared-utils';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async findPayments(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    return this.prisma.payment.findMany({
      where,
      include: { invoice: true, receipts: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findReceipts(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    return this.prisma.receipt.findMany({
      where,
      include: { invoice: true, payment: true },
      orderBy: { issuedAt: 'desc' }
    });
  }

  async collectPayment(organizationId: string, branchId: string, userId: string, userName: string, data: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
  }) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: data.invoiceId, organizationId },
      include: { branch: true }
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.balanceAmount <= 0) throw new BadRequestException('Invoice is already fully paid');

    const amountToPay = Math.min(invoice.balanceAmount, data.amount);
    const newBalance = Math.max(0, Math.round((invoice.balanceAmount - amountToPay) * 100) / 100);
    const newPaidAmount = Math.round((invoice.paidAmount + amountToPay) * 100) / 100;
    const newStatus = newBalance === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const docSettings = await this.prisma.documentSettings.findUnique({ where: { organizationId } });

    return this.prisma.$transaction(async (tx) => {
      // 1. Update invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus
        }
      });

      // 2. Create Payment
      const paymentCount = await tx.payment.count({ where: { organizationId } });
      const receiptNumber = formatDocumentNumber(docSettings?.receiptPrefix || 'RCP', paymentCount + 1, invoice.branch.code);

      const payment = await tx.payment.create({
        data: {
          organizationId,
          branchId,
          invoiceId: invoice.id,
          receiptNumber,
          amount: amountToPay,
          method: data.method,
          status: PaymentStatus.COMPLETED,
          referenceNumber: data.referenceNumber,
          receivedById: userId,
          notes: data.notes || `Collection for ${invoice.invoiceNumber}`
        }
      });

      // 3. Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          organizationId,
          branchId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          receiptNumber,
          customerName: invoice.customerName,
          amountPaid: amountToPay,
          paymentMethod: data.method,
          remainingBalance: newBalance,
          cashierName: userName
        }
      });

      // 4. Update Customer Ledger if linked
      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          const newOutstanding = Math.max(0, customer.currentOutstanding - amountToPay);
          await tx.customer.update({
            where: { id: customer.id },
            data: { currentOutstanding: newOutstanding }
          });

          await tx.customerLedger.create({
            data: {
              organizationId,
              customerId: customer.id,
              transactionType: 'PAYMENT_CREDIT',
              amount: amountToPay,
              balanceAfter: newOutstanding,
              referenceId: payment.id,
              notes: `Payment for ${invoice.invoiceNumber}`
            }
          });
        }
      }

      await this.auditService.log({
        organizationId,
        branchId,
        userId,
        userName,
        action: 'PAYMENT_COLLECTED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: { receiptNumber, amount: amountToPay, invoiceNumber: invoice.invoiceNumber }
      });

      return { payment, receipt, invoice: { ...invoice, balanceAmount: newBalance, paidAmount: newPaidAmount, status: newStatus } };
    });
  }

  async getReceiptForReprint(organizationId: string, receiptId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, organizationId },
      include: { invoice: { include: { lines: true, branch: true } }, payment: true }
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }
}
