import { TaxMode } from '@aescion/shared-types';

export interface TaxCalculationParams {
  quantity: number;
  unitPrice: number;
  discountRate?: number; // e.g. 10 for 10%
  discountAmount?: number; // e.g. 50 flat
  taxRate: number; // e.g. 18 for 18%
  taxMode: TaxMode;
  isInterState?: boolean;
  cessRate?: number; // e.g. 12%
}

export interface TaxCalculationResult {
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
  lineSubtotal: number;
  lineTotal: number;
  appliedDiscount: number;
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateLineTax(params: TaxCalculationParams): TaxCalculationResult {
  const quantity = Math.max(0, params.quantity);
  const unitPrice = Math.max(0, params.unitPrice);
  const taxRate = Math.max(0, params.taxRate);
  const cessRate = Math.max(0, params.cessRate || 0);
  const isInterState = !!params.isInterState;

  let gross = quantity * unitPrice;

  // Calculate discount
  let discount = 0;
  if (params.discountAmount && params.discountAmount > 0) {
    discount = Math.min(gross, params.discountAmount);
  } else if (params.discountRate && params.discountRate > 0) {
    discount = Math.min(gross, (gross * params.discountRate) / 100);
  }
  discount = roundToTwo(discount);

  let netAfterDiscount = Math.max(0, gross - discount);

  let taxableAmount = 0;
  let totalTax = 0;
  let lineTotal = 0;

  if (params.taxMode === TaxMode.INCLUSIVE) {
    // Price includes tax + cess: Net = Taxable * (1 + (taxRate + cessRate) / 100)
    const combinedRate = taxRate + cessRate;
    taxableAmount = roundToTwo(netAfterDiscount / (1 + combinedRate / 100));
    totalTax = roundToTwo(netAfterDiscount - taxableAmount);
    lineTotal = roundToTwo(netAfterDiscount);
  } else {
    // Exclusive mode: Taxable = Net
    taxableAmount = roundToTwo(netAfterDiscount);
    const taxAmt = (taxableAmount * taxRate) / 100;
    const cessAmt = (taxableAmount * cessRate) / 100;
    totalTax = roundToTwo(taxAmt + cessAmt);
    lineTotal = roundToTwo(taxableAmount + totalTax);
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;
  let cessAmount = roundToTwo((taxableAmount * cessRate) / 100);

  const mainTax = roundToTwo(totalTax - cessAmount);

  if (isInterState) {
    igstRate = taxRate;
    igstAmount = mainTax;
  } else {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
    cgstAmount = roundToTwo(mainTax / 2);
    sgstAmount = roundToTwo(mainTax - cgstAmount); // Avoid 1-cent rounding drift
  }

  return {
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalTax,
    lineSubtotal: taxableAmount,
    lineTotal,
    appliedDiscount: discount
  };
}

export interface InvoiceTotalsCalculation {
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
}

export function computeInvoiceTotals(
  lines: Array<{ lineSubtotal: number; totalTax: number; cgstAmount: number; sgstAmount: number; igstAmount: number; cessAmount: number; appliedDiscount: number; lineTotal: number }>,
  enableRoundOff: boolean = true
): InvoiceTotalsCalculation {
  let subtotal = 0;
  let discountTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;
  let taxTotal = 0;
  let rawGrandTotal = 0;

  for (const line of lines) {
    subtotal += line.lineSubtotal;
    discountTotal += line.appliedDiscount;
    cgstTotal += line.cgstAmount;
    sgstTotal += line.sgstAmount;
    igstTotal += line.igstAmount;
    cessTotal += line.cessAmount;
    taxTotal += line.totalTax;
    rawGrandTotal += line.lineTotal;
  }

  subtotal = roundToTwo(subtotal);
  discountTotal = roundToTwo(discountTotal);
  cgstTotal = roundToTwo(cgstTotal);
  sgstTotal = roundToTwo(sgstTotal);
  igstTotal = roundToTwo(igstTotal);
  cessTotal = roundToTwo(cessTotal);
  taxTotal = roundToTwo(taxTotal);
  rawGrandTotal = roundToTwo(rawGrandTotal);

  let grandTotal = rawGrandTotal;
  let roundOff = 0;

  if (enableRoundOff) {
    grandTotal = Math.round(rawGrandTotal);
    roundOff = roundToTwo(grandTotal - rawGrandTotal);
  }

  return {
    subtotal,
    discountTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    cessTotal,
    taxTotal,
    roundOff,
    grandTotal
  };
}
