const fs = require('fs');

// 1. DashboardPulse
let pulseCode = fs.readFileSync('C:/AESCION/apps/desktop/src/features/dashboard/DashboardPulse.tsx', 'utf8');
if (!pulseCode.includes('subscribeToRealtime')) {
  pulseCode = pulseCode.replace(
    "import { formatCurrencyINR } from '@aescion/shared-utils';",
    "import { formatCurrencyINR } from '@aescion/shared-utils';\nimport { joinBranchRoom, subscribeToRealtime } from '../../services/socket';"
  );
  pulseCode = pulseCode.replace(
    "  useEffect(() => {\n    fetchPulse();\n  }, [period, activeBranch?.id]);",
    "  useEffect(() => {\n    if (organization?.id) {\n      joinBranchRoom(organization.id, activeBranch?.id);\n    }\n    fetchPulse();\n    const unsubPulse = subscribeToRealtime('pulse_updated', () => fetchPulse());\n    const unsubInv = subscribeToRealtime('invoice_created', () => fetchPulse());\n    const unsubShift = subscribeToRealtime('shift_updated', () => fetchPulse());\n    const unsubProd = subscribeToRealtime('product_updated', () => fetchPulse());\n    return () => {\n      unsubPulse();\n      unsubInv();\n      unsubShift();\n      unsubProd();\n    };\n  }, [period, activeBranch?.id, organization?.id]);"
  );
  fs.writeFileSync('C:/AESCION/apps/desktop/src/features/dashboard/DashboardPulse.tsx', pulseCode, 'utf8');
  console.log('DashboardPulse patched with realtime');
}

// 2. InvoicesList
let invCode = fs.readFileSync('C:/AESCION/apps/desktop/src/features/billing/InvoicesList.tsx', 'utf8');
if (!invCode.includes('subscribeToRealtime')) {
  invCode = invCode.replace(
    "import { PrinterAdapter } from '../../services/hardware';",
    "import { PrinterAdapter } from '../../services/hardware';\nimport { subscribeToRealtime } from '../../services/socket';"
  );
  invCode = invCode.replace(
    "  useEffect(() => {\n    fetchInvoices();\n  }, [statusFilter, activeBranch?.id]);",
    "  useEffect(() => {\n    fetchInvoices();\n    const unsub = subscribeToRealtime('invoice_created', () => fetchInvoices());\n    const unsubPulse = subscribeToRealtime('pulse_updated', () => fetchInvoices());\n    return () => {\n      unsub();\n      unsubPulse();\n    };\n  }, [statusFilter, activeBranch?.id]);"
  );
  fs.writeFileSync('C:/AESCION/apps/desktop/src/features/billing/InvoicesList.tsx', invCode, 'utf8');
  console.log('InvoicesList patched with realtime');
}

// 3. ProductsCatalog
let prodCode = fs.readFileSync('C:/AESCION/apps/desktop/src/features/products/ProductsCatalog.tsx', 'utf8');
if (!prodCode.includes('subscribeToRealtime')) {
  prodCode = prodCode.replace(
    "import { formatCurrencyINR } from '@aescion/shared-utils';",
    "import { formatCurrencyINR } from '@aescion/shared-utils';\nimport { subscribeToRealtime } from '../../services/socket';"
  );
  prodCode = prodCode.replace(
    "  useEffect(() => {\n    fetchProducts();\n  }, [search, activeBranch?.id]);",
    "  useEffect(() => {\n    fetchProducts();\n    const unsub = subscribeToRealtime('product_updated', () => fetchProducts());\n    return unsub;\n  }, [search, activeBranch?.id]);"
  );
  fs.writeFileSync('C:/AESCION/apps/desktop/src/features/products/ProductsCatalog.tsx', prodCode, 'utf8');
  console.log('ProductsCatalog patched with realtime');
}
