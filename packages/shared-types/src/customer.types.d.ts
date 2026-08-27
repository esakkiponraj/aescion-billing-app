export interface Customer {
    id: string;
    organizationId: string;
    name: string;
    phone: string;
    email?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    creditLimit: number;
    currentOutstanding: number;
    loyaltyPoints: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CustomerLedgerEntry {
    id: string;
    organizationId: string;
    customerId: string;
    transactionType: 'INVOICE_DEBIT' | 'PAYMENT_CREDIT' | 'RETURN_CREDIT' | 'ADJUSTMENT';
    amount: number;
    balanceAfter: number;
    referenceId?: string;
    notes?: string;
    createdAt: Date;
}
export interface CreditAgeingSummary {
    customerId: string;
    customerName: string;
    totalOutstanding: number;
    current0to30: number;
    days31to60: number;
    days61to90: number;
    daysAbove90: number;
}
export interface Supplier {
    id: string;
    organizationId: string;
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    gstin?: string;
    address?: string;
    currentPayable: number;
    createdAt: Date;
}
export interface PurchaseOrderItem {
    productId: string;
    name: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    taxRate: number;
    total: number;
}
export interface PurchaseOrder {
    id: string;
    organizationId: string;
    branchId: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
    items: PurchaseOrderItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    expectedDate?: Date;
    createdById: string;
    createdAt: Date;
}
//# sourceMappingURL=customer.types.d.ts.map