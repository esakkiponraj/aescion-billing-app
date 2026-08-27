import { z } from 'zod';
import { PaymentMethod, TaxMode } from '@aescion/shared-types';

export const InvoiceLineItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  hsn: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('PCS'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  discountRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  taxRate: z.number().min(0).default(0),
  taxMode: z.nativeEnum(TaxMode).default(TaxMode.EXCLUSIVE),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional()
});

export const CreateInvoiceSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  registerId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().default('Walk-in Customer'),
  customerPhone: z.string().optional(),
  customerGstin: z.string().optional(),
  isB2B: z.boolean().default(false),
  isInterState: z.boolean().default(false),
  lines: z.array(InvoiceLineItemSchema).min(1, 'Invoice must contain at least one line item'),
  idempotencyKey: z.string().optional(),
  payment: z
    .object({
      method: z.nativeEnum(PaymentMethod),
      amount: z.number().min(0),
      referenceNumber: z.string().optional(),
      splitDetails: z
        .array(
          z.object({
            method: z.nativeEnum(PaymentMethod),
            amount: z.number().positive(),
            reference: z.string().optional()
          })
        )
        .optional()
    })
    .optional()
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().default('PCS'),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  mrp: z.number().optional(),
  taxRate: z.number().min(0).default(0),
  hsn: z.string().optional(),
  isBatchTracked: z.boolean().default(false),
  isWeightBased: z.boolean().default(false),
  minStockAlert: z.number().default(5),
  initialStock: z.number().default(0)
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
