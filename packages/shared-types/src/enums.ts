export const BusinessType = {
  RETAIL: 'RETAIL',
  SUPERMARKET: 'SUPERMARKET',
  WHOLESALE: 'WHOLESALE',
  RESTAURANT: 'RESTAURANT',
  SERVICE: 'SERVICE',
  PHARMACY: 'PHARMACY'
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

export const RoleType = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  ACCOUNTANT: 'ACCOUNTANT',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
  TECHNICIAN: 'TECHNICIAN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CUSTOM: 'CUSTOM'
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const QuotationStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CONVERTED: 'CONVERTED'
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  VOID: 'VOID'
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CUSTOMER_CREDIT: 'CUSTOMER_CREDIT',
  SPLIT: 'SPLIT'
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const StockEventType = {
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  SALE: 'SALE',
  SALE_RETURN: 'SALE_RETURN',
  PURCHASE_RETURN: 'PURCHASE_RETURN',
  BRANCH_TRANSFER_OUT: 'BRANCH_TRANSFER_OUT',
  BRANCH_TRANSFER_IN: 'BRANCH_TRANSFER_IN',
  ADJUSTMENT: 'ADJUSTMENT',
  DAMAGE: 'DAMAGE',
  WASTAGE: 'WASTAGE',
  RECIPE_CONSUMPTION: 'RECIPE_CONSUMPTION'
} as const;
export type StockEventType = (typeof StockEventType)[keyof typeof StockEventType];

export const ShiftStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

export const RestaurantTableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  KOT_SENT: 'KOT_SENT',
  PREPARING: 'PREPARING',
  READY: 'READY',
  BILLED: 'BILLED',
  PAID: 'PAID'
} as const;
export type RestaurantTableStatus = (typeof RestaurantTableStatus)[keyof typeof RestaurantTableStatus];

export const KitchenStatus = {
  NEW: 'NEW',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  CANCELLED: 'CANCELLED'
} as const;
export type KitchenStatus = (typeof KitchenStatus)[keyof typeof KitchenStatus];

export const ServiceJobStatus = {
  RECEIVED: 'RECEIVED',
  INSPECTION: 'INSPECTION',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_PART: 'WAITING_PART',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as const;
export type ServiceJobStatus = (typeof ServiceJobStatus)[keyof typeof ServiceJobStatus];

export const SyncState = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  CONFLICT: 'CONFLICT',
  FAILED: 'FAILED'
} as const;
export type SyncState = (typeof SyncState)[keyof typeof SyncState];

export const TaxMode = {
  INCLUSIVE: 'INCLUSIVE',
  EXCLUSIVE: 'EXCLUSIVE'
} as const;
export type TaxMode = (typeof TaxMode)[keyof typeof TaxMode];

export const CustomerType = {
  B2C: 'B2C',
  B2B: 'B2B'
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];
