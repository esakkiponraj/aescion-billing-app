import { InvoiceStatus, PaymentMethod, PaymentStatus, QuotationStatus, TaxMode } from './enums';
export interface TaxBreakdown {
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    cessRate: number;
    cessAmount: number;
    totalTax: number;
}
export interface InvoiceLineItem {
    id?: string;
    productId?: string;
    variantId?: string;
    name: string;
    sku?: string;
    hsn?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discountRate?: number;
    discountAmount?: number;
    taxRate: number;
    taxMode: TaxMode;
    taxBreakdown: TaxBreakdown;
    lineSubtotal: number;
    lineTotal: number;
    batchNumber?: string;
    expiryDate?: Date | string;
    notes?: string;
}
export interface Invoice {
    id: string;
    organizationId: string;
    branchId: string;
    registerId?: string;
    invoiceNumber: string;
    quotationId?: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerGstin?: string;
    isB2B: boolean;
    isInterState: boolean;
    status: InvoiceStatus;
    lines: InvoiceLineItem[];
    subtotal: number;
    discountTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    cessTotal: number;
    taxTotal: number;
    roundOff: number;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
    notes?: string;
    createdById: string;
    idempotencyKey?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface QuotationLineItem {
    productId?: string;
    name: string;
    hsn?: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate: number;
    lineTotal: number;
}
export interface Quotation {
    id: string;
    organizationId: string;
    branchId: string;
    quotationNumber: string;
    customerId?: string;
    customerName: string;
    status: QuotationStatus;
    lines: QuotationLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    validUntil?: Date;
    createdById: string;
    createdAt: Date;
}
export interface SplitPaymentDetail {
    method: PaymentMethod;
    amount: number;
    reference?: string;
}
export interface Payment {
    id: string;
    organizationId: string;
    branchId: string;
    invoiceId: string;
    receiptNumber: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    splitDetails?: SplitPaymentDetail[];
    referenceNumber?: string;
    receivedById: string;
    notes?: string;
    createdAt: Date;
}
export interface Receipt {
    id: string;
    organizationId: string;
    branchId: string;
    invoiceId: string;
    paymentId: string;
    receiptNumber: string;
    customerName: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    remainingBalance: number;
    cashierName: string;
    issuedAt: Date;
}
//# sourceMappingURL=billing.types.d.ts.map