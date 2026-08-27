import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SyncBatchRequest, SyncBatchResponse, SyncState } from '@aescion/shared-types';
import { InvoiceService } from '../invoices/invoices.service';
import { PaymentService } from '../payments/payments.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService
  ) {}

  async processSyncBatch(
    organizationId: string,
    branchId: string,
    userId: string,
    userName: string,
    dto: SyncBatchRequest
  ): Promise<SyncBatchResponse> {
    const processedMutations: any[] = [];

    for (const mutation of dto.mutations || []) {
      const existing = await this.prisma.syncMutation.findUnique({
        where: { id: mutation.id }
      });

      if (existing) {
        // Already processed earlier
        processedMutations.push({
          clientTransactionId: mutation.id,
          status: existing.syncState,
          serverAssignedId: existing.serverAssignedId || undefined,
          serverAssignedNumber: existing.serverAssignedNumber || undefined
        });
        continue;
      }

      try {
        let serverAssignedId: string | undefined;
        let serverAssignedNumber: string | undefined;

        if (mutation.entityType === 'INVOICE' && mutation.operation === 'CREATE') {
          const lines = mutation.payload.lines || (mutation.payload.items?.map((i: any) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            hsn: i.hsn,
            discount: i.discount || 0
          }))) || [];

          const invoice = await this.invoiceService.create(organizationId, branchId, userId, userName, {
            ...mutation.payload,
            lines,
            idempotencyKey: mutation.id
          });
          if (invoice) {
            serverAssignedId = invoice.id;
            serverAssignedNumber = invoice.invoiceNumber;
          }
        } else if (mutation.entityType === 'PAYMENT' && mutation.operation === 'CREATE') {
          const res = await this.paymentService.collectPayment(organizationId, branchId, userId, userName, mutation.payload);
          serverAssignedId = res.payment.id;
          serverAssignedNumber = res.receipt.receiptNumber;
        }

        // Record mutation
        await this.prisma.syncMutation.create({
          data: {
            id: mutation.id,
            organizationId,
            branchId,
            entityType: mutation.entityType,
            operation: mutation.operation,
            payload: mutation.payload || {},
            clientTimestamp: BigInt(mutation.clientTimestamp || Date.now()),
            syncState: SyncState.SYNCED,
            serverAssignedId,
            serverAssignedNumber
          }
        });

        processedMutations.push({
          clientTransactionId: mutation.id,
          status: 'SYNCED',
          serverAssignedId,
          serverAssignedNumber
        });
      } catch (err: any) {
        await this.prisma.syncMutation.create({
          data: {
            id: mutation.id,
            organizationId,
            branchId,
            entityType: mutation.entityType,
            operation: mutation.operation,
            payload: mutation.payload || {},
            clientTimestamp: BigInt(mutation.clientTimestamp || Date.now()),
            syncState: SyncState.FAILED,
            errorMessage: err.message
          }
        });

        processedMutations.push({
          clientTransactionId: mutation.id,
          status: 'FAILED',
          error: err.message
        });
      }
    }

    // Return latest server state
    const products = await this.prisma.product.findMany({ where: { organizationId } });
    const customers = await this.prisma.customer.findMany({ where: { organizationId } });

    return {
      success: true,
      serverTimestamp: Date.now(),
      processedMutations,
      serverChanges: {
        products,
        customers
      }
    };
  }
}
