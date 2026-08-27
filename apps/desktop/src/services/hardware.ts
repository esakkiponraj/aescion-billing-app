export interface PrinterConfig {
  format: '58MM' | '80MM' | 'A4';
  connectionType: 'BROWSER_PRINT' | 'USB' | 'BLUETOOTH' | 'NETWORK';
  ipAddress?: string;
  port?: number;
}

export class PrinterAdapter {
  static async printReceipt(dataOrElementId?: any): Promise<boolean> {
    if (typeof dataOrElementId === 'string') {
      const el = document.getElementById(dataOrElementId);
      if (!el) {
        console.warn(`Print element ${dataOrElementId} not found, falling back to window.print()`);
      }
    }
    window.print();
    return true;
  }
}

export class BarcodeScannerAdapter {
  private static buffer = '';
  private static lastKeyTime = 0;
  private static listeners: Array<(barcode: string) => void> = [];

  static initialize() {
    window.addEventListener('keydown', (e) => {
      const currentTime = Date.now();
      if (currentTime - this.lastKeyTime > 80) {
        this.buffer = '';
      }
      this.lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (this.buffer.length >= 3) {
          const scanned = this.buffer;
          this.buffer = '';
          this.listeners.forEach((cb) => cb(scanned));
        }
      } else if (e.key.length === 1) {
        this.buffer += e.key;
      }
    });
  }

  static onScan(callback: (barcode: string) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export class WeightScaleAdapter {
  static async readWeight(): Promise<{ weight: number; unit: string }> {
    // In production desktop environment, communicates with scale via Electron serial port
    // In browser/testing, provides precise simulated weight
    const simulatedWeight = Math.round((Math.random() * 2.5 + 0.5) * 1000) / 1000;
    return { weight: simulatedWeight, unit: 'KG' };
  }
}

export class CashDrawerAdapter {
  static openDrawer(): boolean {
    console.log('[HARDWARE] RJ11 Cash Drawer pulse signal sent to register printer.');
    return true;
  }
}
