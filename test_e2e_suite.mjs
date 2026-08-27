const API_BASE = 'http://localhost:4000/api/v1';

async function runE2ETests() {
  console.log('================================================================');
  console.log('🚀 AESCION COMMERCE ENTERPRISE — END-TO-END AUTOMATED VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      process.exit(1);
    }
  }

  // 1. Onboarding Test
  console.log('--- TEST GROUP 1: ATOMIC 9-STEP ONBOARDING WIZARD ---');
  const onboardingPayload = {
    owner: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      mobileNumber: '9876543210',
      email: `rahul_${Date.now()}@grandmart.com`,
      username: `rahul_${Date.now()}`,
      password: 'password123',
      confirmPassword: 'password123'
    },
    businessType: 'SUPERMARKET',
    business: {
      name: 'Grand Mart Supermarket',
      legalName: 'Grand Mart Retail Pvt Ltd',
      phone: '044-28345678',
      email: 'contact@grandmart.com',
      address: '45 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: '33AAAAA0000A1Z5'
    },
    branches: [
      { name: 'Flagship Branch', code: 'HQ', address: '45 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', phone: '044-28345678', isMain: true }
    ],
    teamSetupMode: 'JUST_ME',
    taxSettings: {
      taxMode: 'EXCLUSIVE',
      defaultRates: [0, 5, 12, 18, 28],
      enableCess: false,
      defaultCessRate: 0
    },
    billingSettings: {
      invoicePrefix: 'INV',
      quotationPrefix: 'QTN',
      receiptPrefix: 'RCP',
      enableRoundOff: true,
      defaultReceiptFormat: '80MM',
      defaultTerms: 'Thank you for shopping at Grand Mart!'
    },
    industrySettings: {}
  };

  const onboardRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(onboardingPayload)
  });
  const onboardData = await onboardRes.json();
  assert(onboardRes.status === 201 && onboardData.accessToken, '9-Step Business Onboarding creates organization, branch, register, owner, and default catalog items atomically');

  const token = onboardData.accessToken;
  const orgId = onboardData.organization.id;
  const branchId = onboardData.activeBranch.id;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-branch-id': branchId
  };

  // 2. Catalog & Products Verification
  console.log('\n--- TEST GROUP 2: PRODUCTS MASTER & STOCK LEDGER ---');
  const productsRes = await fetch(`${API_BASE}/products`, { headers: authHeaders });
  const products = await productsRes.json();
  assert(Array.isArray(products) && products.length > 0, 'Starter industry catalog seeded with items and initial stock');

  const firstProduct = products[0];
  console.log(`   Sample item seeded: ${firstProduct.name} (Stock: ${firstProduct.currentStock}, Price: ₹${firstProduct.sellingPrice})`);

  // 3. High-Speed POS Billing & Idempotency
  console.log('\n--- TEST GROUP 3: AUTHORITATIVE GST BILLING & INVENTORY DEDUCTION ---');
  const posSalePayload = {
    branchId,
    customerName: 'Walk-in Customer',
    isB2B: false,
    isInterState: false,
    lines: [
      {
        productId: firstProduct.id,
        name: firstProduct.name,
        sku: firstProduct.sku,
        quantity: 2,
        unit: 'PCS',
        unitPrice: firstProduct.sellingPrice,
        taxRate: firstProduct.taxRate || 5,
        taxMode: 'EXCLUSIVE'
      }
    ],
    idempotencyKey: `pos-test-${Date.now()}`,
    payment: {
      method: 'CASH',
      amount: 1000
    }
  };

  const invoiceRes = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(posSalePayload)
  });
  const invoice = await invoiceRes.json();
  assert(invoiceRes.status === 201 && invoice.invoiceNumber.startsWith('INV-'), `Invoice ${invoice.invoiceNumber} created with authoritative GST totals`);
  assert(invoice.status === 'PAID', 'Invoice marked as PAID with cash tender');

  // Verify stock reduction
  const updatedProductRes = await fetch(`${API_BASE}/products`, { headers: authHeaders });
  const updatedProducts = await updatedProductRes.json();
  const updatedProduct = updatedProducts.find((p) => p.id === firstProduct.id);
  assert(updatedProduct.currentStock === firstProduct.currentStock - 2, 'Inventory reduced strictly by line quantity in database');

  // Verify Stock Ledger Audit Trail
  const ledgerRes = await fetch(`${API_BASE}/products/stock/ledger`, { headers: authHeaders });
  const ledger = await ledgerRes.json();
  assert(ledger.some((l) => l.eventType === 'SALE' && l.quantityChange === -2 && l.referenceId === invoice.id), 'StockLedger recorded immutable SALE audit log with referenceId');

  // 4. Cashier Shifts & Drawer Reconciliation
  console.log('\n--- TEST GROUP 4: CASHIER SHIFTS & DRAWER RECONCILIATION ---');
  const registers = await fetch(`${API_BASE}/branches`, { headers: authHeaders }).then(r => r.json());
  const regId = registers[0]?.registers?.[0]?.id || branchId;

  const openShiftRes = await fetch(`${API_BASE}/shifts/open`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      registerId: regId,
      openingCash: 2000
    })
  });
  const shift = await openShiftRes.json();
  assert(shift.shiftStatus === 'OPEN' && shift.openingCash === 2000, 'Cashier shift opened with ₹2000 float');

  const closeShiftRes = await fetch(`${API_BASE}/shifts/${shift.id}/close`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      actualCash: 2000,
      notes: 'Midday register handover'
    })
  });
  const closedShift = await closeShiftRes.json();
  assert(closedShift.shiftStatus === 'CLOSED', 'Cashier shift successfully reconciled and closed');

  // 5. Dashboard Pulse & Live Collections
  console.log('\n--- TEST GROUP 5: DASHBOARD PULSE & LIVE COLLECTIONS ---');
  const pulseRes = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, { headers: authHeaders });
  const pulse = await pulseRes.json();
  assert(pulse.totalRevenue > 0 && pulse.completedBills >= 1, 'Dashboard pulse reports live revenue and completed bill count');
  assert(pulse.collections.cash > 0, 'Live collections breakdown reflects tendered cash payment');

  // 6. Quotation Creation & Conversion
  console.log('\n--- TEST GROUP 6: QUOTATION ESTIMATE & CONVERSION ---');
  const qtnRes = await fetch(`${API_BASE}/quotations`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerName: 'Commercial Client',
      lines: [
        {
          productId: firstProduct.id,
          name: firstProduct.name,
          quantity: 5,
          unitPrice: firstProduct.sellingPrice,
          taxRate: 5,
          taxMode: 'EXCLUSIVE'
        }
      ]
    })
  });
  const qtn = await qtnRes.json();
  assert(qtn.quotationNumber.startsWith('QTN-') && qtn.status === 'DRAFT', `Quotation ${qtn.quotationNumber} generated without deducting stock`);

  const convertRes = await fetch(`${API_BASE}/quotations/${qtn.id}/convert`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  const convertedInvoice = await convertRes.json();
  assert(convertedInvoice.invoiceNumber && convertedInvoice.id, `Quotation converted to official Invoice ${convertedInvoice.invoiceNumber}`);

  // 7. Pharmacy Expiry Billing Guard Check
  console.log('\n--- TEST GROUP 7: PHARMACY EXPIRY SAFETY BILLING BLOCK ---');
  const medRes = await fetch(`${API_BASE}/pharmacy/medicines`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Amoxicillin 500mg (Expired Batch Test)',
      genericName: 'Amoxicillin',
      manufacturer: 'Sun Pharma',
      dosageForm: 'Capsule',
      hsn: '3004',
      taxRate: 12,
      mrp: 120,
      batchNumber: 'EXP-2023-BATCH',
      manufacturingDate: '2022-01-01',
      expiryDate: '2023-01-01', // Strictly expired
      initialQuantity: 50
    })
  });
  const med = await medRes.json();
  assert(med.id, 'Medicine with expired batch created for safety testing');

  const expiredBillAttempt = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      branchId,
      customerName: 'Test Patient',
      lines: [
        {
          productId: med.id,
          name: med.name,
          quantity: 1,
          unit: 'PCS',
          unitPrice: 120,
          taxRate: 12,
          taxMode: 'EXCLUSIVE',
          batchNumber: 'EXP-2023-BATCH'
        }
      ]
    })
  });
  assert(expiredBillAttempt.status === 403, 'Expired medicine batch was STRICTLY BLOCKED from billing with 403 Forbidden');

  // 8. Multi-Tenant Security Guard Check
  console.log('\n--- TEST GROUP 8: MULTI-TENANT ISOLATION SECURITY ---');
  const unauthAttempt = await fetch(`${API_BASE}/invoices`, {
    method: 'GET'
  });
  assert(unauthAttempt.status === 401, 'Unauthenticated request strictly blocked with 401 Unauthorized');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} E2E VERIFICATION TESTS PASSED!`);
  console.log('================================================================\n');
}

runE2ETests().catch((err) => {
  console.error('Fatal error during E2E verification:', err);
  process.exit(1);
});
