export declare enum BusinessType {
    RETAIL = "RETAIL",
    SUPERMARKET = "SUPERMARKET",
    WHOLESALE = "WHOLESALE",
    RESTAURANT = "RESTAURANT",
    SERVICE = "SERVICE",
    PHARMACY = "PHARMACY"
}
export declare enum RoleType {
    OWNER = "OWNER",
    MANAGER = "MANAGER",
    CASHIER = "CASHIER",
    ACCOUNTANT = "ACCOUNTANT",
    INVENTORY_STAFF = "INVENTORY_STAFF",
    TECHNICIAN = "TECHNICIAN",
    SUPER_ADMIN = "SUPER_ADMIN",
    CUSTOM = "CUSTOM"
}
export declare enum QuotationStatus {
    DRAFT = "DRAFT",
    SENT = "SENT",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    CONVERTED = "CONVERTED"
}
export declare enum InvoiceStatus {
    DRAFT = "DRAFT",
    ISSUED = "ISSUED",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
    VOID = "VOID"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    UPI = "UPI",
    CARD = "CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    CUSTOMER_CREDIT = "CUSTOMER_CREDIT",
    SPLIT = "SPLIT"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
    CANCELLED = "CANCELLED"
}
export declare enum StockEventType {
    PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
    SALE = "SALE",
    SALE_RETURN = "SALE_RETURN",
    PURCHASE_RETURN = "PURCHASE_RETURN",
    BRANCH_TRANSFER_OUT = "BRANCH_TRANSFER_OUT",
    BRANCH_TRANSFER_IN = "BRANCH_TRANSFER_IN",
    ADJUSTMENT = "ADJUSTMENT",
    DAMAGE = "DAMAGE",
    WASTAGE = "WASTAGE",
    RECIPE_CONSUMPTION = "RECIPE_CONSUMPTION"
}
export declare enum ShiftStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED"
}
export declare enum RestaurantTableStatus {
    AVAILABLE = "AVAILABLE",
    OCCUPIED = "OCCUPIED",
    KOT_SENT = "KOT_SENT",
    PREPARING = "PREPARING",
    READY = "READY",
    BILLED = "BILLED",
    PAID = "PAID"
}
export declare enum KitchenStatus {
    NEW = "NEW",
    PREPARING = "PREPARING",
    READY = "READY",
    SERVED = "SERVED",
    CANCELLED = "CANCELLED"
}
export declare enum ServiceJobStatus {
    RECEIVED = "RECEIVED",
    INSPECTION = "INSPECTION",
    WAITING_APPROVAL = "WAITING_APPROVAL",
    APPROVED = "APPROVED",
    IN_PROGRESS = "IN_PROGRESS",
    WAITING_PART = "WAITING_PART",
    READY = "READY",
    COMPLETED = "COMPLETED",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED"
}
export declare enum SyncState {
    PENDING = "PENDING",
    SYNCING = "SYNCING",
    SYNCED = "SYNCED",
    CONFLICT = "CONFLICT",
    FAILED = "FAILED"
}
export declare enum TaxMode {
    INCLUSIVE = "INCLUSIVE",
    EXCLUSIVE = "EXCLUSIVE"
}
export declare enum CustomerType {
    B2C = "B2C",
    B2B = "B2B"
}
//# sourceMappingURL=enums.d.ts.map