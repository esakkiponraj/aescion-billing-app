import { StockEventType } from './enums';

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  name: string; // e.g. "Size: L, Color: Blue"
  costPrice: number;
  sellingPrice: number;
  mrp?: number;
  attributes: Record<string, string>;
  currentStock: number;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  mrp?: number;
  taxRate: number;
  hsn?: string;
  isBatchTracked: boolean;
  isWeightBased: boolean;
  hasVariants: boolean;
  minStockAlert: number;
  currentStock: number;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StockLedgerEntry {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  eventType: StockEventType;
  quantityChange: number;
  balanceAfter: number;
  referenceType?: string; // INVOICE, GRN, TRANSFER, ADJUSTMENT
  referenceId?: string;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
  createdById: string;
  createdAt: Date;
}

export interface InventoryBalance {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  updatedAt: Date;
}
