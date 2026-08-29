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

export async function runAudit() {
  console.log('\n================================================================');
  console.log('🔍 AESCION COMMERCE — RESTAURANT RBAC FINAL GAP AUDIT & RUNTIME VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  const rand = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // [CHECK 1] Restaurant Enterprise Onboarding & 0 Dummy Users
  // -------------------------------------------------------------
  console.log('[CHECK 1] Restaurant Enterprise Onboarding & Zero Fake Users');
  const orgPayload = {
    owner: {
      firstName: 'Chef',
      lastName: 'Tarla',
      mobileNumber: `98${rand}1111`,
      email: `tarla.${rand}@gourmet.com`,
      username: `tarla.${rand}`,
      password: 'Password@123'
    },
    businessType: 'RESTAURANT',
    business: {
      name: `Tarla Gourmet Bistro ${rand}`,
      legalName: `Tarla Gourmet Foods Pvt Ltd ${rand}`,
      phone: `98${rand}1111`,
      email: `tarla.${rand}@gourmet.com`,
      address: '45 Indiranagar 100ft Rd',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560038',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: `29AAACT${rand}P1Z2`
    },
    branches: [
      {
        name: 'Indiranagar Flagship',
        code: `TG${rand}`,
        address: '45 Indiranagar 100ft Rd',
        city: 'Bangalore',
        state: 'Karnataka',
        phone: `98${rand}1111`,
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
        tableCount: 8,
        enableKDS: true
      }
    }
  };

  const onboardRes = await request('POST', '/onboarding/create-business', orgPayload);
  assert(onboardRes.status === 201, `Restaurant registered with status 201`, onboardRes);
  passed++;

  const ownerToken = onboardRes.data.accessToken || onboardRes.data.token;
  const organizationId = onboardRes.data.organization.id;
  const mainBranchId = onboardRes.data.activeBranch?.id || onboardRes.data.branches?.[0]?.id;
  assert(ownerToken && organizationId && mainBranchId, `Owner token and Branch ID generated`);
  passed++;

  // Verify that team members count is exactly 1 (the Owner) and 0 fake staff users exist
  const initialMembersRes = await request('GET', '/team/members', null, ownerToken);
  assert(initialMembersRes.status === 200 && Array.isArray(initialMembersRes.data), `Fetched organization team members`);
  assert(initialMembersRes.data.length === 1, `Exactly 1 member exists (the Owner) — ZERO fake staff accounts created`);
  const memberOwner = initialMembersRes.data[0].user || initialMembersRes.data[0];
  assert(memberOwner.username === `tarla.${rand}`, `Initial single member matches the real Owner account`);
  passed += 2;

  // -------------------------------------------------------------
  // [CHECK 2] Role List: Exactly 7 Operational Roles, 6 Assignable Staff Roles
  // -------------------------------------------------------------
  console.log('\n[CHECK 2] Role List & Role Selector Scoping');
  const rolesRes = await request('GET', '/team/roles', null, ownerToken);
  assert(rolesRes.status === 200 && Array.isArray(rolesRes.data), `Fetched organization roles`);
  passed++;

  const roleTypes = rolesRes.data.map((r) => r.roleType);
  const expectedRoles = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'WAITER', 'KITCHEN'];

  assert(rolesRes.data.length === 7, `Total Restaurant role templates is exactly 7`);
  expectedRoles.forEach((r) => {
    assert(roleTypes.includes(r), `Seeded role ${r} exists in PostgreSQL`);
    passed++;
  });

  // Must EXCLUDE platform and other industry roles
  assert(!roleTypes.includes('SUPER_ADMIN'), `SUPER_ADMIN strictly excluded from Restaurant staff roles`);
  assert(!roleTypes.includes('CUSTOM'), `CUSTOM strictly excluded from Restaurant staff roles`);
  assert(!roleTypes.includes('TECHNICIAN'), `TECHNICIAN strictly excluded from Restaurant staff roles`);
  assert(!roleTypes.includes('CAPTAIN'), `CAPTAIN strictly excluded from Restaurant staff roles`);
  passed += 5;

  // -------------------------------------------------------------
  // [CHECK 3] Create Real Employee Accounts & Test Separate Logins
  // -------------------------------------------------------------
  console.log('\n[CHECK 3] Real Employee Accounts & Individual Logins');

  const staffConfigs = [
    { username: `mgr_raghu_${rand}`, roleType: 'MANAGER', firstName: 'Raghu', lastName: 'Nath' },
    { username: `wtr_kiran_${rand}`, roleType: 'WAITER', firstName: 'Kiran', lastName: 'Kumar' },
    { username: `kds_subhash_${rand}`, roleType: 'KITCHEN', firstName: 'Subhash', lastName: 'Ghai' },
    { username: `csh_leela_${rand}`, roleType: 'CASHIER', firstName: 'Leela', lastName: 'Devi' }
  ];

  const staffTokens = {};
  const staffMemberIds = {};

  for (const staff of staffConfigs) {
    const createRes = await request(
      'POST',
      '/team/members',
      {
        firstName: staff.firstName,
        lastName: staff.lastName,
        username: staff.username,
        email: `${staff.username}@gourmet.com`,
        password: 'EmployeePassword@123',
        roleType: staff.roleType,
        roleName: staff.roleType,
        branchId: mainBranchId
      },
      ownerToken
    );

    assert(createRes.status === 201, `Owner created ${staff.roleType} account (${staff.username})`);
    staffMemberIds[staff.roleType] = createRes.data.id;
    passed++;

    // Separate login
    const loginRes = await request('POST', '/auth/login', {
      identifier: staff.username,
      password: 'EmployeePassword@123'
    });

    const token = loginRes.data?.accessToken || loginRes.data?.token;
    assert((loginRes.status === 200 || loginRes.status === 201) && !!token, `Separate login succeeded for ${staff.roleType}`);
    assert(loginRes.data.activeRole?.roleType === staff.roleType, `Role in auth response matches ${staff.roleType}`);
    staffTokens[staff.roleType] = token;
    passed += 2;
  }

  // -------------------------------------------------------------
  // [CHECK 4] Session & Authoritative Role Change Security (No Stale Token Bypass)
  // -------------------------------------------------------------
  console.log('\n[CHECK 4] Session Security: DB-Backed Auth & Stale Token Invalidation');

  const waiterToken = staffTokens['WAITER'];
  const waiterId = staffMemberIds['WAITER'];
  const cashierRoleId = rolesRes.data.find((r) => r.roleType === 'CASHIER')?.id;

  // 1. Waiter tries to settle a bill using their token -> 403 Forbidden
  const forbiddenSettle = await request('POST', `/restaurant/tables/some-id/settle`, { paymentMethod: 'CASH' }, waiterToken);
  assert(forbiddenSettle.status === 403, `Waiter token blocked from settling bills (403 Forbidden)`);
  passed++;

  // 2. Owner promotes Waiter Kiran to CASHIER in database
  const promoRes = await request(
    'PUT',
    `/team/members/${waiterId}`,
    {
      roleId: cashierRoleId,
      roleName: 'Cashier'
    },
    ownerToken
  );
  assert(promoRes.status === 200, `Owner promoted Waiter Kiran to CASHIER in database`);
  passed++;

  // 3. Now Kiran's token is authoritatively validated against PostgreSQL in JwtStrategy:
  // Kiran creates a Table (allowed by Cashier and Waiter)
  const newTableRes = await request(
    'POST',
    '/restaurant/tables',
    {
      tableNumber: `T-AUDIT-${rand}`,
      capacity: 4,
      section: 'Terrace'
    },
    waiterToken,
    { 'x-branch-id': mainBranchId }
  );
  assert(newTableRes.status === 201, `Promoted staff created Table with existing token`);
  const auditTableId = newTableRes.data.id;
  passed++;

  // 4. Owner DEACTIVATES Kiran's account in database
  const deactRes = await request('PUT', `/team/members/${waiterId}`, { isActive: false }, ownerToken);
  assert(deactRes.status === 200, `Owner deactivated Kiran's account`);
  passed++;

  // 5. Kiran's existing token MUST now immediately be REJECTED (401 Unauthorized) because JwtStrategy validates active status in PostgreSQL!
  const blockedRequest = await request('GET', '/restaurant/tables', null, waiterToken);
  assert(
    blockedRequest.status === 401 || blockedRequest.status === 403,
    `Deactivated staff existing token IMMEDIATELY rejected on API (Status: ${blockedRequest.status})`
  );
  passed++;

  // -------------------------------------------------------------
  // [CHECK 5] Complete Real Multi-User Workflow: Order -> KDS -> Ready -> Settle
  // -------------------------------------------------------------
  console.log('\n[CHECK 5] Real Multi-User Live Order-to-Settlement Workflow');

  // Create a clean Waiter account for the workflow
  const waiter2Res = await request(
    'POST',
    '/team/members',
    {
      firstName: 'Vikram',
      lastName: 'Waiter',
      username: `wtr_vikram_${rand}`,
      email: `wtr_vikram_${rand}@gourmet.com`,
      password: 'EmployeePassword@123',
      roleType: 'WAITER',
      roleName: 'Waiter',
      branchId: mainBranchId
    },
    ownerToken
  );
  assert(waiter2Res.status === 201, `Created active Waiter Vikram`);
  passed++;

  const waiter2Login = await request('POST', '/auth/login', {
    identifier: `wtr_vikram_${rand}`,
    password: 'EmployeePassword@123'
  });
  const activeWaiterToken = waiter2Login.data?.accessToken;
  assert(!!activeWaiterToken, `Active Waiter Vikram authenticated`);
  passed++;

  // Connect WebSockets for Waiter, Kitchen, Cashier, Owner
  const wSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const kSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const cSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });
  const oSocket = io('http://127.0.0.1:4000', { transports: ['websocket'] });

  await new Promise((r) => setTimeout(r, 600));

  wSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  kSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  cSocket.emit('join_branch', { organizationId, branchId: mainBranchId });
  oSocket.emit('join_branch', { organizationId, branchId: mainBranchId });

  await new Promise((r) => setTimeout(r, 400));

  // Step A: Menu Item creation
  const menuRes = await request(
    'POST',
    '/products',
    {
      name: `Paneer Tikka Platter ${rand}`,
      sku: `PT-${rand}`,
      sellingPrice: 320,
      mrp: 320,
      purchasePrice: 150,
      taxRate: 5,
      category: 'Starters',
      unit: 'PLATE'
    },
    ownerToken
  );
  assert(menuRes.status === 201, `Owner created Menu Item: Paneer Tikka Platter`);
  const menuItemId = menuRes.data.id;
  passed++;

  // Step B: Waiter occupies Table
  const tableOccupyRes = await request('POST', `/restaurant/tables/${auditTableId}/occupy`, { guestCount: 3 }, activeWaiterToken);
  assert(tableOccupyRes.status === 201 && tableOccupyRes.data.status === 'OCCUPIED', `Waiter occupied Table T-AUDIT-${rand}`);
  passed++;

  // Step C: Waiter dispatches KOT
  let kdsReceived = null;
  kSocket.on('kot_updated', (data) => {
    kdsReceived = data;
  });

  const kotRes = await request(
    'POST',
    '/restaurant/kots',
    {
      tableId: auditTableId,
      orderType: 'DINE_IN',
      guestCount: 3,
      notes: 'Crispy and spicy',
      items: [
        {
          menuItemId,
          name: `Paneer Tikka Platter ${rand}`,
          quantity: 2,
          unitPrice: 320,
          notes: 'Crispy'
        }
      ]
    },
    activeWaiterToken,
    { 'x-branch-id': mainBranchId }
  );

  assert(kotRes.status === 201 && kotRes.data.kotNumber, `Waiter dispatched KOT (${kotRes.data.kotNumber})`);
  const kotId = kotRes.data.id;
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(kdsReceived !== null, `Kitchen KDS screen received real-time KOT via Socket.IO`);
  passed++;

  // Step D: Kitchen Kumar advances KOT status: NEW -> PREPARING -> READY
  let waiterReadyAlert = null;
  wSocket.on('kot_updated', (data) => {
    if (data.status === 'READY') waiterReadyAlert = data;
  });

  const prepRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'PREPARING' }, staffTokens['KITCHEN']);
  assert(prepRes.status === 200 && prepRes.data.status === 'PREPARING', `Kitchen advanced status to PREPARING`);
  passed++;

  const readyRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'READY' }, staffTokens['KITCHEN']);
  assert(readyRes.status === 200 && readyRes.data.status === 'READY', `Kitchen marked ticket READY`);
  passed++;

  await new Promise((r) => setTimeout(r, 600));
  assert(waiterReadyAlert !== null, `Waiter received real-time READY alert for Table`);
  passed++;

  // Step E: Waiter marks ticket SERVED
  const servedRes = await request('PUT', `/restaurant/kots/${kotId}/status`, { status: 'SERVED' }, activeWaiterToken);
  assert(servedRes.status === 200 && servedRes.data.status === 'SERVED', `Waiter marked KOT SERVED`);
  passed++;

  // Step F: Cashier computes bill and settles Table
  const billSummaryRes = await request('GET', `/restaurant/tables/${auditTableId}/bill-summary`, null, staffTokens['CASHIER']);
  assert(billSummaryRes.status === 200 && billSummaryRes.data.grandTotal === 672, `Cashier retrieved Bill Summary: Grand Total ₹672 (₹640 + 5% GST ₹32)`);
  passed++;

  let ownerInvoiceLive = null;
  oSocket.on('invoice_created', (data) => {
    ownerInvoiceLive = data;
  });

  const settleRes = await request(
    'POST',
    `/restaurant/tables/${auditTableId}/settle`,
    {
      paymentMethod: 'UPI',
      amountPaid: 672,
      notes: 'Paid via GPay'
    },
    staffTokens['CASHIER'],
    { 'x-branch-id': mainBranchId }
  );

  assert(settleRes.status === 201 && settleRes.data.invoice?.invoiceNumber, `Cashier settled bill & generated Tax Invoice (${settleRes.data.invoice?.invoiceNumber})`);
  assert(settleRes.data.table?.status === 'AVAILABLE', `Table T-AUDIT-${rand} instantly released to AVAILABLE state in PostgreSQL`);
  passed += 2;

  await new Promise((r) => setTimeout(r, 600));
  assert(ownerInvoiceLive !== null, `Owner received live Invoice broadcast event`);
  passed++;

  // Disconnect Sockets
  wSocket.disconnect();
  kSocket.disconnect();
  cSocket.disconnect();
  oSocket.disconnect();

  // -------------------------------------------------------------
  // [CHECK 6] Super Admin Scoped Inspection & Live Pulse
  // -------------------------------------------------------------
  console.log('\n[CHECK 6] Super Admin Scoped Telemetry & Owner Live Pulse');

  const saLogin = await request('POST', '/auth/login', {
    identifier: 'superadmin@aescion.com',
    password: 'Aescion@Super#2026'
  });
  const saToken = saLogin.data?.accessToken;
  assert(!!saToken, `Super Admin authenticated`);
  passed++;

  const saCompanyRes = await request('GET', `/super-admin/companies/${organizationId}`, null, saToken);
  assert(saCompanyRes.status === 200 && saCompanyRes.data.name === orgPayload.business.name, `Super Admin inspected Restaurant Company details`);
  passed++;

  const saInvoicesRes = await request('GET', `/super-admin/companies/${organizationId}/invoices`, null, saToken);
  assert(saInvoicesRes.status === 200 && saInvoicesRes.data.length >= 1, `Super Admin inspected live restaurant invoices`);
  passed++;

  const ownerPulseRes = await request('GET', '/reports/dashboard-pulse?period=TODAY', null, ownerToken);
  assert(ownerPulseRes.status === 200 && (ownerPulseRes.data.totalRevenue > 0 || ownerPulseRes.data.metrics?.totalSales > 0), `Owner live Dashboard Pulse reflects real revenue`);
  passed++;

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed} FINAL RESTAURANT GAP AUDIT TESTS PASSED WITH 100% SUCCESS!`);
  console.log('================================================================\n');

  return { passed, total: passed };
}

if (process.argv[1]?.endsWith('test_restaurant_final_audit.mjs')) {
  runAudit()
    .then((res) => {
      console.log(`Final Audit Result: ${res.passed}/${res.total} passed`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error in final audit:', err);
      process.exit(1);
    });
}
