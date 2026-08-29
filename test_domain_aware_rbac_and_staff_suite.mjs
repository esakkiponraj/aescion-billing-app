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

export async function runDomainSuite() {
  console.log('\n================================================================');
  console.log('🌐 AESCION COMMERCE — DOMAIN-AWARE RBAC, CUSTOM ROLES & MULTI-DOMAIN AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  const rand = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // [PHASE 1] Onboard 6 Enterprises Across All 6 Business Domains
  // -------------------------------------------------------------
  console.log('[PHASE 1] Provisioning 6 Enterprises across all 6 Business Domains');

  const domains = [
    { type: 'RESTAURANT', name: `Grand Spice Dine ${rand}`, owner: `chef.${rand}` },
    { type: 'SUPERMARKET', name: `DailyMart Hypermarket ${rand}`, owner: `mart.${rand}` },
    { type: 'SERVICE', name: `FixRight Tech Service ${rand}`, owner: `service.${rand}` },
    { type: 'WHOLESALE', name: `Metro B2B Wholesale ${rand}`, owner: `wholesale.${rand}` },
    { type: 'PHARMACY', name: `CarePlus Medico ${rand}`, owner: `pharma.${rand}` },
    { type: 'RETAIL', name: `StyleVogue Fashion ${rand}`, owner: `retail.${rand}` }
  ];

  const domainTokens = {};
  const domainOrgIds = {};
  const domainBranchIds = {};

  for (const d of domains) {
    const res = await request('POST', '/onboarding/create-business', {
      owner: {
        firstName: d.type,
        lastName: 'Owner',
        mobileNumber: `98${rand}1001`,
        email: `${d.owner}@aescion.com`,
        username: d.owner,
        password: 'Password@123'
      },
      businessType: d.type,
      business: {
        name: d.name,
        legalName: `${d.name} Pvt Ltd`,
        phone: `98${rand}1001`,
        email: `${d.owner}@aescion.com`,
        address: 'Sector 5 Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        pinCode: '560100',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: true,
        gstin: `29AAAAA${rand}Z1`
      },
      branches: [
        {
          name: `${d.name} - Main Branch`,
          code: `${d.type.substring(0, 3)}${rand}`,
          address: 'Sector 5 Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          phone: `98${rand}1001`,
          isMain: true
        }
      ],
      teamSetupMode: 'JUST_ME',
      taxSettings: { taxMode: 'EXCLUSIVE', defaultRates: [0, 5, 12, 18, 28] },
      billingSettings: { invoicePrefix: 'INV', quotationPrefix: 'QTN', receiptPrefix: 'RCP' }
    });

    assert(res.status === 201, `Onboarded ${d.type} company: ${d.name}`, res.data);
    domainTokens[d.type] = res.data.accessToken || res.data.token;
    domainOrgIds[d.type] = res.data.organization.id;
    domainBranchIds[d.type] = res.data.activeBranch?.id || res.data.branches?.[0]?.id;
    passed++;
  }

  // -------------------------------------------------------------
  // [PHASE 2] Domain-Specific Role Templates & Strict Isolation
  // -------------------------------------------------------------
  console.log('\n[PHASE 2] Domain-Specific Role Template Filtering');

  // A. RESTAURANT Role Templates
  const restRolesRes = await request('GET', '/team/roles', null, domainTokens['RESTAURANT']);
  const restRoleTypes = restRolesRes.data.map((r) => r.roleType);
  assert(restRoleTypes.includes('WAITER'), `RESTAURANT contains WAITER role template`);
  assert(restRoleTypes.includes('KITCHEN'), `RESTAURANT contains KITCHEN role template`);
  assert(!restRoleTypes.includes('TECHNICIAN'), `RESTAURANT strictly excludes TECHNICIAN`);
  passed += 3;

  // B. SERVICE Role Templates
  const serviceRolesRes = await request('GET', '/team/roles', null, domainTokens['SERVICE']);
  const serviceRoleTypes = serviceRolesRes.data.map((r) => r.roleType);
  assert(serviceRoleTypes.includes('TECHNICIAN'), `SERVICE contains TECHNICIAN role template`);
  assert(!serviceRoleTypes.includes('WAITER'), `SERVICE strictly excludes WAITER`);
  assert(!serviceRoleTypes.includes('KITCHEN'), `SERVICE strictly excludes KITCHEN`);
  passed += 3;

  // C. SUPERMARKET Role Templates
  const superRolesRes = await request('GET', '/team/roles', null, domainTokens['SUPERMARKET']);
  const superRoleTypes = superRolesRes.data.map((r) => r.roleType);
  assert(superRoleTypes.includes('CASHIER'), `SUPERMARKET contains CASHIER role template`);
  assert(!superRoleTypes.includes('WAITER'), `SUPERMARKET strictly excludes WAITER`);
  assert(!superRoleTypes.includes('KITCHEN'), `SUPERMARKET strictly excludes KITCHEN`);
  assert(!superRoleTypes.includes('TECHNICIAN'), `SUPERMARKET strictly excludes TECHNICIAN`);
  passed += 4;

  // D. WHOLESALE, PHARMACY, RETAIL Role Templates
  const wholesaleRolesRes = await request('GET', '/team/roles', null, domainTokens['WHOLESALE']);
  const wholesaleRoleTypes = wholesaleRolesRes.data.map((r) => r.roleType);
  assert(!wholesaleRoleTypes.includes('WAITER') && !wholesaleRoleTypes.includes('TECHNICIAN'), `WHOLESALE strictly excludes WAITER & TECHNICIAN`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 3] Custom Role Creation & Backend Cross-Domain Rejection
  // -------------------------------------------------------------
  console.log('\n[PHASE 3] Custom Role Creation & Cross-Domain Permission Guard');

  // A. Restaurant Owner creates legitimate Custom Role "Restaurant Shift Supervisor"
  const restCustomRes = await request(
    'POST',
    '/team/roles',
    {
      name: 'Restaurant Shift Supervisor',
      permissions: [
        'pos:access',
        'pos:create_bill',
        'restaurant:tables',
        'restaurant:kot',
        'invoice:view',
        'customer:view'
      ]
    },
    domainTokens['RESTAURANT']
  );
  assert(restCustomRes.status === 201, `Restaurant Owner successfully created Custom Role with Restaurant permissions`);
  const restCustomRoleId = restCustomRes.data.id;
  passed++;

  // B. Restaurant Owner attempts to assign "wholesale:dispatch" -> REJECTED (400)
  const restCrossReject = await request(
    'POST',
    '/team/roles',
    {
      name: 'Illegal Wholesale Waiter',
      permissions: ['restaurant:tables', 'wholesale:dispatch']
    },
    domainTokens['RESTAURANT']
  );
  assert(restCrossReject.status === 400, `Restaurant Owner blocked from assigning wholesale:dispatch (400 Bad Request)`);
  passed++;

  // C. Supermarket Owner attempts to assign "restaurant:kot" -> REJECTED (400)
  const superCrossReject = await request(
    'POST',
    '/team/roles',
    {
      name: 'Illegal Kitchen Cashier',
      permissions: ['pos:access', 'restaurant:kot']
    },
    domainTokens['SUPERMARKET']
  );
  assert(superCrossReject.status === 400, `Supermarket Owner blocked from assigning restaurant:kot (400 Bad Request)`);
  passed++;

  // D. Service Owner attempts to assign "pharmacy:expired_manage" -> REJECTED (400)
  const serviceCrossReject = await request(
    'POST',
    '/team/roles',
    {
      name: 'Illegal Pharmacy Tech',
      permissions: ['service:job_update', 'pharmacy:expired_manage']
    },
    domainTokens['SERVICE']
  );
  assert(serviceCrossReject.status === 400, `Service Owner blocked from assigning pharmacy:expired_manage (400 Bad Request)`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 4] Separate Staff Account Creation & Unique Logins
  // -------------------------------------------------------------
  console.log('\n[PHASE 4] Separate Staff Account Creation & Unique Logins');

  // 1. Restaurant Waiter (Raju)
  const restStaff = await request(
    'POST',
    '/team/members',
    {
      firstName: 'Raju',
      lastName: 'Waiter',
      username: `raju_waiter_${rand}`,
      email: `raju.${rand}@restaurant.com`,
      password: 'StaffPassword@123',
      roleType: 'WAITER',
      roleName: 'WAITER',
      branchId: domainBranchIds['RESTAURANT']
    },
    domainTokens['RESTAURANT']
  );
  assert(restStaff.status === 201, `Restaurant Owner created Waiter Raju account`);
  passed++;

  // 2. Supermarket Cashier (Priya)
  const superStaff = await request(
    'POST',
    '/team/members',
    {
      firstName: 'Priya',
      lastName: 'Cashier',
      username: `priya_cashier_${rand}`,
      email: `priya.${rand}@supermarket.com`,
      password: 'StaffPassword@123',
      roleType: 'CASHIER',
      roleName: 'CASHIER',
      branchId: domainBranchIds['SUPERMARKET']
    },
    domainTokens['SUPERMARKET']
  );
  assert(superStaff.status === 201, `Supermarket Owner created Cashier Priya account`);
  const priyaMemberId = superStaff.data.id;
  passed++;

  // 3. Service Technician (Manoj)
  const serviceStaff = await request(
    'POST',
    '/team/members',
    {
      firstName: 'Manoj',
      lastName: 'Tech',
      username: `manoj_tech_${rand}`,
      email: `manoj.${rand}@service.com`,
      password: 'StaffPassword@123',
      roleType: 'TECHNICIAN',
      roleName: 'TECHNICIAN',
      branchId: domainBranchIds['SERVICE']
    },
    domainTokens['SERVICE']
  );
  assert(serviceStaff.status === 201, `Service Owner created Technician Manoj account`);
  passed++;

  // Log in as Waiter Raju
  const rajuLogin = await request('POST', '/auth/login', {
    identifier: `raju_waiter_${rand}`,
    password: 'StaffPassword@123'
  });
  const rajuToken = rajuLogin.data?.accessToken;
  assert(!!rajuToken && rajuLogin.data.activeRole?.roleType === 'WAITER', `Waiter Raju logged in with WAITER role`);
  passed++;

  // Log in as Cashier Priya
  const priyaLogin = await request('POST', '/auth/login', {
    identifier: `priya_cashier_${rand}`,
    password: 'StaffPassword@123'
  });
  const priyaToken = priyaLogin.data?.accessToken;
  assert(!!priyaToken && priyaLogin.data.activeRole?.roleType === 'CASHIER', `Cashier Priya logged in with CASHIER role`);
  passed++;

  // Log in as Technician Manoj
  const manojLogin = await request('POST', '/auth/login', {
    identifier: `manoj_tech_${rand}`,
    password: 'StaffPassword@123'
  });
  const manojToken = manojLogin.data?.accessToken;
  assert(!!manojToken && manojLogin.data.activeRole?.roleType === 'TECHNICIAN', `Technician Manoj logged in with TECHNICIAN role`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 5] Cross-Domain & Cross-Permission API Protection (Backend 403)
  // -------------------------------------------------------------
  console.log('\n[PHASE 5] Authoritative Cross-Domain API Rejection (403)');

  // 1. Restaurant Waiter calls Wholesale API -> 403 Forbidden
  const restToWholesale = await request('GET', '/wholesale/orders', null, rajuToken);
  assert(restToWholesale.status === 403, `Restaurant Waiter blocked from /wholesale/orders (403 Forbidden)`);
  passed++;

  // 2. Supermarket Cashier calls Restaurant Tables API -> 403 Forbidden
  const superToRest = await request('GET', '/restaurant/tables', null, priyaToken);
  assert(superToRest.status === 403, `Supermarket Cashier blocked from /restaurant/tables (403 Forbidden)`);
  passed++;

  // 3. Service Technician calls Pharmacy Medicines API -> 403 Forbidden
  const serviceToPharma = await request('GET', '/pharmacy/medicines', null, manojToken);
  assert(serviceToPharma.status === 403, `Service Technician blocked from /pharmacy/medicines (403 Forbidden)`);
  passed++;

  // 4. Restaurant Waiter tries to create employee -> 403 Forbidden (Missing user:create)
  const waiterCreateStaff = await request(
    'POST',
    '/team/members',
    {
      firstName: 'Illegal',
      username: `illegal_${rand}`,
      password: 'password123',
      roleType: 'WAITER'
    },
    rajuToken
  );
  assert(waiterCreateStaff.status === 403, `Waiter blocked from creating team members (403 Forbidden)`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 6] Dynamic Permission Promotion & Account Deactivation Security
  // -------------------------------------------------------------
  console.log('\n[PHASE 6] DB-Backed Dynamic Role Update & Immediate Deactivation');

  // A. Supermarket Owner promotes Priya to MANAGER in DB
  const managerRole = superRolesRes.data.find((r) => r.roleType === 'MANAGER');
  const promoRes = await request(
    'PUT',
    `/team/members/${priyaMemberId}`,
    {
      roleId: managerRole.id,
      roleName: 'MANAGER'
    },
    domainTokens['SUPERMARKET']
  );
  assert(promoRes.status === 200, `Owner promoted Cashier Priya to MANAGER in PostgreSQL`);
  passed++;

  // B. Supermarket Owner deactivates Priya's account
  const deactRes = await request(
    'PUT',
    `/team/members/${priyaMemberId}`,
    {
      isActive: false
    },
    domainTokens['SUPERMARKET']
  );
  assert(deactRes.status === 200, `Owner deactivated Priya's membership in PostgreSQL`);
  passed++;

  // C. Priya's existing JWT is immediately rejected (401 Unauthorized) on subsequent API calls
  const deactCall = await request('GET', '/customers', null, priyaToken);
  assert(deactCall.status === 401 || deactCall.status === 403, `Deactivated staff token IMMEDIATELY blocked on API (Status: ${deactCall.status})`);
  passed++;

  // -------------------------------------------------------------
  // [PHASE 7] Super Admin Platform Visibility Across All 6 Domains
  // -------------------------------------------------------------
  console.log('\n[PHASE 7] Super Admin Multi-Domain Telemetry & Audit');

  const saLogin = await request('POST', '/auth/login', {
    identifier: 'superadmin@aescion.com',
    password: 'Aescion@Super#2026'
  });
  const saToken = saLogin.data?.accessToken;
  assert(!!saToken, `Super Admin authenticated`);
  passed++;

  const saStatsRes = await request('GET', '/super-admin/stats', null, saToken);
  assert(saStatsRes.status === 200 && (saStatsRes.data.totalCompanies >= 6 || saStatsRes.data.totalOrganizations >= 6 || saStatsRes.data.companiesCount >= 6), `Super Admin retrieved platform stats spanning all 6 domains`);
  passed++;

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed} DOMAIN-AWARE RBAC, CUSTOM ROLE & MULTI-DOMAIN AUDIT TESTS PASSED!`);
  console.log('================================================================\n');

  return { passed, total: passed };
}

if (process.argv[1]?.endsWith('test_domain_aware_rbac_and_staff_suite.mjs')) {
  runDomainSuite()
    .then((res) => {
      console.log(`Domain Suite Result: ${res.passed}/${res.total} passed`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error in domain suite:', err);
      process.exit(1);
    });
}
