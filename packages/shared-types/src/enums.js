"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerType = exports.TaxMode = exports.SyncState = exports.ServiceJobStatus = exports.KitchenStatus = exports.RestaurantTableStatus = exports.ShiftStatus = exports.StockEventType = exports.PaymentStatus = exports.PaymentMethod = exports.InvoiceStatus = exports.QuotationStatus = exports.RoleType = exports.BusinessType = void 0;
var BusinessType;
(function (BusinessType) {
    BusinessType["RETAIL"] = "RETAIL";
    BusinessType["SUPERMARKET"] = "SUPERMARKET";
    BusinessType["WHOLESALE"] = "WHOLESALE";
    BusinessType["RESTAURANT"] = "RESTAURANT";
    BusinessType["SERVICE"] = "SERVICE";
    BusinessType["PHARMACY"] = "PHARMACY";
})(BusinessType || (exports.BusinessType = BusinessType = {}));
var RoleType;
(function (RoleType) {
    RoleType["OWNER"] = "OWNER";
    RoleType["MANAGER"] = "MANAGER";
    RoleType["CASHIER"] = "CASHIER";
    RoleType["ACCOUNTANT"] = "ACCOUNTANT";
    RoleType["INVENTORY_STAFF"] = "INVENTORY_STAFF";
    RoleType["TECHNICIAN"] = "TECHNICIAN";
    RoleType["SUPER_ADMIN"] = "SUPER_ADMIN";
    RoleType["CUSTOM"] = "CUSTOM";
})(RoleType || (exports.RoleType = RoleType = {}));
var QuotationStatus;
(function (QuotationStatus) {
    QuotationStatus["DRAFT"] = "DRAFT";
    QuotationStatus["SENT"] = "SENT";
    QuotationStatus["ACCEPTED"] = "ACCEPTED";
    QuotationStatus["REJECTED"] = "REJECTED";
    QuotationStatus["CONVERTED"] = "CONVERTED";
})(QuotationStatus || (exports.QuotationStatus = QuotationStatus = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["ISSUED"] = "ISSUED";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
    InvoiceStatus["VOID"] = "VOID";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CUSTOMER_CREDIT"] = "CUSTOMER_CREDIT";
    PaymentMethod["SPLIT"] = "SPLIT";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var StockEventType;
(function (StockEventType) {
    StockEventType["PURCHASE_RECEIPT"] = "PURCHASE_RECEIPT";
    StockEventType["SALE"] = "SALE";
    StockEventType["SALE_RETURN"] = "SALE_RETURN";
    StockEventType["PURCHASE_RETURN"] = "PURCHASE_RETURN";
    StockEventType["BRANCH_TRANSFER_OUT"] = "BRANCH_TRANSFER_OUT";
    StockEventType["BRANCH_TRANSFER_IN"] = "BRANCH_TRANSFER_IN";
    StockEventType["ADJUSTMENT"] = "ADJUSTMENT";
    StockEventType["DAMAGE"] = "DAMAGE";
    StockEventType["WASTAGE"] = "WASTAGE";
    StockEventType["RECIPE_CONSUMPTION"] = "RECIPE_CONSUMPTION";
})(StockEventType || (exports.StockEventType = StockEventType = {}));
var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["OPEN"] = "OPEN";
    ShiftStatus["CLOSED"] = "CLOSED";
})(ShiftStatus || (exports.ShiftStatus = ShiftStatus = {}));
var RestaurantTableStatus;
(function (RestaurantTableStatus) {
    RestaurantTableStatus["AVAILABLE"] = "AVAILABLE";
    RestaurantTableStatus["OCCUPIED"] = "OCCUPIED";
    RestaurantTableStatus["KOT_SENT"] = "KOT_SENT";
    RestaurantTableStatus["PREPARING"] = "PREPARING";
    RestaurantTableStatus["READY"] = "READY";
    RestaurantTableStatus["BILLED"] = "BILLED";
    RestaurantTableStatus["PAID"] = "PAID";
})(RestaurantTableStatus || (exports.RestaurantTableStatus = RestaurantTableStatus = {}));
var KitchenStatus;
(function (KitchenStatus) {
    KitchenStatus["NEW"] = "NEW";
    KitchenStatus["PREPARING"] = "PREPARING";
    KitchenStatus["READY"] = "READY";
    KitchenStatus["SERVED"] = "SERVED";
    KitchenStatus["CANCELLED"] = "CANCELLED";
})(KitchenStatus || (exports.KitchenStatus = KitchenStatus = {}));
var ServiceJobStatus;
(function (ServiceJobStatus) {
    ServiceJobStatus["RECEIVED"] = "RECEIVED";
    ServiceJobStatus["INSPECTION"] = "INSPECTION";
    ServiceJobStatus["WAITING_APPROVAL"] = "WAITING_APPROVAL";
    ServiceJobStatus["APPROVED"] = "APPROVED";
    ServiceJobStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ServiceJobStatus["WAITING_PART"] = "WAITING_PART";
    ServiceJobStatus["READY"] = "READY";
    ServiceJobStatus["COMPLETED"] = "COMPLETED";
    ServiceJobStatus["DELIVERED"] = "DELIVERED";
    ServiceJobStatus["CANCELLED"] = "CANCELLED";
})(ServiceJobStatus || (exports.ServiceJobStatus = ServiceJobStatus = {}));
var SyncState;
(function (SyncState) {
    SyncState["PENDING"] = "PENDING";
    SyncState["SYNCING"] = "SYNCING";
    SyncState["SYNCED"] = "SYNCED";
    SyncState["CONFLICT"] = "CONFLICT";
    SyncState["FAILED"] = "FAILED";
})(SyncState || (exports.SyncState = SyncState = {}));
var TaxMode;
(function (TaxMode) {
    TaxMode["INCLUSIVE"] = "INCLUSIVE";
    TaxMode["EXCLUSIVE"] = "EXCLUSIVE";
})(TaxMode || (exports.TaxMode = TaxMode = {}));
var CustomerType;
(function (CustomerType) {
    CustomerType["B2C"] = "B2C";
    CustomerType["B2B"] = "B2B";
})(CustomerType || (exports.CustomerType = CustomerType = {}));
//# sourceMappingURL=enums.js.map