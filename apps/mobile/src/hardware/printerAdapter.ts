export type ReceiptFormat = '58MM' | '80MM' | 'A4';

export interface PrintableReceipt {
  companyName: string;
  legalName?: string;
  branchName: string;
  address?: string;
  gstin?: string;
  phone?: string;
  invoiceNumber: string;
  receiptNumber?: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
  subtotal: number;
  taxTotal: number;
  discountTotal?: number;
  grandTotal: number;
  paymentMethod: string;
  tenderedAmount?: number;
  changeDue?: number;
  cashierName: string;
}

export interface PrintableKOT {
  kotNumber: string;
  tableNumber: string;
  floorSection?: string;
  waiterName?: string;
  timestamp: string;
  isDelta: boolean;
  items: Array<{
    name: string;
    quantity: number;
    variant?: string;
    specialNotes?: string;
  }>;
}

export interface IPrinterAdapter {
  name: string;
  connect(target?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  printReceipt(receipt: PrintableReceipt, format?: ReceiptFormat): Promise<boolean>;
  printKOT(kot: PrintableKOT): Promise<boolean>;
  isConnected(): boolean;
}

export class MockPrinterAdapter implements IPrinterAdapter {
  name = 'Virtual POS Thermal Printer (ESC/POS Simulator)';
  private connected = true;

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async printReceipt(receipt: PrintableReceipt, format: ReceiptFormat = '80MM'): Promise<boolean> {
    const width = format === '58MM' ? 32 : 42;
    const separator = '-'.repeat(width);

    console.log('\n========================================');
    console.log(`🖨️ [MOCK PRINTER - ${format}] THERMAL ESC/POS`);
    console.log('========================================');
    console.log(`  ${receipt.companyName.toUpperCase()}`);
    console.log(`  Branch: ${receipt.branchName}`);
    if (receipt.gstin) console.log(`  GSTIN: ${receipt.gstin}`);
    console.log(separator);
    console.log(`Bill No: ${receipt.invoiceNumber}`);
    console.log(`Date:    ${receipt.date}`);
    console.log(`Cashier: ${receipt.cashierName}`);
    console.log(separator);
    receipt.items.forEach((item) => {
      console.log(`${item.name.substring(0, 20)}`);
      console.log(`  ${item.quantity} x ₹${item.unitPrice.toFixed(2)} = ₹${item.total.toFixed(2)}`);
    });
    console.log(separator);
    console.log(`Subtotal:    ₹${receipt.subtotal.toFixed(2)}`);
    console.log(`GST Tax:     ₹${receipt.taxTotal.toFixed(2)}`);
    console.log(`Grand Total: ₹${receipt.grandTotal.toFixed(2)}`);
    console.log(`Payment:     ${receipt.paymentMethod}`);
    console.log(separator);
    console.log('       THANK YOU VISIT AGAIN');
    console.log('========================================\n');
    return true;
  }

  async printKOT(kot: PrintableKOT): Promise<boolean> {
    console.log('\n========================================');
    console.log(`🍳 [KITCHEN PRINTER] KOT #${kot.kotNumber}`);
    console.log(`Table: ${kot.tableNumber} | Waiter: ${kot.waiterName || 'Staff'}`);
    console.log(`Time: ${kot.timestamp} ${kot.isDelta ? '[ADDITIONAL ITEMS]' : ''}`);
    console.log('----------------------------------------');
    kot.items.forEach((item) => {
      console.log(` [ ] ${item.quantity}x ${item.name} ${item.variant ? `(${item.variant})` : ''}`);
      if (item.specialNotes) console.log(`     Note: ${item.specialNotes}`);
    });
    console.log('========================================\n');
    return true;
  }
}

export const defaultPrinter = new MockPrinterAdapter();
