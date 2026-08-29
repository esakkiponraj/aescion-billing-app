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

export async function run() {
  console.log('\n================================================================');
  console.log('🛡️ AESCION COMMERCE — RESTAURANT RBAC, SEPARATE LOGIN & SECURITY SUITE');
  console.log('================================================================\n');

  let passed = 0;
  const rand = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // [BATTERY 1] Restaurant Enterprise Onboarding & Role Seeding
  // -------------------------------------------------------------
  console.log('[BATTERY 1] Restaurant Enterprise Onboarding & Role Seeding');
  const orgPayload = {
    owner: {
      firstName: 'Chef',
      lastName: 'Sanjeev',
      mobileNumber: `97${rand}4444`,
      email: `sanjeev.${rand}@royalspice.com`,
      username: `sanjeev.${rand}`,
      password: 'Password@123'
    },
    businessType: 'RESTAURANT',
    business: {
      name: `Royal Spice Fine Dine ${rand}`,
      legalName: `Royal Spice Foods Ltd ${rand}`,
      phone: `97${rand}4444`,
      email: `sanjeev.${rand}@royalspice.com`,
      address: '12 Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: `29ABCDE${rand}F1Z5`
    },
    branches: [
      {
        name: 'Main Dining Outlet',
        code: `RS${rand}`,
        address: '12 Brigade Road',
        city: 'Bangalore',
        state: 'Karnataka',
        phone: `97${rand}4444`,
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
      restaurant: {
        tableCount: 10,
        enableKDS: true,
        allowCustomVariants: true
      }
    }
  };

  const onboardRes = await request('POST', '/onboarding/create-business', orgPayload);
  assert(onboardRes.status === 201, `Restaurant enterprise onboarded successfully (Status 201)`, onboardRes);
  passed++;

  const ownerToken = onboardRes.data.accessToken || onboardRes.data.token;
  const ownerUser = onboardRes.data.user;
  const organizationId = onboardRes.data.organization.id;
  const mainBranchId = onboardRes.data.activeBranch?.id || onboardRes.data.branches?.[0]?.id;
  assert(ownerToken && organizationId && mainBranchId, `Owner session and Main Branch created`);
  passed++;

  // Verify Seeded Roles for Restaurant
  const rolesRes = await request('GET', '/team/roles', null, ownerToken);
  assert(rolesRes.status === 200 && Array.isArray(rolesRes.data), `Fetched organization roles`);
  passed++;

  const roleTypes = rolesRes.data.map(r => r.roleType);
  const roleNames = rolesRes.data.map(r => r.name.toUpperCase());

  // Must include: OWNER, MANAGER, ACCOUNTANT, CASHIER, INVENTORY_STAFF, WAITER, KITCHEN
  assert(roleTypes.includes('OWNER'), `Seeded OWNER role exists`);
  assert(roleTypes.includes('MANAGER'), `Seeded MANAGER role exists`);
  assert(roleTypes.includes('ACCOUNTANT'), `Seeded ACCOUNTANT role exists`);
  assert(roleTypes.includes('CASHIER'), `Seeded CASHIER role exists`);
  assert(roleTypes.includes('INVENTORY_STAFF'), `Seeded INVENTORY_STAFF role exists`);
  assert(roleTypes.includes('WAITER'), `Seeded WAITER role exists`);
  assert(roleTypes.includes('KITCHEN'), `Seeded KITCHEN role exists`);
  passed += 7;

  // Must EXCLUDE: SUPER_ADMIN, CUSTOM, TECHNICIAN, CAPTAIN
  assert(!roleTypes.includes('SUPER_ADMIN') && !roleNames.includes('SUPER ADMIN'), `SUPER_ADMIN strictly excluded from Restaurant roles`);
  assert(!roleTypes.includes('CUSTOM') && !roleNames.includes('CUSTOM'), `CUSTOM role strictly excluded from Restaurant roles`);
  assert(!roleTypes.includes('TECHNICIAN') && !roleNames.includes('TECHNICIAN'), `TECHNICIAN role strictly excluded from Restaurant roles`);
  assert(!roleTypes.includes('CAPTAIN') && !roleNames.includes('CAPTAIN'), `CAPTAIN role strictly excluded from Restaurant roles`);
  passed += 4;

  // -------------------------------------------------------------
  // [BATTERY 2] Separate Staff Account Creation & Distinct Logins
  // -------------------------------------------------------------
  console.log('\n[BATTERY 2] Separate Staff Account Creation & Distinct Logins');

  const staffConfigs = [
    { username: `manager_mohan_${rand}`, roleType: 'MANAGER', firstName: 'Mohan', lastName: 'Das', roleName: 'Manager' },
    { username: `accountant_anita_${rand}`, roleType: 'ACCOUNTANT', firstName: 'Anita', lastName: 'Rao', roleName: 'Accountant' },
    { username: `cashier_chandru_${rand}`, roleType: 'CASHIER', firstName: 'Chandru', lastName: 'Kumar', roleName: 'Cashier' },
    { username: `inventory_imran_${rand}`, roleType: 'INVENTORY_STAFF', firstName: 'Imran', lastName: 'Khan', roleName: 'Inventory Staff' },
    { username: `waiter_ravi_${rand}`, roleType: 'WAITER', firstName: 'Ravi', lastName: 'Varma', roleName: 'Waiter' },
    { username: `kitchen_kumar_${rand}`, roleType: 'KITCHEN', firstName: 'Kumar', lastName: 'Chef', roleName: 'Kitchen' }
  ];

  const createdStaffMembers = {};
  const staffTokens = {};

  for (const staff of staffConfigs) {
    const createRes = await request('POST', '/team/members', {
      firstName: staff.firstName,
      lastName: staff.lastName,
      username: staff.username,
      email: `${staff.username}@royalspice.com`,
      password: 'StaffPassword@123',
      roleType: staff.roleType,
      roleName: staff.roleName,
      branchId: mainBranchId
    }, ownerToken);

    assert(createRes.status === 201, `Created ${staff.roleType} employee account (${staff.username})`);
    createdStaffMembers[staff.roleType] = createRes.data;
    passed++;

    // Perform separate login
    const loginRes = await request('POST', '/auth/login', {
      identifier: staff.username,
      password: 'StaffPassword@123'
    });

    const staffToken = loginRes.data?.accessToken || loginRes.data?.token;
    assert((loginRes.status === 200 || loginRes.status === 201) && !!staffToken, `Separate login succeeded for ${staff.roleType}`, loginRes);
    assert(loginRes.data.activeRole?.roleType === staff.roleType, `Auth response accurately reflects roleType ${staff.roleType}`);
    assert(loginRes.data.activeBranch?.id === mainBranchId, `Auth response accurately scopes to Main Branch`);
    staffTokens[staff.roleType] = staffToken;
    passed += 3;
  }

  // -------------------------------------------------------------
  // [BATTERY 3] Multi-User Realtime Order-to-Settlement Workflow
  // -------------------------------------------------------------
  console.log('\n[BATTERY 3] Multi-User Realtime Order-to-Settlement Workflow');

  // Connect Socket clients
  const waiterSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const kitchenSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const cashierSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const ownerSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });

  await new Promise((r) => setTimeout(r, 800));

  waiterSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  kitchenSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  cashierSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  ownerSocket.emit('join_branch', { organizationId, branchId: mainBranchId });

  await new Promise((r) => setTimeout(r, 400));

  // Step 1: Waiter Ravi creates Table T1 and Menu Product
  console.log('  -> Step 1: Waiter opens Table T1 and dispatches KOT');
  const tableRes = await request('POST', '/restaurant/tables', {
    tableNumber: `T1-${rand}`,
    capacity: 4,
    section: 'Fine Dining Hall'
  }, staffTokens['WAITER'], { 'x-branch-id': mainBranchId });
  assert(tableRes.status === 201, `Waiter created Table T1-${rand}`);
  const tableId = tableRes.data.id;
  passed++;

  // Create menu item as Owner/Manager
  const prodRes = await request('POST', '/products', {
    name: `Mughlai Biryani Special ${rand}`,
    sku: `DINE-BIRY-${rand}`,
    sellingPrice: 380,
    mrp: 380,
    purchasePrice: 180,
    taxRate: 5,
    category: 'Main Course',
    unit: 'PORTION'
  }, ownerToken);
  assert(prodRes.status === 201, `Owner created Menu Item`);
  const menuItemId = prodRes.data.id;
  passed++;

  // Waiter opens Table T1
  const occupyRes = await request('POST', `/restaurant/tables/${tableId}/occupy`, { guestCount: 2 }, staffTokens['WAITER']);
  assert(occupyRes.status === 201 && occupyRes.data.status === 'OCCUPIED', `Waiter occupied Table T1 (Status: OCCUPIED)`);
  passed++;

  // Waiter sends KOT
  let kitchenKotReceived = null;
  kitchenSocket.on('kot_updated', (data) => { kitchenKotReceived = data; });

  const kotPayload = {
    tableId,
    orderType: 'DINE_IN',
    guestCount: 2,
    notes: 'Mild spicy, extra raita',
    items: [
      {
        menuItemId,
        name: `Mughlai Biryani Special ${rand}`,
        quantity: 2,
        unitPrice: 380,
        variantName: 'Double Portion',
        notes: 'Mild spicy'
      }
    ]
  };

  const kotRes = await request('POST', '/restaurant/kots', kotPayload, staffTokens['WAITER'], { 'x-branch-id': mainBranchId });
  assert(kotRes.status === 201 && kotRes.data.kotNumber, `Waiter dispatched KOT (${kotRes.data.kotNumber})`);
  const kotId = kotRes.data.id;
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(kitchenKotReceived !== null, `Kitchen received real-time KOT event via Socket.IO`);
  passed++;

  // Step 2: Kitchen Kumar advances KOT status: NEW -> PREPARING -> READY
  console.log('  -> Step 2: Kitchen updates status NEW -> PREPARING -> READY');
  let waiterStatusReceived = null;
  waiterSocket.on('kot_updated', (data) => { waiterStatusReceived = data; });

  const prepRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'PREPARING' }, staffTokens['KITCHEN']);
  assert(prepRes.status === 200 && prepRes.data.status === 'PREPARING', `Kitchen advanced status to PREPARING`);
  passed++;

  const readyRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'READY' }, staffTokens['KITCHEN']);
  assert(readyRes.status === 200 && readyRes.data.status === 'READY', `Kitchen advanced status to READY`);
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(waiterStatusReceived !== null && waiterStatusReceived.status === 'READY', `Waiter received real-time READY alert`);
  passed++;

  // Step 3: Waiter delivers to table and marks KOT SERVED
  console.log('  -> Step 3: Waiter marks KOT SERVED');
  const servedRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'SERVED' }, staffTokens['WAITER']);
  assert(servedRes.status === 200 && servedRes.data.status === 'SERVED', `Waiter marked KOT SERVED`);
  passed++;

  // Step 4: Cashier Chandru settles Table T1 Bill
  console.log('  -> Step 4: Cashier computes bill and settles Table T1');
  const billSummaryRes = await request('GET', `/restaurant/tables/${tableId}/bill-summary`, null, staffTokens['CASHIER']);
  assert(billSummaryRes.status === 200 && billSummaryRes.data.grandTotal > 0, `Cashier retrieved Table bill summary (Grand Total: ₹${billSummaryRes.data.grandTotal})`);
  passed++;

  let ownerInvoiceReceived = null;
  ownerSocket.on('invoice_created', (data) => { ownerInvoiceReceived = data; });

  const settleRes = await request('POST', `/restaurant/tables/${tableId}/settle`, {
    paymentMethod: 'UPI',
    amountPaid: billSummaryRes.data.grandTotal,
    notes: 'Settled via GooglePay'
  }, staffTokens['CASHIER'], { 'x-branch-id': mainBranchId });

  assert(settleRes.status === 201 && settleRes.data.invoice?.invoiceNumber, `Cashier settled bill, generated Tax Invoice (${settleRes.data.invoice?.invoiceNumber})`);
  assert(settleRes.data.table?.status === 'AVAILABLE', `Table T1 immediately freed to AVAILABLE in PostgreSQL`);
  passed += 2;

  await new Promise((r) => setTimeout(r, 600));
  assert(ownerInvoiceReceived !== null, `Owner received real-time Invoice event`);
  passed++;

  // Disconnect sockets
  waiterSocket.disconnect();
  kitchenSocket.disconnect();
  cashierSocket.disconnect();
  ownerSocket.disconnect();

  // -------------------------------------------------------------
  // [BATTERY 4] Authoritative Backend Security & RBAC Enforcement (403 Forbidden)
  // -------------------------------------------------------------
  console.log('\n[BATTERY 4] Authoritative Backend Security & RBAC Enforcement (403 Rejections)');

  // 1. Waiter attempting to Settle a Bill -> 403 Forbidden
  const waiterSettleRes = await request('POST', `/restaurant/tables/${tableId}/settle`, {
    paymentMethod: 'CASH',
    amountPaid: 100
  }, staffTokens['WAITER']);
  assert(waiterSettleRes.status === 403, `Waiter settlement attempt rejected (403 Forbidden)`);
  passed++;

  // 2. Waiter attempting to Add Team Staff -> 403 Forbidden
  const waiterAddStaffRes = await request('POST', '/team/members', {
    firstName: 'Hacker',
    username: `hacker_${rand}`,
    password: 'password123',
    roleType: 'MANAGER'
  }, staffTokens['WAITER']);
  assert(waiterAddStaffRes.status === 403, `Waiter staff creation attempt rejected (403 Forbidden)`);
  passed++;

  // 3. Kitchen attempting to Add Staff -> 403 Forbidden
  const kitchenAddStaffRes = await request('POST', '/team/members', {
    firstName: 'Hacker',
    username: `hacker2_${rand}`,
    password: 'password123',
    roleType: 'MANAGER'
  }, staffTokens['KITCHEN']);
  assert(kitchenAddStaffRes.status === 403, `Kitchen staff creation attempt rejected (403 Forbidden)`);
  passed++;

  // 4. Kitchen attempting to View Invoices -> 403 Forbidden
  const kitchenInvoiceRes = await request('GET', '/invoices', null, staffTokens['KITCHEN']);
  assert(kitchenInvoiceRes.status === 403, `Kitchen invoice view attempt rejected (403 Forbidden)`);
  passed++;

  // 5. Cashier attempting to Add Staff -> 403 Forbidden
  const cashierAddStaffRes = await request('POST', '/team/members', {
    firstName: 'Hacker',
    username: `hacker3_${rand}`,
    password: 'password123',
    roleType: 'MANAGER'
  }, staffTokens['CASHIER']);
  assert(cashierAddStaffRes.status === 403, `Cashier staff creation attempt rejected (403 Forbidden)`);
  passed++;

  // 6. Non-Restaurant (Wholesale) User calling Restaurant Tables -> 403 Forbidden
  const wholesaleRes = await request('POST', '/onboarding/create-business', {
    owner: {
      firstName: 'Wholesale',
      lastName: 'Owner',
      mobileNumber: `96${rand}5555`,
      email: `wholesale.${rand}@tradecorp.com`,
      username: `wholesale.${rand}`,
      password: 'Password@123'
    },
    businessType: 'WHOLESALE',
    business: {
      name: `Wholesale Trade Corp ${rand}`,
      legalName: `Wholesale Trade Corporation ${rand}`,
      phone: `96${rand}5555`,
      email: `wholesale.${rand}@tradecorp.com`,
      address: '100 Dockyard Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    },
    branches: [
      {
        name: 'Central Warehouse',
        code: `WH${rand}`,
        address: '100 Dockyard Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: `96${rand}5555`,
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
    }
  });
  assert(wholesaleRes.status === 201, `Wholesale business created for cross-domain security test`, wholesaleRes);
  const wholesaleToken = wholesaleRes.data.accessToken || wholesaleRes.data.token;
  passed++;

  const crossDomainRes = await request('GET', '/restaurant/tables', null, wholesaleToken);
  assert(crossDomainRes.status === 403, `Wholesale cross-domain call to /restaurant/tables rejected (403 Forbidden)`);
  passed++;

  // -------------------------------------------------------------
  // [BATTERY 5] Staff Role Promotion, Dynamic Permissions & Deactivation Security
  // -------------------------------------------------------------
  console.log('\n[BATTERY 5] Staff Role Promotion, Dynamic Permissions & Deactivation Security');

  const waiterMemberId = createdStaffMembers['WAITER'].id;
  const cashierRoleId = rolesRes.data.find(r => r.roleType === 'CASHIER')?.id;

  // 1. Owner promotes Waiter Ravi to Cashier
  const promoteRes = await request('PUT', `/team/members/${waiterMemberId}`, {
    roleId: cashierRoleId,
    roleName: 'Cashier'
  }, ownerToken);
  assert(promoteRes.status === 200, `Owner promoted Waiter Ravi to Cashier role`);
  passed++;

  // Ravi logs in again and obtains Cashier permissions
  const raviNewLoginRes = await request('POST', '/auth/login', {
    identifier: `waiter_ravi_${rand}`,
    password: 'StaffPassword@123'
  });
  assert((raviNewLoginRes.status === 200 || raviNewLoginRes.status === 201) && raviNewLoginRes.data.activeRole?.roleType === 'CASHIER', `Ravi logged in with updated roleType CASHIER`, raviNewLoginRes);
  passed++;

  // 2. Owner deactivates Ravi's account
  const deactivateRes = await request('PUT', `/team/members/${waiterMemberId}`, {
    isActive: false
  }, ownerToken);
  assert(deactivateRes.status === 200, `Owner deactivated Ravi's account`);
  passed++;

  // Deactivated Ravi's subsequent login must fail
  const raviBlockedLogin = await request('POST', '/auth/login', {
    identifier: `waiter_ravi_${rand}`,
    password: 'StaffPassword@123'
  });
  assert(raviBlockedLogin.status === 401 || raviBlockedLogin.status === 403, `Deactivated employee login rejected (Status ${raviBlockedLogin.status})`);
  passed++;

  // -------------------------------------------------------------
  // [BATTERY 6] Super Admin Telemetry & Real PostgreSQL Verification
  // -------------------------------------------------------------
  console.log('\n[BATTERY 6] Super Admin Telemetry & Real PostgreSQL Verification');

  // Super Admin login
  const saLogin = await request('POST', '/auth/login', {
    identifier: 'superadmin@aescion.com',
    password: 'Aescion@Super#2026'
  });
  const saToken = saLogin.data?.accessToken || saLogin.data?.token;
  assert((saLogin.status === 200 || saLogin.status === 201) && !!saToken, `Super Admin authenticated successfully`, saLogin);
  passed++;

  // Super Admin inspects Platform Stats and Restaurant Company Details
  const saStatsRes = await request('GET', '/super-admin/stats', null, saToken);
  assert(saStatsRes.status === 200 && saStatsRes.data.totalCompanies >= 1, `Super Admin retrieved platform stats`);
  passed++;

  const saCompanyRes = await request('GET', `/super-admin/companies/${organizationId}`, null, saToken);
  assert(saCompanyRes.status === 200 && saCompanyRes.data.name, `Super Admin retrieved Restaurant Company details`);
  passed++;

  const saInvoicesRes = await request('GET', `/super-admin/companies/${organizationId}/invoices`, null, saToken);
  assert(saInvoicesRes.status === 200 && Array.isArray(saInvoicesRes.data) && saInvoicesRes.data.length >= 1, `Super Admin retrieved Restaurant settled Invoices`);
  passed++;

  // Owner views Dashboard Pulse
  const ownerPulseRes = await request('GET', '/reports/dashboard-pulse?period=TODAY', null, ownerToken);
  assert(ownerPulseRes.status === 200 && (ownerPulseRes.data.totalRevenue >= 0 || ownerPulseRes.data.metrics?.totalSales >= 0), `Owner retrieved live Dashboard Pulse with real revenue`, ownerPulseRes);
  passed++;

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed} RESTAURANT RBAC, ROLE PARITY & SECURITY TESTS PASSED!`);
  console.log('================================================================\n');

  return { passed, total: passed };
}

if (process.argv[1]?.endsWith('test_restaurant_roles_and_security_suite.mjs')) {
  run()
    .then((res) => {
      console.log(`Suite result: ${res.passed}/${res.total} passed`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error in suite:', err);
      process.exit(1);
    });
}
