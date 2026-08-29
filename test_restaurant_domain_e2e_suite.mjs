import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function request(method, path, body = null, token = null, headers = {}) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    body: body ? JSON.stringify(body) : null
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  return { status: res.status, data: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function run() {
  console.log('\n================================================================');
  console.log('🍽️ AESCION COMMERCE — RESTAURANT & CAFE DOMAIN E2E TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  const rand = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // [PHASE 1] Restaurant Enterprise Onboarding
  // -------------------------------------------------------------
  console.log('[PHASE 1] Restaurant Enterprise Onboarding & Setup');
  const orgPayload = {
    owner: {
      firstName: 'Vikram',
      lastName: 'Seth',
      mobileNumber: `98${rand}3333`,
      email: `chef.vikram.${rand}@spicesymphony.com`,
      username: `chef.vikram.${rand}`,
      password: 'Password@123'
    },
    businessType: 'RESTAURANT',
    business: {
      name: `Spice Symphony & Cafe ${rand}`,
      legalName: `Spice Symphony Foods Pvt Ltd ${rand}`,
      phone: `98${rand}3333`,
      email: `chef.vikram.${rand}@spicesymphony.com`,
      address: '100 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400020',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: `27AAACB${rand}C1Z8`
    },
    branches: [
      {
        name: `Spice Symphony (Main Dining)`,
        code: `SS${rand}`,
        address: '100 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: `98${rand}3333`,
        isMain: true
      }
    ],
    teamSetupMode: 'JUST_ME',
    taxSettings: {
      taxMode: 'EXCLUSIVE',
      defaultRates: [0, 5, 12, 18, 28]
    },
    billingSettings: {
      invoicePrefix: 'INV',
      quotationPrefix: 'QTN',
      receiptPrefix: 'RCP'
    },
    industrySettings: {
      enableKOT: true,
      enableTables: true
    }
  };

  const regRes = await request('POST', '/onboarding/create-business', orgPayload);
  assert(regRes.status === 201, `Restaurant registered with status 201 (Status: ${regRes.status})`);
  passed++;

  const ownerToken = regRes.data.accessToken;
  const orgId = regRes.data.organization.id;
  const branchId = regRes.data.activeBranch.id;
  assert(!!ownerToken && !!orgId && !!branchId, 'Owner token, Org ID and Branch ID issued');
  passed++;

  // Setup WebSocket Client
  const socket = io('http://127.0.0.1:4000', {
    auth: { token: ownerToken },
    transports: ['websocket']
  });

  let socketConnected = false;
  socket.on('connect', () => {
    socketConnected = true;
    socket.emit('join_org', { organizationId: orgId, branchId });
  });

  let receivedTableEvent = null;
  socket.on('table_updated', (data) => {
    receivedTableEvent = data;
  });

  let receivedKotEvent = null;
  socket.on('kot_updated', (data) => {
    receivedKotEvent = data;
  });

  await new Promise((r) => setTimeout(r, 500));
  assert(socketConnected, 'Realtime WebSocket connected and joined branch room');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 2] Staff & Team Role Management
  // -------------------------------------------------------------
  console.log('\n[PHASE 2] Restaurant Staff & Team Role Scoping');
  const staffRes = await request(
    'POST',
    '/team',
    {
      firstName: 'Rahul',
      lastName: 'Captain',
      username: `waiter.rahul.${rand}`,
      email: `waiter.rahul.${rand}@spicesymphony.com`,
      password: 'Waiter@123',
      roleName: 'CASHIER',
      branchId
    },
    ownerToken
  );
  assert(staffRes.status === 201, `Created Restaurant Staff with status 201 (Status: ${staffRes.status})`);
  passed++;

  // Login as Staff
  const waiterLoginRes = await request('POST', '/auth/login', {
    identifier: `waiter.rahul.${rand}@spicesymphony.com`,
    password: 'Waiter@123'
  });
  assert((waiterLoginRes.status === 200 || waiterLoginRes.status === 201) && !!waiterLoginRes.data.accessToken, 'Waiter logged in successfully');
  passed++;
  const waiterToken = waiterLoginRes.data.accessToken;

  // -------------------------------------------------------------
  // [PHASE 3] Outlets & Branches
  // -------------------------------------------------------------
  console.log('\n[PHASE 3] Multi-Branch Outlet Management');
  const branch2Res = await request(
    'POST',
    '/branches',
    {
      name: 'Rooftop Lounge & Bar',
      code: `ROOF${rand}`,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    },
    ownerToken
  );
  assert(branch2Res.status === 201, `Secondary Outlet created with status 201`);
  passed++;
  const branch2Id = branch2Res.data.id;

  // -------------------------------------------------------------
  // [PHASE 4] Floors & Table Management CRUD
  // -------------------------------------------------------------
  console.log('\n[PHASE 4] Dining Floor & Table Management');
  // Create Table T1 (Ground Floor)
  const t1Res = await request(
    'POST',
    '/restaurant/tables',
    {
      tableNumber: `T1-${rand}`,
      capacity: 4,
      section: 'Ground Floor'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(t1Res.status === 201, `Table T1 created (Status: ${t1Res.status})`);
  passed++;
  const table1Id = t1Res.data.id;

  // Create Table T2 (AC Hall)
  const t2Res = await request(
    'POST',
    '/restaurant/tables',
    {
      tableNumber: `T2-${rand}`,
      capacity: 2,
      section: 'AC Family Hall'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(t2Res.status === 201, 'Table T2 created in AC Family Hall');
  passed++;
  const table2Id = t2Res.data.id;

  // Edit Table T2 capacity to 6 Pax
  const t2EditRes = await request(
    'PUT',
    `/restaurant/tables/${table2Id}`,
    { capacity: 6 },
    ownerToken
  );
  assert(t2EditRes.status === 200 && t2EditRes.data.capacity === 6, 'Table T2 capacity updated to 6 Pax');
  passed++;

  // Fetch Tables
  const getTablesRes = await request('GET', '/restaurant/tables', null, ownerToken, { 'x-branch-id': branchId });
  assert(getTablesRes.status === 200 && getTablesRes.data.length >= 2, `Retrieved ${getTablesRes.data.length} tables`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 5] Menu Catalog & Menu Items
  // -------------------------------------------------------------
  console.log('\n[PHASE 5] Restaurant Menu Catalog Management');
  const item1Res = await request(
    'POST',
    '/products',
    {
      name: 'Paneer Butter Masala',
      sku: `MENU-PBM-${rand}`,
      category: 'Main Course',
      sellingPrice: 320,
      costPrice: 120,
      taxRate: 5,
      unit: 'PORTION'
    },
    ownerToken
  );
  assert(item1Res.status === 201, 'Menu Item 1 (Paneer Butter Masala ₹320) created');
  passed++;
  const item1 = item1Res.data;

  const item2Res = await request(
    'POST',
    '/products',
    {
      name: 'Butter Naan',
      sku: `MENU-NAAN-${rand}`,
      category: 'Breads',
      sellingPrice: 45,
      costPrice: 15,
      taxRate: 5,
      unit: 'PCS'
    },
    ownerToken
  );
  assert(item2Res.status === 201, 'Menu Item 2 (Butter Naan ₹45) created');
  passed++;
  const item2 = item2Res.data;

  const item3Res = await request(
    'POST',
    '/products',
    {
      name: 'Mango Lassi Frappe',
      sku: `MENU-LASSI-${rand}`,
      category: 'Beverages',
      sellingPrice: 110,
      costPrice: 40,
      taxRate: 5,
      unit: 'GLASS'
    },
    ownerToken
  );
  assert(item3Res.status === 201, 'Menu Item 3 (Mango Lassi Frappe ₹110) created');
  passed++;
  const item3 = item3Res.data;

  // -------------------------------------------------------------
  // [PHASE 6] Dine-In Order & KOT 1 Dispatch
  // -------------------------------------------------------------
  console.log('\n[PHASE 6] Waiter Dine-In Order & KOT 1 Dispatch');
  receivedKotEvent = null;
  const kot1Res = await request(
    'POST',
    '/restaurant/kots',
    {
      tableId: table1Id,
      items: [
        { menuItemId: item1.id, name: item1.name, quantity: 2, unitPrice: item1.sellingPrice, notes: 'Less spicy' },
        { menuItemId: item2.id, name: item2.name, quantity: 4, unitPrice: item2.sellingPrice }
      ]
    },
    waiterToken,
    { 'x-branch-id': branchId }
  );

  assert(kot1Res.status === 201, `KOT 1 dispatched (${kot1Res.data.kotNumber})`);
  passed++;
  const kot1 = kot1Res.data;

  await new Promise((r) => setTimeout(r, 400));
  assert(!!receivedKotEvent && receivedKotEvent.kotNumber === kot1.kotNumber, 'Kitchen received live kot_updated WebSocket event');
  passed++;

  // Verify Table 1 status updated to KOT_SENT
  const t1CheckRes = await request('GET', '/restaurant/tables', null, ownerToken, { 'x-branch-id': branchId });
  const t1Current = t1CheckRes.data.find((t) => t.id === table1Id);
  assert(t1Current.status === 'KOT_SENT', `Table T1 status transitioned to KOT_SENT (Status: ${t1Current.status})`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 7] Kitchen KDS Progression
  // -------------------------------------------------------------
  console.log('\n[PHASE 7] Kitchen KDS Status Progression');
  // 1. Mark PREPARING
  const prepRes = await request(
    'PUT',
    `/restaurant/kots/${kot1.id}/status`,
    { status: 'PREPARING' },
    ownerToken
  );
  assert(prepRes.status === 200 && prepRes.data.status === 'PREPARING', 'KOT 1 transitioned to PREPARING');
  passed++;

  // 2. Mark READY
  const readyRes = await request(
    'PUT',
    `/restaurant/kots/${kot1.id}/status`,
    { status: 'READY' },
    ownerToken
  );
  assert(readyRes.status === 200 && readyRes.data.status === 'READY', 'KOT 1 transitioned to READY');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 8] Multi-KOT Delta Addition
  // -------------------------------------------------------------
  console.log('\n[PHASE 8] Multi-KOT Delta Addition on Same Active Order');
  const kot2Res = await request(
    'POST',
    '/restaurant/kots',
    {
      tableId: table1Id,
      items: [
        { menuItemId: item3.id, name: item3.name, quantity: 2, unitPrice: item3.sellingPrice }
      ]
    },
    waiterToken,
    { 'x-branch-id': branchId }
  );
  assert(kot2Res.status === 201, `Additional KOT 2 dispatched (${kot2Res.data.kotNumber})`);
  passed++;
  const kot2 = kot2Res.data;
  assert(kot2.orderId === kot1.orderId, `Multi-KOT linked under same Order ID: ${kot1.orderId}`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 9] Table Bill Summary Aggregation
  // -------------------------------------------------------------
  console.log('\n[PHASE 9] Dine-In Multi-KOT Bill Summary Aggregation');
  const summaryRes = await request('GET', `/restaurant/tables/${table1Id}/bill-summary`, null, ownerToken);
  assert(summaryRes.status === 200, 'Retrieved Table Bill Summary');
  passed++;

  const summary = summaryRes.data;
  assert(summary.items.length === 3, `Aggregated exactly 3 distinct line items across both KOTs (Count: ${summary.items.length})`);
  passed++;

  // Expected subtotal: (2 * 320) + (4 * 45) + (2 * 110) = 640 + 180 + 220 = 1040
  assert(summary.subtotal === 1040, `Authoritative Subtotal = ₹1040 (Actual: ₹${summary.subtotal})`);
  passed++;

  const expectedTax = 52; // 5% of 1040
  const expectedGrandTotal = 1092;
  assert(summary.grandTotal === expectedGrandTotal, `Authoritative Grand Total = ₹1092 (Actual: ₹${summary.grandTotal})`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 10] Table Settlement & Receipt
  // -------------------------------------------------------------
  console.log('\n[PHASE 10] Table Settlement, Invoice & Receipt Issuance');
  const settleRes = await request(
    'POST',
    `/restaurant/tables/${table1Id}/settle`,
    {
      paymentMethod: 'UPI'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );

  assert(settleRes.status === 201, `Table settled successfully with status 201`);
  passed++;

  const invoice = settleRes.data.invoice;
  assert(invoice.paidAmount === expectedGrandTotal, `Full payment of ₹${expectedGrandTotal} recorded`);
  passed++;
  assert(invoice.status === 'PAID', `Invoice status is PAID`);
  passed++;

  // Verify Table 1 returned to AVAILABLE
  const t1AfterRes = await request('GET', '/restaurant/tables', null, ownerToken, { 'x-branch-id': branchId });
  const t1After = t1AfterRes.data.find((t) => t.id === table1Id);
  assert(t1After.status === 'AVAILABLE' && t1After.activeOrderId === null, 'Table T1 freed to AVAILABLE');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 11] Table Transfer Flow
  // -------------------------------------------------------------
  console.log('\n[PHASE 11] Table Transfer Flow');
  // 1. Open Table 2
  const kotTransferRes = await request(
    'POST',
    '/restaurant/kots',
    {
      tableId: table2Id,
      items: [{ menuItemId: item2.id, name: item2.name, quantity: 2, unitPrice: item2.sellingPrice }]
    },
    waiterToken,
    { 'x-branch-id': branchId }
  );
  assert(kotTransferRes.status === 201, 'Seated and dispatched KOT on Table T2');
  passed++;

  // 2. Transfer from T2 to T1 (which is now available)
  const transferRes = await request(
    'POST',
    '/restaurant/tables/transfer',
    {
      fromTableId: table2Id,
      toTableId: table1Id
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(transferRes.status === 201, 'Table order transferred from T2 to T1');
  passed++;

  // Clean up transferred table
  await request('POST', `/restaurant/tables/${table1Id}/close`, {}, ownerToken);

  // -------------------------------------------------------------
  // [PHASE 12] Express Takeaway Flow
  // -------------------------------------------------------------
  console.log('\n[PHASE 12] Express Takeaway Order Workflow');
  const tkwKotRes = await request(
    'POST',
    '/restaurant/kots',
    {
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: item1.id, name: item1.name, quantity: 1, unitPrice: item1.sellingPrice }]
    },
    waiterToken,
    { 'x-branch-id': branchId }
  );
  assert(tkwKotRes.status === 201 && tkwKotRes.data.tableNumber === 'TAKEAWAY', 'Takeaway KOT dispatched without requiring dining table');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 13] Table Reservations & Bookings
  // -------------------------------------------------------------
  console.log('\n[PHASE 13] Table Reservation Lifecycle');
  const resRes = await request(
    'POST',
    '/restaurant/reservations',
    {
      customerName: 'Dr. Ananya Sharma',
      customerPhone: '9876543210',
      guestCount: 4,
      reservationDate: new Date().toISOString(),
      reservationTime: '20:00',
      tableNumber: `T1-${rand}`,
      section: 'Ground Floor',
      notes: 'Anniversary celebration'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(resRes.status === 201, 'Created Table Reservation for Dr. Ananya Sharma');
  passed++;
  const reservationId = resRes.data.id;

  const resListRes = await request('GET', '/restaurant/reservations', null, ownerToken, { 'x-branch-id': branchId });
  assert(resListRes.status === 200 && resListRes.data.length >= 1, `Retrieved ${resListRes.data.length} reservations`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 14] Restaurant Procurement (Supplier, PO, GRN)
  // -------------------------------------------------------------
  console.log('\n[PHASE 14] Restaurant Ingredient Procurement & Inventory');
  const suppRes = await request(
    'POST',
    '/suppliers',
    {
      name: `Amul Dairy & Farms ${rand}`,
      contactPerson: 'Suresh Patel',
      phone: `98221${rand}`,
      email: `amul.${rand}@supplies.com`,
      gstin: `27AABCA${rand}D1Z5`
    },
    ownerToken
  );
  assert(suppRes.status === 201, 'Created Restaurant Dairy Supplier');
  passed++;
  const supplierId = suppRes.data.id;

  // Create Ingredient Product (Milk / Paneer Raw Stock)
  const ingRes = await request(
    'POST',
    '/products',
    {
      name: `Farm Fresh Paneer Block ${rand}`,
      sku: `ING-PAN-${rand}`,
      category: 'Raw Ingredients',
      sellingPrice: 0,
      costPrice: 280,
      taxRate: 5,
      unit: 'KG'
    },
    ownerToken
  );
  assert(ingRes.status === 201, 'Raw Ingredient Product created in inventory');
  passed++;
  const ingredient = ingRes.data;

  // Create Purchase Order
  const poRes = await request(
    'POST',
    '/suppliers/purchase-orders',
    {
      supplierId,
      supplierName: `Amul Dairy & Farms ${rand}`,
      items: [
        {
          productId: ingredient.id,
          name: ingredient.name,
          quantityOrdered: 50,
          unitCost: 280,
          taxRate: 5
        }
      ]
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(poRes.status === 201, 'Purchase Order for 50 KG Paneer created');
  passed++;
  const po = poRes.data;

  // Receive GRN
  const grnRes = await request(
    'PUT',
    `/suppliers/purchase-orders/${po.id}/grn`,
    {
      items: [
        {
          productId: ingredient.id,
          quantity: 50
        }
      ]
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(grnRes.status === 200 || grnRes.status === 201, 'GRN Goods Receipt recorded: 50 KG stock received');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 15] Cashier Shift Lifecycle
  // -------------------------------------------------------------
  console.log('\n[PHASE 15] Cashier Shift Open / Close Lifecycle');
  const shiftOpenRes = await request(
    'POST',
    '/cashier-shifts/open',
    {
      openingFloat: 2500,
      notes: 'Morning Lunch Shift'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(shiftOpenRes.status === 201 || shiftOpenRes.status === 200, 'Opened Cashier Shift with ₹2,500 float');
  passed++;
  const shiftId = shiftOpenRes.data.id;

  const shiftCloseRes = await request(
    'PUT',
    `/cashier-shifts/${shiftId}/close`,
    {
      actualCash: 2500,
      notes: 'Shift closed without variance'
    },
    ownerToken,
    { 'x-branch-id': branchId }
  );
  assert(shiftCloseRes.status === 200 || shiftCloseRes.status === 201, 'Closed Cashier Shift successfully');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 16] Multi-Branch Isolation
  // -------------------------------------------------------------
  console.log('\n[PHASE 16] Multi-Branch Isolation');
  const branch2TablesRes = await request('GET', '/restaurant/tables', null, ownerToken, { 'x-branch-id': branch2Id });
  assert(branch2TablesRes.status === 200 && branch2TablesRes.data.length === 0, 'Branch 2 contains 0 tables from Branch 1 (Strict Isolation)');
  passed++;

  // -------------------------------------------------------------
  // [PHASE 17] Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n[PHASE 17] Strict Multi-Tenant Isolation');
  // Register Tenant B
  const tenantBPayload = {
    owner: {
      firstName: 'Bhavin',
      lastName: 'Shah',
      mobileNumber: `95${rand}4444`,
      email: `owner.b.${rand}@urbantadka.com`,
      username: `owner.b.${rand}`,
      password: 'Password@123'
    },
    businessType: 'RESTAURANT',
    business: {
      name: `Urban Tadka Cafe ${rand}`,
      legalName: `Urban Tadka Cafe ${rand}`,
      phone: `95${rand}4444`,
      email: `owner.b.${rand}@urbantadka.com`,
      address: '200 Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400050',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: false
    },
    branches: [
      {
        name: `Urban Tadka (Main)`,
        code: `UT${rand}`,
        address: '200 Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: `95${rand}4444`,
        isMain: true
      }
    ],
    teamSetupMode: 'JUST_ME',
    taxSettings: { taxMode: 'EXCLUSIVE', defaultRates: [0, 5, 12, 18, 28] },
    billingSettings: { invoicePrefix: 'INV', quotationPrefix: 'QTN', receiptPrefix: 'RCP' },
    industrySettings: { enableKOT: true, enableTables: true }
  };

  const tenantBRes = await request('POST', '/onboarding/create-business', tenantBPayload);
  const tenantBToken = tenantBRes.data.accessToken;

  // Tenant B attempting to access Tenant A's table
  const crossTenantRes = await request('GET', `/restaurant/tables/${table1Id}/bill-summary`, null, tenantBToken);
  assert(crossTenantRes.status === 404 || crossTenantRes.status === 403, `Tenant B blocked from Tenant A tables (Status: ${crossTenantRes.status})`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 18] Industry Pack Security
  // -------------------------------------------------------------
  console.log('\n[PHASE 18] Industry Guard RBAC Security');
  const wholesaleBlockRes = await request('GET', '/wholesale/sales-orders', null, ownerToken);
  assert(wholesaleBlockRes.status === 403, 'Restaurant Tenant blocked from Wholesale APIs by IndustryGuard (403 Forbidden)');
  passed++;

  socket.disconnect();

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${passed} RESTAURANT & CAFE DOMAIN TESTS PASSED (100%)!`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUNNER TERMINATED WITH ERROR:', err);
  process.exit(1);
});
