import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:4000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:4000';

async function runSuperAdminPresenceTestSuite() {
  console.log('========================================================================');
  console.log('  AESCION COMMERCE — REALTIME SUPER ADMIN & OWNER PRESENCE TEST SUITE');
  console.log('========================================================================\n');

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
    // PHASE 1: SUPER ADMIN LOGIN & SOCKET CONNECTION
    // -------------------------------------------------------------
    console.log('[PHASE 1] Super Admin Setup & Socket Room Subscription');

    const superAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'superadmin@aescion.com',
        password: 'Aescion@Super#2026'
      })
    });

    const superAdminAuth = await superAdminLoginRes.json();
    assert(superAdminLoginRes.ok, 'Super Admin logged in with official credentials');
    const superAdminToken = superAdminAuth.accessToken;

    const superAdminSocket = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => {
      superAdminSocket.on('connect', () => {
        superAdminSocket.emit('join_super_admin');
        resolve();
      });
    });
    assert(superAdminSocket.connected, 'Super Admin socket connected and joined platform_super_admin room');

    // -------------------------------------------------------------
    // PHASE 2: TENANT ONBOARDING (OWNER A, OWNER B, OWNER C)
    // -------------------------------------------------------------
    console.log('\n[PHASE 2] Provisioning Tenants (Owner A, Owner B, Owner C)');

    async function registerTenant(name, businessType, ownerFirst, ownerLast) {
      const suffix = Math.floor(Math.random() * 8999 + 1000);
      const payload = {
        business: {
          name: `${name} ${suffix}`,
          legalName: `${name} Enterprises ${suffix}`,
          phone: `98${suffix}0000`,
          email: `${ownerFirst.toLowerCase()}.${suffix}@test.com`,
          address: '123 Market Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
          country: 'India',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          gstStatus: false
        },
        businessType,
        owner: {
          firstName: ownerFirst,
          lastName: ownerLast,
          username: `${ownerFirst.toLowerCase()}_${suffix}`,
          email: `${ownerFirst.toLowerCase()}.${suffix}@test.com`,
          password: 'Password@123',
          mobileNumber: `98${suffix}0000`
        },
        branches: [
          {
            name: 'Main Branch',
            code: `BR${suffix}`,
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

      const res = await fetch(`${API_BASE}/onboarding/create-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { payload, auth: data };
    }

    const tenantA = await registerTenant('Apex Retail', 'RETAIL', 'Arjun', 'Mehta');
    const tenantB = await registerTenant('Zenith Logistics', 'WHOLESALE', 'Bhavin', 'Shah');
    const tenantC = await registerTenant('Crest Foods', 'SUPERMARKET', 'Chetan', 'Patel');

    assert(tenantA.auth.accessToken != null, `Created Tenant A: ${tenantA.payload.business.name}`);
    assert(tenantB.auth.accessToken != null, `Created Tenant B: ${tenantB.payload.business.name}`);
    assert(tenantC.auth.accessToken != null, `Created Tenant C: ${tenantC.payload.business.name}`);

    // Capture initial baseline presence (accounting for any concurrent live UI sessions)
    const baselineRes = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const baseline = await baselineRes.json();
    const baseOwners = baseline.snapshot.onlineOwnersCount || 0;
    const baseDesktop = baseline.snapshot.desktopSessionsCount || 0;
    const baseMobile = baseline.snapshot.mobileSessionsCount || 0;

    // -------------------------------------------------------------
    // TEST A: ONE DESKTOP OWNER PRESENCE & DISCONNECT
    // -------------------------------------------------------------
    console.log('\n[TEST A] One Desktop Owner Presence & Disconnect Lifecycle');

    let presenceEventReceived = false;
    let lastPresencePayload = null;

    superAdminSocket.on('presence_updated', (p) => {
      presenceEventReceived = true;
      lastPresencePayload = p;
    });

    const ownerASocketDesktop = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => ownerASocketDesktop.on('connect', resolve));

    // Identify presence as desktop
    await new Promise((resolve) => {
      ownerASocketDesktop.emit('identify_presence', {
        userId: tenantA.auth.user.id,
        organizationId: tenantA.auth.organization.id,
        branchId: tenantA.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'desktop'
      }, (ack) => resolve(ack));
    });

    await new Promise((r) => setTimeout(r, 600));

    // Verify Super Admin Presence API
    const presenceA1Res = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceA1 = await presenceA1Res.json();
    assert(presenceA1.snapshot.onlineOwnersCount === baseOwners + 1, `Super Admin shows Online Owners = ${baseOwners + 1}`);
    assert(presenceA1.snapshot.desktopSessionsCount === baseDesktop + 1, `Super Admin shows Desktop Sessions = ${baseDesktop + 1}`);
    assert(
      presenceA1.onlineOwners.some((o) => o.userId === tenantA.auth.user.id && o.platform === 'desktop'),
      'Owner A listed as Desktop Online in Super Admin presence'
    );

    // Disconnect Owner A Desktop
    ownerASocketDesktop.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    const presenceA2Res = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceA2 = await presenceA2Res.json();
    assert(presenceA2.snapshot.onlineOwnersCount === baseOwners, `After disconnect, Super Admin shows Online Owners = ${baseOwners}`);
    assert(presenceA2.snapshot.desktopSessionsCount === baseDesktop, `After disconnect, Desktop Sessions = ${baseDesktop}`);

    // -------------------------------------------------------------
    // TEST B: ONE MOBILE OWNER PRESENCE
    // -------------------------------------------------------------
    console.log('\n[TEST B] One Mobile Owner Presence');

    const ownerBSocketMobile = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => ownerBSocketMobile.on('connect', resolve));

    await new Promise((resolve) => {
      ownerBSocketMobile.emit('identify_presence', {
        userId: tenantB.auth.user.id,
        organizationId: tenantB.auth.organization.id,
        branchId: tenantB.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'mobile'
      }, (ack) => resolve(ack));
    });

    await new Promise((r) => setTimeout(r, 600));

    const presenceBRes = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceB = await presenceBRes.json();
    assert(presenceB.snapshot.onlineOwnersCount === baseOwners + 1, `Super Admin shows Online Owners = ${baseOwners + 1}`);
    assert(presenceB.snapshot.mobileSessionsCount === baseMobile + 1, `Super Admin shows Mobile Sessions = ${baseMobile + 1}`);
    assert(
      presenceB.onlineOwners.some((o) => o.userId === tenantB.auth.user.id && o.platform === 'mobile'),
      'Owner B listed as Mobile Online in Super Admin presence'
    );

    // -------------------------------------------------------------
    // TEST C: SAME OWNER ON TWO DEVICES (DESKTOP + MOBILE)
    // -------------------------------------------------------------
    console.log('\n[TEST C] Same Owner Active on Two Devices Simultaneously (Desktop + Mobile)');

    // Owner A connects Desktop session
    const ownerASocketD2 = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => ownerASocketD2.on('connect', resolve));
    await new Promise((resolve) => {
      ownerASocketD2.emit('identify_presence', {
        userId: tenantA.auth.user.id,
        organizationId: tenantA.auth.organization.id,
        branchId: tenantA.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'desktop'
      }, (ack) => resolve(ack));
    });

    // Owner A also connects Mobile session
    const ownerASocketM2 = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((resolve) => ownerASocketM2.on('connect', resolve));
    await new Promise((resolve) => {
      ownerASocketM2.emit('identify_presence', {
        userId: tenantA.auth.user.id,
        organizationId: tenantA.auth.organization.id,
        branchId: tenantA.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'mobile'
      }, (ack) => resolve(ack));
    });

    await new Promise((r) => setTimeout(r, 600));

    const presenceCRes = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceC = await presenceCRes.json();

    // Owner A (2 sessions) + Owner B (1 session) = +2 Unique Owners, +3 Active Sessions
    assert(presenceC.snapshot.onlineOwnersCount === baseOwners + 2, `Unique Online Owners = ${baseOwners + 2} (Owner A not counted twice)`);
    assert(presenceC.snapshot.activeSessionsCount === baseDesktop + baseMobile + 3, `Total Active Sessions = ${baseDesktop + baseMobile + 3}`);

    const ownerASummary = presenceC.onlineOwners.find((o) => o.userId === tenantA.auth.user.id);
    assert(ownerASummary?.platform === 'both', 'Owner A platform correctly identified as "both" (Desktop + Mobile)');
    assert(ownerASummary?.sessionsCount === 2, 'Owner A sessionsCount is exactly 2');

    // Check single-tenant presence endpoint for Tenant A
    const tenantAPresenceRes = await fetch(`${API_BASE}/super-admin/companies/${tenantA.auth.organization.id}/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const tenantAPresence = await tenantAPresenceRes.json();
    assert(tenantAPresence.status === 'ONLINE', 'Tenant A company presence status is ONLINE');
    assert(tenantAPresence.activeSessionsCount === 2, 'Tenant A presence shows 2 active sessions (Desktop & Mobile)');

    // Close Owner A's mobile session -> Owner A should remain online on Desktop
    ownerASocketM2.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    const presenceC2Res = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceC2 = await presenceC2Res.json();
    const ownerASummaryAfter = presenceC2.onlineOwners.find((o) => o.userId === tenantA.auth.user.id);
    assert(ownerASummaryAfter?.platform === 'desktop', 'After closing mobile, Owner A remains Desktop Online');
    assert(ownerASummaryAfter?.sessionsCount === 1, 'Owner A remaining sessionsCount = 1');

    // -------------------------------------------------------------
    // TEST D: MULTIPLE DISTINCT OWNERS SIMULTANEOUSLY
    // -------------------------------------------------------------
    console.log('\n[TEST D] Multiple Distinct Owners Online Simultaneously');

    // Owner C connects Desktop and Mobile
    const ownerCSocketD = io(SOCKET_URL, { transports: ['websocket'] });
    const ownerCSocketM = io(SOCKET_URL, { transports: ['websocket'] });
    await Promise.all([
      new Promise((r) => ownerCSocketD.on('connect', r)),
      new Promise((r) => ownerCSocketM.on('connect', r))
    ]);

    await Promise.all([
      new Promise((r) => ownerCSocketD.emit('identify_presence', {
        userId: tenantC.auth.user.id,
        organizationId: tenantC.auth.organization.id,
        branchId: tenantC.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'desktop'
      }, r)),
      new Promise((r) => ownerCSocketM.emit('identify_presence', {
        userId: tenantC.auth.user.id,
        organizationId: tenantC.auth.organization.id,
        branchId: tenantC.auth.activeBranch.id,
        roleType: 'OWNER',
        platform: 'mobile'
      }, r))
    ]);

    await new Promise((r) => setTimeout(r, 600));

    // System now has:
    // Owner A: 1 Desktop
    // Owner B: 1 Mobile
    // Owner C: 1 Desktop + 1 Mobile
    // Delta: +3 Unique Owners, +4 Sessions (2 Desktop, 2 Mobile)
    const presenceDRes = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const presenceD = await presenceDRes.json();
    assert(presenceD.snapshot.onlineOwnersCount === baseOwners + 3, `Unique Online Owners = ${baseOwners + 3}`);
    assert(presenceD.snapshot.desktopSessionsCount === baseDesktop + 2, `Desktop Sessions Count = ${baseDesktop + 2}`);
    assert(presenceD.snapshot.mobileSessionsCount === baseMobile + 2, `Mobile Sessions Count = ${baseMobile + 2}`);
    assert(presenceD.snapshot.activeSessionsCount === baseDesktop + baseMobile + 4, `Total Active Sessions = ${baseDesktop + baseMobile + 4}`);

    // Check stats endpoint
    const statsDRes = await fetch(`${API_BASE}/super-admin/stats`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const statsD = await statsDRes.json();
    assert(statsD.onlineOwners === baseOwners + 3, `Super Admin /stats reports ${baseOwners + 3} onlineOwners`);
    assert(statsD.desktopSessions === baseDesktop + 2, `Super Admin /stats reports ${baseDesktop + 2} desktopSessions`);
    assert(statsD.mobileSessions === baseMobile + 2, `Super Admin /stats reports ${baseMobile + 2} mobileSessions`);

    // -------------------------------------------------------------
    // TEST E: OWNER DESKTOP TRANSACTION REALTIME PROPAGATION
    // -------------------------------------------------------------
    console.log('\n[TEST E] Owner Desktop Quotation Transaction Realtime Sync');

    let superAdminReceivedQtn = false;
    superAdminSocket.on('platform_quotation_updated', (p) => {
      if (p.organizationId === tenantA.auth.organization.id) {
        superAdminReceivedQtn = true;
      }
    });

    const qtnARes = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantA.auth.accessToken}`,
        'x-branch-id': tenantA.auth.activeBranch.id
      },
      body: JSON.stringify({
        customerName: 'Commercial Retail Client',
        items: [
          {
            name: 'Fresh Dairy Package',
            quantity: 20,
            unitPrice: 150,
            taxRate: 5
          }
        ]
      })
    });
    const qtnA = await qtnARes.json();
    assert(qtnARes.ok, `Owner A Desktop created quotation ${qtnA.quotationNumber} (₹${qtnA.grandTotal})`);

    await new Promise((r) => setTimeout(r, 1000));
    assert(superAdminReceivedQtn, 'Super Admin received realtime platform_quotation_updated socket broadcast');

    // -------------------------------------------------------------
    // TEST F: OWNER MOBILE INVOICE TRANSACTION REALTIME PROPAGATION
    // -------------------------------------------------------------
    console.log('\n[TEST F] Owner Mobile Invoice Transaction Realtime Sync');

    let superAdminReceivedInv = false;
    superAdminSocket.on('platform_invoice_created', (p) => {
      if (p.organizationId === tenantB.auth.organization.id) {
        superAdminReceivedInv = true;
      }
    });

    // Create product & customer in Tenant B
    const prodBRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantB.auth.accessToken}`,
        'x-branch-id': tenantB.auth.activeBranch.id
      },
      body: JSON.stringify({
        name: 'Bulk Logistics Cargo Unit',
        sku: `CARGO-${Math.floor(Math.random() * 8999 + 1000)}`,
        category: 'Freight',
        sellingPrice: 1200,
        costPrice: 900,
        taxRate: 18,
        currentStock: 500
      })
    });
    const prodB = await prodBRes.json();

    const invBRes = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantB.auth.accessToken}`,
        'x-branch-id': tenantB.auth.activeBranch.id
      },
      body: JSON.stringify({
        branchId: tenantB.auth.activeBranch.id,
        customerName: 'Enterprise Freight Customer',
        lines: [
          {
            productId: prodB.id,
            name: prodB.name,
            quantity: 5,
            unitPrice: 1200,
            taxRate: 18,
            unit: 'PCS'
          }
        ],
        payment: {
          amount: 6000,
          method: 'BANK_TRANSFER'
        }
      })
    });
    const invB = await invBRes.json();
    assert(invBRes.ok, `Owner B Mobile created invoice ${invB.invoiceNumber} (₹${invB.grandTotal})`);

    await new Promise((r) => setTimeout(r, 1000));
    assert(superAdminReceivedInv, 'Super Admin received realtime platform_invoice_created socket broadcast');

    // -------------------------------------------------------------
    // TEST G: TENANT ISOLATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[TEST G] Strict Multi-Tenant Realtime & Data Isolation');

    let tenantAReceivedTenantBInvoice = false;
    ownerASocketD2.on('invoice_created', (inv) => {
      if (inv.organizationId === tenantB.auth.organization.id || inv.id === invB.id) {
        tenantAReceivedTenantBInvoice = true;
      }
    });

    await new Promise((r) => setTimeout(r, 800));
    assert(!tenantAReceivedTenantBInvoice, 'TENANT ISOLATION: Tenant A socket room did NOT receive Tenant B invoice event');

    // Owner A cannot query Super Admin presence endpoint
    const forbiddenRes = await fetch(`${API_BASE}/super-admin/presence`, {
      headers: { Authorization: `Bearer ${tenantA.auth.accessToken}` }
    });
    assert(forbiddenRes.status === 403, 'RBAC SECURITY: Normal Owner A blocked from /super-admin/presence with 403 Forbidden');

    // Clean up sockets
    ownerASocketD2.disconnect();
    ownerBSocketMobile.disconnect();
    ownerCSocketD.disconnect();
    ownerCSocketM.disconnect();
    superAdminSocket.disconnect();

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`  REALTIME PRESENCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  }
}

runSuperAdminPresenceTestSuite();
