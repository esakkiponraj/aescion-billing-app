import { KitchenStatus, RestaurantTableStatus, ServiceJobStatus } from './enums';

// 1. Restaurant / Cafe
export interface RestaurantTable {
  id: string;
  organizationId: string;
  branchId: string;
  tableNumber: string;
  capacity: number;
  section: string; // e.g. "Ground Floor", "AC Hall", "Balcony", "Outdoor"
  status: RestaurantTableStatus;
  activeOrderId?: string;
  isActive: boolean;
}

export interface KOTItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  status: KitchenStatus;
}

export interface KOTTicket {
  id: string;
  organizationId: string;
  branchId: string;
  kotNumber: string;
  tableNumber: string;
  orderId: string;
  items: KOTItem[];
  waiterName?: string;
  createdAt: Date;
  status: KitchenStatus;
}

// 2. Service / Repair
export interface CustomerAsset {
  id: string;
  organizationId: string;
  customerId: string;
  assetType: string; // "Mobile", "Laptop", "AC", "Car", "General"
  brand: string;
  model: string;
  serialNumber?: string;
  imeiNumber?: string;
  vehicleNumber?: string;
  conditionNotes?: string;
}

export interface ServiceJobCard {
  id: string;
  organizationId: string;
  branchId: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  asset: CustomerAsset;
  complaint: string;
  inspectionNotes?: string;
  status: ServiceJobStatus;
  technicianId?: string;
  technicianName?: string;
  estimatedAmount: number;
  approvedAmount?: number;
  advancePaid: number;
  partsUsed: Array<{ name: string; quantity: number; cost: number; sellingPrice: number }>;
  labourCharges: number;
  finalInvoiceId?: string;
  deliveryDate?: Date;
  createdAt: Date;
}

// 3. Pharmacy
export interface MedicineMaster {
  id: string;
  organizationId: string;
  name: string;
  genericName: string;
  manufacturer: string;
  dosageForm: string; // Tablet, Syrup, Capsule, Injection
  hsn: string;
  taxRate: number;
  mrp: number;
  currentStock: number;
}

export interface MedicineBatch {
  id: string;
  organizationId: string;
  branchId: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  manufacturingDate: Date;
  expiryDate: Date;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  quantityRemaining: number;
  isExpired: boolean;
  daysToExpiry: number;
}

// 4. Wholesale
export interface WholesaleSalesOrder {
  id: string;
  organizationId: string;
  branchId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  salesmanName?: string;
  status: 'ORDER_PLACED' | 'STOCK_ALLOCATED' | 'DISPATCHED' | 'INVOICED' | 'CANCELLED';
  totalAmount: number;
  dispatchDetails?: {
    dispatchDate: Date;
    vehicleNo: string;
    transporterName: string;
    challanNumber: string;
  };
  createdAt: Date;
}
