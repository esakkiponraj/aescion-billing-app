import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:4000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:4000';

async function runSuperAdminTestSuite() {
  console.log('====================================================');
  console.log('  AESCION COMMERCE — SUPER ADMIN PLATFORM TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PHASE 1: SUPER ADMIN AUTH & BOOTSTRAP VERIFICATION
    // -------------------------------------------------------------
    console.log('[PHASE 1] Super Admin Authentication & RBAC Checks');

    const superAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'superadmin@aescion.com',
        password: 'Aescion@Super#2026'
      })
    });

    const superAdminAuth = await superAdminLoginRes.json();
    assert(superAdminLoginRes.ok, 'Super Admin login with official credentials succeeded');
    assert(superAdminAuth.accessToken != null, 'Super Admin received valid JWT access token');
    assert(superAdminAuth.activeRole?.roleType === 'SUPER_ADMIN', 'Super Admin roleType is strictly SUPER_ADMIN');

    const superAdminToken = superAdminAuth.accessToken;

    // Test unauthenticated access to Super Admin endpoints
    const unauthRes = await fetch(`${API_BASE}/super-admin/stats`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /super-admin/stats blocked with 401');

    // -------------------------------------------------------------
    // PHASE 2: TENANT ONBOARDING & OWNER SEPARATION
    // -------------------------------------------------------------
    console.log('\n[PHASE 2] Tenant Provisioning & Owner Isolation Setup');

    const tenantAId_suffix = Math.floor(Math.random() * 8999 + 1000);
    const tenantAPayload = {
      business: {
        name: `Apex Hypermarket ${tenantAId_suffix}`,
        legalName: `Apex Retail Enterprises ${tenantAId_suffix}`,
        phone: `98${tenantAId_suffix}0000`,
        email: `arjun.owner${tenantAId_suffix}@apexretail.com`,
        address: '123 Market Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: false
      },
      businessType: 'SUPERMARKET',
      owner: {
        firstName: 'Arjun',
        lastName: 'Mehta',
        username: `arjun_owner_${tenantAId_suffix}`,
        email: `arjun.owner${tenantAId_suffix}@apexretail.com`,
        password: 'Password@123',
        mobileNumber: `98${tenantAId_suffix}0000`
      },
      branches: [
        {
          name: 'Main Store',
          code: `APX${tenantAId_suffix}`,
          isMain: true
        }
      ],
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
        defaultReceiptFormat: '80MM'
      }
    };

    const registerARes = await fetch(`${API_BASE}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantAPayload)
    });
    const tenantAAuth = await registerARes.json();
    assert(registerARes.ok, `Registered Tenant A: ${tenantAPayload.business.name}`);
    const tokenA = tenantAAuth.accessToken;
    const orgAId = tenantAAuth.organization.id;
    const branchAId = tenantAAuth.activeBranch.id;

    // Tenant B (Wholesale)
    const tenantBId_suffix = Math.floor(Math.random() * 8999 + 1000);
    const tenantBPayload = {
      business: {
        name: `Zenith Logistics ${tenantBId_suffix}`,
        legalName: `Zenith Wholesale Distribution ${tenantBId_suffix}`,
        phone: `97${tenantBId_suffix}0000`,
        email: `bhavin.owner${tenantBId_suffix}@zenithdist.com`,
        address: '456 Freight Avenue',
        city: 'Surat',
        state: 'Gujarat',
        pinCode: '395001',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: false
      },
      businessType: 'WHOLESALE',
      owner: {
        firstName: 'Bhavin',
        lastName: 'Shah',
        username: `bhavin_owner_${tenantBId_suffix}`,
        email: `bhavin.owner${tenantBId_suffix}@zenithdist.com`,
        password: 'Password@123',
        mobileNumber: `97${tenantBId_suffix}0000`
      },
      branches: [
        {
          name: 'Central Warehouse',
          code: `ZNT${tenantBId_suffix}`,
          isMain: true
        }
      ],
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
        defaultReceiptFormat: '80MM'
      }
    };

    const registerBRes = await fetch(`${API_BASE}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantBPayload)
    });
    const tenantBAuth = await registerBRes.json();
    assert(registerBRes.ok, `Registered Tenant B: ${tenantBPayload.business.name}`);
    const tokenB = tenantBAuth.accessToken;
    const orgBId = tenantBAuth.organization.id;
    const branchBId = tenantBAuth.activeBranch.id;

    // -------------------------------------------------------------
    // PHASE 3: RBAC GUARD SECURITY ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n[PHASE 3] RBAC Guard Security Verification');

    const ownerAToSuperStats = await fetch(`${API_BASE}/super-admin/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(ownerAToSuperStats.status === 403, 'Normal Tenant A Owner blocked from Super Admin API with 403 Forbidden');

    const ownerBToSuperCompanies = await fetch(`${API_BASE}/super-admin/companies`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(ownerBToSuperCompanies.status === 403, 'Normal Tenant B Owner blocked from Super Admin Directory with 403 Forbidden');

    // -------------------------------------------------------------
    // PHASE 4: DATA GENERATION IN TENANT A & TENANT B
    // -------------------------------------------------------------
    console.log('\n[PHASE 4] Generating Tenant-Specific Financial Transactions');

    // Create product in Tenant A
    const prodARes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-branch-id': branchAId
      },
      body: JSON.stringify({
        name: `Organic Milk ${tenantAId_suffix}`,
        sku: `MILK-${tenantAId_suffix}`,
        category: 'Dairy',
        sellingPrice: 75,
        costPrice: 55,
        taxRate: 5,
        currentStock: 100
      })
    });
    const prodA = await prodARes.json();
    assert(prodARes.ok, `Created product in Tenant A: ${prodA.name}`);

    // Create customer in Tenant A
    const custARes = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-branch-id': branchAId
      },
      body: JSON.stringify({
        name: `Customer Alpha ${tenantAId_suffix}`,
        phone: `99000${tenantAId_suffix}`,
        creditLimit: 10000
      })
    });
    const custA = await custARes.json();
    assert(custARes.ok, `Created customer in Tenant A: ${custA.name}`);

    // Create invoice in Tenant A
    const invARes = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-branch-id': branchAId
      },
      body: JSON.stringify({
        branchId: branchAId,
        customerId: custA.id,
        customerName: custA.name,
        lines: [
          {
            productId: prodA.id,
            name: prodA.name,
            quantity: 10,
            unitPrice: 75,
            taxRate: 5,
            unit: 'PCS'
          }
        ],
        payment: {
          amount: 750,
          method: 'UPI'
        }
      })
    });
    const invA = await invARes.json();
    if (!invARes.ok) {
      console.error('Invoice creation failed:', JSON.stringify(invA, null, 2));
    }
    assert(invARes.ok, `Billed invoice in Tenant A: ${invA.invoiceNumber} (₹${invA.grandTotal})`);

    // Create quotation in Tenant B
    const qtnBRes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-branch-id': branchBId
      },
      body: JSON.stringify({
        customerName: `Wholesale Client ${tenantBId_suffix}`,
        items: [
          {
            name: `Industrial Raw Material ${tenantBId_suffix}`,
            quantity: 50,
            unitPrice: 200,
            taxRate: 18
          }
        ]
      })
    });
    const qtnB = await qtnBRes.json();
    assert(qtnBRes.ok, `Generated quotation in Tenant B: ${qtnB.quotationNumber} (₹${qtnB.grandTotal})`);

    // -------------------------------------------------------------
    // PHASE 5: SUPER ADMIN AUTHORITATIVE DRILL-DOWN & ZERO-MIXING
    // -------------------------------------------------------------
    console.log('\n[PHASE 5] Super Admin Scoped Inspection & Tenant Data Separation');

    // Super Admin inspects Tenant A Overview
    const superTenantAOverviewRes = await fetch(`${API_BASE}/super-admin/companies/${orgAId}/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const superTenantAOverview = await superTenantAOverviewRes.json();
    assert(superTenantAOverviewRes.ok, 'Super Admin inspected Tenant A Overview');
    assert(superTenantAOverview.company.id === orgAId, 'Tenant A context matches precisely');
    assert(
      superTenantAOverview.recentInvoices.some((i) => i.id === invA.id),
      'Tenant A overview includes Tenant A invoice'
    );
    assert(
      !superTenantAOverview.recentQuotations.some((q) => q.id === qtnB.id),
      'ZERO DATA MIXING: Tenant A overview does NOT contain Tenant B quotation'
    );

    // Super Admin inspects Tenant B Overview
    const superTenantBOverviewRes = await fetch(`${API_BASE}/super-admin/companies/${orgBId}/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const superTenantBOverview = await superTenantBOverviewRes.json();
    assert(superTenantBOverviewRes.ok, 'Super Admin inspected Tenant B Overview');
    assert(superTenantBOverview.company.id === orgBId, 'Tenant B context matches precisely');
    assert(
      superTenantBOverview.recentQuotations.some((q) => q.id === qtnB.id),
      'Tenant B overview includes Tenant B quotation'
    );
    assert(
      !superTenantBOverview.recentInvoices.some((i) => i.id === invA.id),
      'ZERO DATA MIXING: Tenant B overview does NOT contain Tenant A invoice'
    );

    // -------------------------------------------------------------
    // PHASE 6: REALTIME CROSS-TENANT PLATFORM SOCKET SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n[PHASE 6] Real-time Super Admin Platform Socket Synchronization');

    const superAdminSocket = io(SOCKET_URL, { transports: ['websocket'] });
    const tenantBSocket = io(SOCKET_URL, { transports: ['websocket'] });

    let superAdminReceivedInvoiceEvent = false;
    let tenantBReceivedInvoiceEvent = false;

    await new Promise((resolve) => {
      superAdminSocket.on('connect', () => {
        superAdminSocket.emit('join_super_admin');
        resolve();
      });
    });

    await new Promise((resolve) => {
      tenantBSocket.on('connect', () => {
        tenantBSocket.emit('joinBranchRoom', { organizationId: orgBId, branchId: branchBId });
        resolve();
      });
    });

    superAdminSocket.on('platform_invoice_created', (payload) => {
      if (payload.organizationId === orgAId) {
        superAdminReceivedInvoiceEvent = true;
      }
    });

    tenantBSocket.on('invoice_created', (payload) => {
      if (payload?.organizationId === orgAId || payload?.invoiceNumber?.includes(tenantAId_suffix)) {
        tenantBReceivedInvoiceEvent = true;
      }
    });

    // Create another invoice in Tenant A to trigger real-time broadcast
    const invA2Res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-branch-id': branchAId
      },
      body: JSON.stringify({
        branchId: branchAId,
        customerId: custA.id,
        customerName: custA.name,
        lines: [
          {
            productId: prodA.id,
            name: prodA.name,
            quantity: 5,
            unitPrice: 75,
            taxRate: 5,
            unit: 'PCS'
          }
        ],
        payment: { amount: 375, method: 'CASH' }
      })
    });
    const invA2 = await invA2Res.json();
    assert(invA2Res.ok, `Created second invoice in Tenant A: ${invA2.invoiceNumber}`);

    // Wait 1.5 seconds for socket event propagation
    await new Promise((r) => setTimeout(r, 1500));

    assert(
      superAdminReceivedInvoiceEvent,
      'Super Admin platform room received real-time platform_invoice_created event with tenant context'
    );
    assert(
      !tenantBReceivedInvoiceEvent,
      'REALTIME ISOLATION: Tenant B socket room did NOT receive Tenant A invoice event'
    );

    superAdminSocket.disconnect();
    tenantBSocket.disconnect();

    // -------------------------------------------------------------
    // PHASE 7: COMPANY SUSPENSION & REACTIVATION LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n[PHASE 7] Company Suspension & Reactivation Lifecycle');

    // Suspend Tenant B
    const suspendRes = await fetch(`${API_BASE}/super-admin/companies/${orgBId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        active: false,
        reason: 'Compliance review required'
      })
    });
    const suspendData = await suspendRes.json();
    assert(suspendRes.ok && suspendData.status === 'SUSPENDED', `Tenant B (${tenantBPayload.business.name}) suspended by Super Admin`);

    // Verify Tenant B owner login is blocked / deactivated
    const tenantBLoginAttempt = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: tenantBPayload.owner.email,
        password: tenantBPayload.owner.password
      })
    });
    assert(!tenantBLoginAttempt.ok, 'Suspended Tenant B Owner login rejected (active membership required)');

    // Reactivate Tenant B
    const reactivateRes = await fetch(`${API_BASE}/super-admin/companies/${orgBId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        active: true,
        reason: 'Compliance review cleared'
      })
    });
    const reactivateData = await reactivateRes.json();
    assert(reactivateRes.ok && reactivateData.status === 'ACTIVE', `Tenant B reactivated by Super Admin`);

    // Verify Tenant B owner can log in again
    const tenantBLoginAgain = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: tenantBPayload.owner.email,
        password: tenantBPayload.owner.password
      })
    });
    assert(tenantBLoginAgain.ok, 'Reactivated Tenant B Owner can log in successfully');

    // -------------------------------------------------------------
    // PHASE 8: PLATFORM REPORTS & GLOBAL AUDIT TRAIL
    // -------------------------------------------------------------
    console.log('\n[PHASE 8] Platform Reports & Global Audit Intelligence');

    const reportsRes = await fetch(`${API_BASE}/super-admin/reports/platform`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const reportsData = await reportsRes.json();
    assert(reportsRes.ok, 'Super Admin retrieved platform-wide reports');
    assert(reportsData.totalPlatformRevenue > 0, `Total Platform Revenue: ₹${reportsData.totalPlatformRevenue}`);
    assert(reportsData.businessTypeDistribution != null, 'Platform reports industry market share distribution');

    const auditRes = await fetch(`${API_BASE}/super-admin/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const auditLogs = await auditRes.json();
    assert(auditRes.ok && Array.isArray(auditLogs), 'Super Admin retrieved immutable global audit trail');
    assert(
      auditLogs.some((l) => l.action.includes('SUPERADMIN') || l.organizationId === orgBId),
      'Audit trail recorded Super Admin suspension/reactivation actions'
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  }
}

runSuperAdminTestSuite();
