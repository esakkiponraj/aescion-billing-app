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

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`, extra ? JSON.stringify(extra, null, 2) : '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

export async function runDeepSuite() {
  console.log('\n================================================================');
  console.log('🍽️ AESCION COMMERCE — RESTAURANT ROLE TEMPLATES & PANELS DEEP SUITE');
  console.log('================================================================\n');

  let passed = 0;
  const rand = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // [PHASE 1] Restaurant Enterprise Onboarding & Seeded Role Templates
  // -------------------------------------------------------------
  console.log('[PHASE 1] Restaurant Enterprise Onboarding & Role Templates Availability');
  const orgPayload = {
    owner: {
      firstName: 'Chef',
      lastName: 'Ranveer',
      mobileNumber: `98${rand}2222`,
      email: `ranveer.${rand}@brasserie.com`,
      username: `ranveer.${rand}`,
      password: 'Password@123'
    },
    businessType: 'RESTAURANT',
    business: {
      name: `Ranveer Brasserie & Cafe ${rand}`,
      legalName: `Ranveer Hospitality Pvt Ltd ${rand}`,
      phone: `98${rand}2222`,
      email: `ranveer.${rand}@brasserie.com`,
      address: '88 Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: `07AAAAA${rand}R1Z9`
    },
    branches: [
      {
        name: 'CP Main Dining',
        code: `CP${rand}`,
        address: '88 Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        phone: `98${rand}2222`,
        isMain: true
      },
      {
        name: 'Airport Kiosk Branch',
        code: `AIR${rand}`,
        address: 'Terminal 3 Departure',
        city: 'New Delhi',
        state: 'Delhi',
        phone: `98${rand}3333`,
        isMain: false
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
      restaurant: {
        tableCount: 12,
        enableKDS: true
      }
    }
  };

  const onboardRes = await request('POST', '/onboarding/create-business', orgPayload);
  assert(onboardRes.status === 201, `Restaurant enterprise onboarded successfully (Status 201)`, onboardRes);
  passed++;

  const ownerToken = onboardRes.data.accessToken || onboardRes.data.token;
  const organizationId = onboardRes.data.organization.id;
  const mainBranchId = onboardRes.data.activeBranch?.id || onboardRes.data.branches?.find(b => b.isMain)?.id;
  const secondaryBranchId = onboardRes.data.branches?.find(b => !b.isMain)?.id;

  assert(ownerToken && organizationId && mainBranchId && secondaryBranchId, `Owner token and 2 distinct branches created`);
  passed++;

  // Verify that team/roles returns WAITER and KITCHEN role templates for RESTAURANT
  const rolesRes = await request('GET', '/team/roles', null, ownerToken);
  assert(rolesRes.status === 200 && Array.isArray(rolesRes.data), `Fetched organization role templates`);
  passed++;

  const roleTypes = rolesRes.data.map(r => r.roleType);
  assert(roleTypes.includes('WAITER'), `WAITER role template is available for RESTAURANT`);
  assert(roleTypes.includes('KITCHEN'), `KITCHEN role template is available for RESTAURANT`);
  passed += 2;

  const waiterRole = rolesRes.data.find(r => r.roleType === 'WAITER');
  const kitchenRole = rolesRes.data.find(r => r.roleType === 'KITCHEN');
  assert(waiterRole.permissions.includes('restaurant:tables') && waiterRole.permissions.includes('restaurant:kot'), `WAITER has Floor & Tables and KOT permissions`);
  assert(kitchenRole.permissions.includes('restaurant:kitchen') && kitchenRole.permissions.includes('restaurant:kot'), `KITCHEN has Kitchen KDS and KOT permissions`);
  passed += 2;

  // Verify non-restaurant business (e.g. WHOLESALE) does NOT get WAITER or KITCHEN
  const wholesaleRes = await request('POST', '/onboarding/create-business', {
    owner: {
      firstName: 'Wholesale',
      lastName: 'Trader',
      mobileNumber: `95${rand}4444`,
      email: `trader.${rand}@wholesalecorp.com`,
      username: `trader.${rand}`,
      password: 'Password@123'
    },
    businessType: 'WHOLESALE',
    business: {
      name: `Wholesale Distribution Corp ${rand}`,
      legalName: `Wholesale Distribution Corp Pvt Ltd ${rand}`,
      phone: `95${rand}4444`,
      email: `trader.${rand}@wholesalecorp.com`,
      address: 'Dockyard Central',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    },
    branches: [
      {
        name: 'Warehouse 1',
        code: `W1${rand}`,
        address: 'Dockyard Central',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: `95${rand}4444`,
        isMain: true
      }
    ],
    teamSetupMode: 'JUST_ME',
    taxSettings: { taxMode: 'EXCLUSIVE', defaultRates: [0, 5, 12, 18, 28] },
    billingSettings: { invoicePrefix: 'INV', quotationPrefix: 'QTN', receiptPrefix: 'RCP' }
  });
  assert(wholesaleRes.status === 201, `Wholesale business registered for industry isolation check`);
  const wholesaleRoles = await request('GET', '/team/roles', null, wholesaleRes.data.accessToken);
  const wholesaleRoleTypes = wholesaleRoles.data.map(r => r.roleType);
  assert(!wholesaleRoleTypes.includes('WAITER') && !wholesaleRoleTypes.includes('KITCHEN'), `WAITER and KITCHEN are strictly excluded from Wholesale industry roles`);
  passed += 2;

  // -------------------------------------------------------------
  // [PHASE 2] Real Staff Creation & Individual Logins (Ravi & Arun)
  // -------------------------------------------------------------
  console.log('\n[PHASE 2] Staff Creation & Individual Logins (WAITER Ravi & KITCHEN Arun)');

  // 1. Create Waiter Ravi assigned to Main Branch
  const waiterCreate = await request('POST', '/team/members', {
    firstName: 'Ravi',
    lastName: 'Varma',
    username: `waiter_ravi_${rand}`,
    email: `ravi.${rand}@brasserie.com`,
    password: 'RaviPassword@123',
    roleType: 'WAITER',
    roleName: 'WAITER',
    branchId: mainBranchId
  }, ownerToken);
  assert(waiterCreate.status === 201, `Created WAITER employee account for Ravi`);
  const waiterId = waiterCreate.data.id;
  passed++;

  // 2. Create Kitchen Staff Arun assigned to Main Branch
  const kitchenCreate = await request('POST', '/team/members', {
    firstName: 'Arun',
    lastName: 'Chef',
    username: `kitchen_arun_${rand}`,
    email: `arun.${rand}@brasserie.com`,
    password: 'ArunPassword@123',
    roleType: 'KITCHEN',
    roleName: 'KITCHEN',
    branchId: mainBranchId
  }, ownerToken);
  assert(kitchenCreate.status === 201, `Created KITCHEN employee account for Arun`);
  const kitchenId = kitchenCreate.data.id;
  passed++;

  // 3. Create Kitchen Staff B assigned to Secondary Branch (for Branch Isolation test)
  const kitchenBCreate = await request('POST', '/team/members', {
    firstName: 'Bharat',
    lastName: 'ChefB',
    username: `kitchen_bharat_${rand}`,
    email: `bharat.${rand}@brasserie.com`,
    password: 'BharatPassword@123',
    roleType: 'KITCHEN',
    roleName: 'KITCHEN',
    branchId: secondaryBranchId
  }, ownerToken);
  assert(kitchenBCreate.status === 201, `Created secondary branch KITCHEN staff Bharat`);
  passed++;

  // Log in as Ravi (WAITER)
  const raviLogin = await request('POST', '/auth/login', {
    identifier: `waiter_ravi_${rand}`,
    password: 'RaviPassword@123'
  });
  const raviToken = raviLogin.data?.accessToken;
  assert((raviLogin.status === 200 || raviLogin.status === 201) && !!raviToken, `Ravi (WAITER) logged in successfully`);
  assert(raviLogin.data.activeRole?.roleType === 'WAITER', `Ravi auth token reflects WAITER role`);
  assert(raviLogin.data.activeBranch?.id === mainBranchId, `Ravi auth token scoped to Main Branch`);
  passed += 3;

  // Log in as Arun (KITCHEN)
  const arunLogin = await request('POST', '/auth/login', {
    identifier: `kitchen_arun_${rand}`,
    password: 'ArunPassword@123'
  });
  const arunToken = arunLogin.data?.accessToken;
  assert((arunLogin.status === 200 || arunLogin.status === 201) && !!arunToken, `Arun (KITCHEN) logged in successfully`);
  assert(arunLogin.data.activeRole?.roleType === 'KITCHEN', `Arun auth token reflects KITCHEN role`);
  assert(arunLogin.data.activeBranch?.id === mainBranchId, `Arun auth token scoped to Main Branch`);
  passed += 3;

  // Log in as Bharat (KITCHEN Secondary Branch)
  const bharatLogin = await request('POST', '/auth/login', {
    identifier: `kitchen_bharat_${rand}`,
    password: 'BharatPassword@123'
  });
  const bharatToken = bharatLogin.data?.accessToken;
  assert(!!bharatToken && bharatLogin.data.activeBranch?.id === secondaryBranchId, `Bharat (KITCHEN) logged in with Secondary Branch scope`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 3] Backend RBAC Enforcement & Denied Action Checks
  // -------------------------------------------------------------
  console.log('\n[PHASE 3] Authoritative Backend RBAC Enforcement');

  // 1. KITCHEN Arun attempts to create staff -> 403 Forbidden
  const arunCreateStaff = await request('POST', '/team/members', {
    firstName: 'Hacker',
    username: `hacker_${rand}`,
    password: 'password123',
    roleType: 'MANAGER'
  }, arunToken);
  assert(arunCreateStaff.status === 403, `Kitchen staff creation attempt blocked (403 Forbidden)`);
  passed++;

  // 2. KITCHEN Arun attempts to view Invoices -> 403 Forbidden
  const arunInvoices = await request('GET', '/invoices', null, arunToken);
  assert(arunInvoices.status === 403, `Kitchen invoices access attempt blocked (403 Forbidden)`);
  passed++;

  // 3. WAITER Ravi attempts to settle a bill without payment permission -> 403 Forbidden
  const raviSettle = await request('POST', '/restaurant/tables/some-table/settle', { paymentMethod: 'CASH' }, raviToken);
  assert(raviSettle.status === 403, `Waiter bill settlement without payment permission blocked (403 Forbidden)`);
  passed++;

  // 4. WAITER Ravi attempts to edit company settings -> 403 Forbidden
  const raviSettings = await request('PUT', '/organization/settings', { name: 'Hacked Org' }, raviToken);
  assert(raviSettings.status === 403 || raviSettings.status === 404, `Waiter settings modification blocked (403/404 Forbidden)`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 4] Realtime Live Order-to-Ready Flow with Branch Isolation
  // -------------------------------------------------------------
  console.log('\n[PHASE 4] Realtime Live Order-to-Ready Flow with Branch Isolation');

  // Connect WebSockets
  const waiterSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const kitchenMainSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const kitchenBranchBSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const ownerSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });

  await new Promise((r) => setTimeout(r, 600));

  waiterSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  kitchenMainSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  kitchenBranchBSocket.emit('join_branch', { organizationId, branchId: secondaryBranchId });
  ownerSocket.emit('join_branch', { organizationId, branchId: mainBranchId });

  await new Promise((r) => setTimeout(r, 400));

  // Step 1: Create Table T4 in Main Branch and Menu Item
  const tableRes = await request('POST', '/restaurant/tables', {
    tableNumber: `T4-${rand}`,
    capacity: 4,
    section: 'Main Dining Floor'
  }, ownerToken, { 'x-branch-id': mainBranchId });
  assert(tableRes.status === 201, `Table T4-${rand} created in Main Branch`);
  const tableId = tableRes.data.id;
  passed++;

  const menuRes = await request('POST', '/products', {
    name: `Chicken Fried Rice ${rand}`,
    sku: `CFR-${rand}`,
    sellingPrice: 280,
    mrp: 280,
    purchasePrice: 120,
    taxRate: 5,
    category: 'Rice & Noodles',
    unit: 'PORTION'
  }, ownerToken);
  assert(menuRes.status === 201, `Menu Item: Chicken Fried Rice created`);
  const menuItemId = menuRes.data.id;
  passed++;

  // Step 2: Waiter Ravi occupies Table T4
  const occupyRes = await request('POST', `/restaurant/tables/${tableId}/occupy`, { guestCount: 2 }, raviToken);
  assert(occupyRes.status === 201 && occupyRes.data.status === 'OCCUPIED', `Waiter Ravi occupied Table T4`);
  passed++;

  // Step 3: Waiter Ravi dispatches KOT with cooking notes
  let arunKotReceived = null;
  let branchBKotReceived = null;

  kitchenMainSocket.on('kot_updated', (data) => { arunKotReceived = data; });
  kitchenBranchBSocket.on('kot_updated', (data) => { branchBKotReceived = data; });

  const kotRes = await request('POST', '/restaurant/kots', {
    tableId,
    orderType: 'DINE_IN',
    guestCount: 2,
    notes: 'Extra spicy, no onion',
    items: [
      {
        menuItemId,
        name: `Chicken Fried Rice ${rand}`,
        quantity: 2,
        unitPrice: 280,
        notes: 'Extra spicy, no onion'
      }
    ]
  }, raviToken, { 'x-branch-id': mainBranchId });

  assert(kotRes.status === 201 && kotRes.data.kotNumber, `Waiter Ravi dispatched KOT (${kotRes.data.kotNumber})`);
  const kotId = kotRes.data.id;
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(arunKotReceived !== null, `Main Branch Kitchen Arun received live KOT event`);
  assert(branchBKotReceived === null, `BRANCH ISOLATION VERIFIED: Secondary Branch Kitchen Bharat did NOT receive Main Branch KOT`);
  passed += 2;

  // Step 4: Kitchen Arun clicks START PREPARING
  let raviPrepReceived = null;
  waiterSocket.on('kot_updated', (data) => {
    if (data.status === 'PREPARING') raviPrepReceived = data;
  });

  const prepRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'PREPARING' }, arunToken);
  assert(prepRes.status === 200 && prepRes.data.status === 'PREPARING', `Kitchen Arun advanced status to PREPARING`);
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(raviPrepReceived !== null, `Waiter Ravi received live PREPARING status update`);
  passed++;

  // Step 5: Kitchen Arun clicks MARK READY
  let raviReadyReceived = null;
  waiterSocket.on('kot_updated', (data) => {
    if (data.status === 'READY') raviReadyReceived = data;
  });

  const readyRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'READY' }, arunToken);
  assert(readyRes.status === 200 && readyRes.data.status === 'READY', `Kitchen Arun marked ticket READY`);
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(raviReadyReceived !== null, `Waiter Ravi received live READY alert`);
  passed++;

  // Step 6: Waiter Ravi marks ticket SERVED
  const servedRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'SERVED' }, raviToken);
  assert(servedRes.status === 200 && servedRes.data.status === 'SERVED', `Waiter Ravi marked ticket SERVED`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 5] Owner Configures Custom Role Permissions (Role Editing in Action)
  // -------------------------------------------------------------
  console.log('\n[PHASE 5] Owner Permission Customization & Dynamic Permission Refresh');

  // Owner grants payment permission to WAITER role in PostgreSQL
  const updatedWaiterPerms = [
    'restaurant:tables',
    'restaurant:kot',
    'pos:access',
    'pos:create_bill',
    'payment:collect',
    'receipt:reprint',
    'product:view',
    'customer:view',
    'customer:create'
  ];

  const updateRoleRes = await request('PUT', `/team/roles/${waiterRole.id}`, {
    permissions: updatedWaiterPerms
  }, ownerToken);
  assert(updateRoleRes.status === 200, `Owner updated WAITER role template with PAYMENT_COLLECT permission`);
  passed++;

  // Now Waiter Ravi with updated permissions can settle the bill!
  const billSummaryRes = await request('GET', `/restaurant/tables/${tableId}/bill-summary`, null, raviToken);
  assert(billSummaryRes.status === 200 && billSummaryRes.data.grandTotal === 588, `Waiter retrieved Bill Summary: Grand Total ₹588 (₹560 + 5% GST ₹28)`);
  passed++;

  let ownerInvoiceEvent = null;
  ownerSocket.on('invoice_created', (data) => { ownerInvoiceEvent = data; });

  const raviSettleSuccess = await request('POST', `/restaurant/tables/${tableId}/settle`, {
    paymentMethod: 'CASH',
    amountPaid: 588,
    notes: 'Paid cash to waiter Ravi'
  }, raviToken, { 'x-branch-id': mainBranchId });

  assert(raviSettleSuccess.status === 201 && raviSettleSuccess.data.invoice?.invoiceNumber, `Waiter Ravi successfully settled bill & generated Invoice (${raviSettleSuccess.data.invoice?.invoiceNumber})`);
  assert(raviSettleSuccess.data.table?.status === 'AVAILABLE', `Table T4-${rand} freed to AVAILABLE in PostgreSQL`);
  passed += 2;

  await new Promise((r) => setTimeout(r, 600));
  assert(ownerInvoiceEvent !== null, `Owner received live Invoice event broadcast`);
  passed++;

  // Disconnect Sockets
  waiterSocket.disconnect();
  kitchenMainSocket.disconnect();
  kitchenBranchBSocket.disconnect();
  ownerSocket.disconnect();

  // -------------------------------------------------------------
  // [PHASE 6] Super Admin Audit Feed & Platform Visibility
  // -------------------------------------------------------------
  console.log('\n[PHASE 6] Super Admin Audit & Platform Verification');

  const saLogin = await request('POST', '/auth/login', {
    identifier: 'superadmin@aescion.com',
    password: 'Aescion@Super#2026'
  });
  const saToken = saLogin.data?.accessToken;
  assert(!!saToken, `Super Admin authenticated`);
  passed++;

  const saInvoices = await request('GET', `/super-admin/companies/${organizationId}/invoices`, null, saToken);
  assert(saInvoices.status === 200 && saInvoices.data.length >= 1, `Super Admin verified settled restaurant invoice in platform feed`);
  passed++;

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed} RESTAURANT ROLE TEMPLATES & PANELS TESTS PASSED!`);
  console.log('================================================================\n');

  return { passed, total: passed };
}

if (process.argv[1]?.endsWith('test_restaurant_roles_and_templates_deep_suite.mjs')) {
  runDeepSuite()
    .then((res) => {
      console.log(`Deep Suite Result: ${res.passed}/${res.total} passed`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error in deep suite:', err);
      process.exit(1);
    });
}
