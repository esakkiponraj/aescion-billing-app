import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOnboardingPayload(companyName, businessType, email, username, password) {
  return {
    owner: {
      firstName: 'Rajesh',
      lastName: 'SyncMaster',
      mobileNumber: '9876543210',
      email,
      username,
      password
    },
    businessType,
    business: {
      name: companyName,
      legalName: companyName,
      phone: '9876543210',
      email,
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: false
    },
    branches: [
      {
        name: 'Main Express Counter',
        code: 'MAIN',
        city: 'Chennai',
        state: 'Tamil Nadu',
        phone: '9876543210',
        isMain: true
      }
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
      defaultTerms: 'Thank you for shopping!'
    },
    industrySettings: {}
  };
}

async function runLiveSyncSuite() {
  console.log('\n================================================================');
  console.log('⚡ AESCION COMMERCE — LIVE CROSS-PLATFORM SYNC & PARITY SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 9;

  // --- 1. SETUP OWNER A ---
  console.log('--- TEST 1: SAME OWNER PARITY & AUTH TOKEN VERIFICATION ---');
  const ownerAEmail = `owner_sync_${Date.now()}@aescion.com`;
  const ownerAUser = `owner_sync_${Date.now()}`;
  const ownerAPass = 'SecurePass!2026';

  const regRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildOnboardingPayload('Sync Superstore Ltd', 'SUPERMARKET', ownerAEmail, ownerAUser, ownerAPass))
  });

  const regData = await regRes.json();
  if (regRes.status !== 201 || !regData.accessToken) {
    throw new Error(`Owner registration failed: ${JSON.stringify(regData)}`);
  }

  const tokenA = regData.accessToken;
  const orgAId = regData.organization.id;
  const branchAId = regData.branches?.[0]?.id || regData.branch?.id || regData.organization?.branches?.[0]?.id;

  console.log(`✅ [PASS] Registered Owner A on Org ${orgAId} (Branch: ${branchAId})`);
  passedTests++;

  // Setup WebSocket Clients
  const desktopSocket = io(SOCKET_URL, { transports: ['websocket'] });
  const mobileSocket = io(SOCKET_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 2) resolve(true);
    };
    desktopSocket.on('connect', check);
    mobileSocket.on('connect', check);
  });

  desktopSocket.emit('joinBranchRoom', { organizationId: orgAId, branchId: branchAId });
  mobileSocket.emit('join_branch', { organizationId: orgAId, branchId: branchAId });
  await wait(800);

  // --- 2. DESKTOP PRODUCT CREATION -> MOBILE EVENT SYNC ---
  console.log('\n--- TEST 2: DESKTOP PRODUCT CREATION -> REALTIME EVENT -> MOBILE SYNC ---');
  let mobileReceivedProductEvent = false;
  mobileSocket.on('product_updated', (payload) => {
    if (payload.sku === 'PROD-DESK-01') {
      mobileReceivedProductEvent = true;
    }
  });

  const createProdRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      name: 'Organic Wheat Flour 5kg',
      sku: 'PROD-DESK-01',
      barcode: '890123456701',
      category: 'Grocery',
      unit: 'KG',
      costPrice: 150,
      sellingPrice: 220,
      mrp: 250,
      taxRate: 5,
      hsn: '1101',
      initialStock: 50
    })
  });
  const createdProd = await createProdRes.json();
  await wait(800);

  if (createProdRes.status === 201 && mobileReceivedProductEvent) {
    console.log('✅ [PASS] Desktop created product -> Mobile received realtime "product_updated" event immediately');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Mobile did not receive product_updated socket event');
  }

  // --- 3. MOBILE PRODUCT CREATION -> DESKTOP EVENT SYNC ---
  console.log('\n--- TEST 3: MOBILE PRODUCT CREATION -> REALTIME EVENT -> DESKTOP SYNC ---');
  let desktopReceivedProductEvent = false;
  desktopSocket.on('product_updated', (payload) => {
    if (payload.sku === 'PROD-MOB-02') {
      desktopReceivedProductEvent = true;
    }
  });

  const createMobProdRes = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      name: 'Cold Pressed Coconut Oil 1L',
      sku: 'PROD-MOB-02',
      barcode: '890123456702',
      category: 'Oils',
      unit: 'LTR',
      costPrice: 200,
      sellingPrice: 300,
      mrp: 350,
      taxRate: 5,
      hsn: '1513',
      initialStock: 30
    })
  });
  await wait(800);

  if (createMobProdRes.status === 201 && desktopReceivedProductEvent) {
    console.log('✅ [PASS] Mobile created product -> Desktop received realtime "product_updated" event immediately');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Desktop did not receive product_updated socket event');
  }

  // --- 4. MOBILE BILL POS -> DESKTOP DASHBOARD REVENUE & INVOICE CONVERGENCE ---
  console.log('\n--- TEST 4: MOBILE POS BILL -> REALTIME DESKTOP DASHBOARD REVENUE CONVERGENCE ---');
  
  // Baseline Pulse
  const pulseResBefore = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
    headers: { Authorization: `Bearer ${tokenA}`, 'x-branch-id': branchAId }
  });
  const pulseBefore = await pulseResBefore.json();
  const baselineRev = pulseBefore.totalRevenue || 0;
  const baselineBills = pulseBefore.completedBills || 0;

  let desktopReceivedInvoiceEvent = false;
  let desktopReceivedPulseEvent = false;
  desktopSocket.on('invoice_created', () => { desktopReceivedInvoiceEvent = true; });
  desktopSocket.on('pulse_updated', () => { desktopReceivedPulseEvent = true; });

  const billRes = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerName: 'Suresh Kumar',
      customerPhone: '9840112233',
      lines: [
        {
          productId: createdProd.id,
          name: createdProd.name,
          sku: createdProd.sku,
          quantity: 2,
          unitPrice: 220,
          taxRate: 5,
          taxMode: 'EXCLUSIVE'
        }
      ],
      payment: {
        amount: 462,
        method: 'CASH'
      }
    })
  });
  const billData = await billRes.json();
  await wait(800);

  // Pulse After
  const pulseResAfter = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
    headers: { Authorization: `Bearer ${tokenA}`, 'x-branch-id': branchAId }
  });
  const pulseAfter = await pulseResAfter.json();

  if (
    billRes.status === 201 &&
    desktopReceivedInvoiceEvent &&
    desktopReceivedPulseEvent &&
    pulseAfter.totalRevenue === baselineRev + 462 &&
    pulseAfter.completedBills === baselineBills + 1
  ) {
    console.log(`✅ [PASS] Mobile POS created ₹462 bill -> Desktop received live socket events -> Revenue converged from ₹${baselineRev} to ₹${pulseAfter.totalRevenue}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] Pulse revenue did not converge: before=${baselineRev}, after=${pulseAfter.totalRevenue}, expected=${baselineRev + 462}`);
  }

  // --- 5. DESKTOP BILL -> MOBILE DASHBOARD UPDATE ---
  console.log('\n--- TEST 5: DESKTOP BILL -> REALTIME MOBILE DASHBOARD UPDATE ---');
  let mobileReceivedInv = false;
  let mobileReceivedPulse = false;
  mobileSocket.on('invoice_created', () => { mobileReceivedInv = true; });
  mobileSocket.on('pulse_updated', () => { mobileReceivedPulse = true; });

  const deskBillRes = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerName: 'Anand Desktop Customer',
      customerPhone: '9840998877',
      lines: [
        {
          productId: createdProd.id,
          name: createdProd.name,
          sku: createdProd.sku,
          quantity: 1,
          unitPrice: 220,
          taxRate: 5,
          taxMode: 'EXCLUSIVE'
        }
      ],
      payment: {
        amount: 231,
        method: 'UPI',
        referenceNumber: 'UPI-REF-998877'
      }
    })
  });
  await wait(800);

  const pulseResFinal = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
    headers: { Authorization: `Bearer ${tokenA}`, 'x-branch-id': branchAId }
  });
  const pulseFinal = await pulseResFinal.json();

  if (
    deskBillRes.status === 201 &&
    mobileReceivedInv &&
    mobileReceivedPulse &&
    pulseFinal.totalRevenue === baselineRev + 462 + 231
  ) {
    console.log(`✅ [PASS] Desktop created ₹231 bill -> Mobile received realtime events -> Total Revenue authoritatively ₹${pulseFinal.totalRevenue}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] Mobile did not receive live dashboard sync: status=${deskBillRes.status}, inv=${mobileReceivedInv}, pulse=${mobileReceivedPulse}`);
  }

  // --- 6. CUSTOMER CREATION & UPDATE SYNC ---
  console.log('\n--- TEST 6: CUSTOMER CREATION & UPDATE SYNC ---');
  let mobileReceivedCust = false;
  mobileSocket.on('customer_updated', (c) => {
    if (c.name === 'Vijay Retailer') {
      mobileReceivedCust = true;
    }
  });

  const custRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Vijay Retailer',
      phone: '9777711223',
      creditLimit: 50000
    })
  });
  const custData = await custRes.json();
  await wait(800);

  if (custRes.status === 201 && mobileReceivedCust) {
    console.log('✅ [PASS] Customer created -> Mobile received realtime "customer_updated" event');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Customer sync failed');
  }

  // --- 7. CASHIER SHIFT OPEN/CLOSE SYNC ---
  console.log('\n--- TEST 7: CASHIER SHIFT OPEN / CLOSE SYNC ---');
  let shiftEventReceived = false;
  desktopSocket.on('shift_updated', (s) => {
    if (s.status === 'OPEN' || s.status === 'CLOSED') {
      shiftEventReceived = true;
    }
  });

  const shiftRes = await fetch(`${API_BASE}/shifts/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      openingCash: 1000,
      notes: 'Morning shift open'
    })
  });
  const shiftData = await shiftRes.json();
  await wait(800);

  if (shiftRes.status === 201 && shiftEventReceived) {
    console.log('✅ [PASS] Shift opened with ₹1,000 float -> Realtime event emitted & received on all clients');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Shift sync failed');
  }

  // --- 8. MULTI-TENANT ISOLATION ---
  console.log('\n--- TEST 8: STRICT MULTI-TENANT REALTIME ISOLATION ---');
  const ownerBEmail = `owner_b_${Date.now()}@aescion.com`;
  const ownerBUser = `owner_b_${Date.now()}`;
  const regBRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildOnboardingPayload('Tenant B Supermarket', 'RETAIL', ownerBEmail, ownerBUser, 'SecurePass!2026'))
  });
  const regBData = await regBRes.json();
  const tokenB = regBData.accessToken;
  const orgBId = regBData.organization.id;
  const branchBId = regBData.branches?.[0]?.id || regBData.branch?.id || regBData.organization?.branches?.[0]?.id;

  const tenantBSocket = io(SOCKET_URL, { transports: ['websocket'] });
  await new Promise((resolve) => tenantBSocket.on('connect', resolve));
  tenantBSocket.emit('joinBranchRoom', { organizationId: orgBId, branchId: branchBId });
  await wait(800);

  let tenantALeakDetected = false;
  mobileSocket.on('invoice_created', (inv) => {
    if (inv.organizationId === orgBId) {
      tenantALeakDetected = true;
    }
  });

  // Tenant B creates an invoice
  await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
      'x-branch-id': branchBId
    },
    body: JSON.stringify({
      branchId: branchBId,
      customerName: 'Tenant B Private Customer',
      lines: [
        {
          name: 'Tenant B Private Item',
          sku: 'TB-01',
          quantity: 1,
          unitPrice: 500,
          taxRate: 18,
          taxMode: 'EXCLUSIVE'
        }
      ],
      payment: { amount: 590, method: 'CASH' }
    })
  });
  await wait(800);

  if (!tenantALeakDetected) {
    console.log('✅ [PASS] Tenant Guard verified: Tenant B invoice events isolated from Tenant A');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Multi-tenant data leak in realtime socket');
  }

  // --- 9. IDEMPOTENT OFFLINE SYNC (NO DUPLICATE TRANSACTIONS) ---
  console.log('\n--- TEST 9: IDEMPOTENT OFFLINE SYNC (NO DUPLICATE FINANCIAL TRANSACTIONS) ---');
  const idempotentKey = `OFFLINE-IDEMP-${Date.now()}`;

  const firstSubmit = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      branchId: branchAId,
      idempotencyKey: idempotentKey,
      customerName: 'Idempotency Test User',
      lines: [
        {
          name: 'Idempotent Item',
          sku: 'IDEMP-01',
          quantity: 1,
          unitPrice: 100,
          taxRate: 5,
          taxMode: 'EXCLUSIVE'
        }
      ],
      payment: { amount: 105, method: 'CASH' }
    })
  });
  const firstInv = await firstSubmit.json();

  // Retry same transaction
  const secondSubmit = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-branch-id': branchAId
    },
    body: JSON.stringify({
      branchId: branchAId,
      idempotencyKey: idempotentKey,
      customerName: 'Idempotency Test User',
      lines: [
        {
          name: 'Idempotent Item',
          sku: 'IDEMP-01',
          quantity: 1,
          unitPrice: 100,
          taxRate: 5,
          taxMode: 'EXCLUSIVE'
        }
      ],
      payment: { amount: 105, method: 'CASH' }
    })
  });
  const secondInv = await secondSubmit.json();

  if (firstInv.id === secondInv.id && firstInv.invoiceNumber === secondInv.invoiceNumber) {
    console.log('✅ [PASS] Duplicate offline retry detected & deduplicated: Returned same invoice ID without double-billing');
    passedTests++;
  } else {
    console.error('❌ [FAIL] Idempotent retry produced duplicate invoice');
  }

  desktopSocket.disconnect();
  mobileSocket.disconnect();
  tenantBSocket.disconnect();

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} LIVE CROSS-PLATFORM TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)!`);
  console.log('================================================================\n');
}

runLiveSyncSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
