import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';

async function runCommonModulesAndIndustryAdaptationSuite() {
  console.log('================================================================================');
  console.log('  AESCION COMMERCE — COMMON CORE MODULES & 6-INDUSTRY ADAPTATION TEST SUITE');
  console.log('================================================================================\n');

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
    // -------------------------------------------------------------------------
    // SETUP: Super Admin Authentication & Platform Socket
    // -------------------------------------------------------------------------
    console.log('[SETUP] Super Admin Authentication & Realtime Monitoring');
    const saLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'superadmin@aescion.com', password: 'Aescion@Super#2026' })
    });
    const saAuth = await saLoginRes.json();
    assert(saLoginRes.ok, 'Super Admin logged in successfully');
    const superAdminToken = saAuth.accessToken;

    const superAdminSocket = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => superAdminSocket.on('connect', r));
    superAdminSocket.emit('join_super_admin');
    assert(superAdminSocket.connected, 'Super Admin socket joined platform_super_admin room');

    // Helper: Register Tenant
    async function registerTenant(businessName, businessType, ownerFirst, ownerLast) {
      const suffix = Math.floor(Math.random() * 8999 + 1000);
      const email = `${ownerFirst.toLowerCase()}.${suffix}@testcorp.local`;
      const username = `${ownerFirst.toLowerCase()}_${suffix}`;
      const payload = {
        owner: {
          firstName: ownerFirst,
          lastName: ownerLast,
          mobileNumber: `98${suffix}1234`,
          email,
          username,
          password: 'Password@123'
        },
        businessType,
        business: {
          name: `${businessName} ${suffix}`,
          legalName: `${businessName} ${suffix} Pvt Ltd`,
          phone: `98${suffix}1234`,
          email,
          address: '100 Business Boulevard',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '600001',
          country: 'India',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          gstStatus: true,
          gstin: `33AAACB${suffix}A1Z5`
        },
        branches: [
          {
            name: `${businessName} (Main)`,
            code: `BR${suffix}`,
            address: '100 Business Boulevard',
            city: 'Chennai',
            state: 'Tamil Nadu',
            phone: `98${suffix}1234`,
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
          defaultReceiptFormat: '80MM'
        },
        industrySettings: {}
      };

      const res = await fetch(`${API_BASE}/onboarding/create-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const auth = await res.json();
      return { payload, auth, token: auth.accessToken, orgId: auth.organization.id, branchId: auth.activeBranch.id };
    }

    // -------------------------------------------------------------------------
    // PHASE 1: PROVISION TENANTS FOR ALL 6 INDUSTRY PACKS
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 1] Provisioning Tenants across All 6 Industry Packs');

    const supermarket = await registerTenant('Apex Fresh Supermarket', 'SUPERMARKET', 'Suresh', 'Kumar');
    const restaurant = await registerTenant('Royal Palace Dine', 'RESTAURANT', 'Raghav', 'Menon');
    const retail = await registerTenant('Elegance Fashion Store', 'RETAIL', 'Ananya', 'Sharma');
    const service = await registerTenant('Speedy Tech Repair', 'SERVICE', 'Vikram', 'Rathore');
    const pharmacy = await registerTenant('LifeCare Meds & Wellness', 'PHARMACY', 'Pooja', 'Iyer');
    const wholesale = await registerTenant('Metro Global Distribution', 'WHOLESALE', 'Mukesh', 'Agarwal');

    const allTenants = [
      { name: 'SUPERMARKET', tenant: supermarket },
      { name: 'RESTAURANT', tenant: restaurant },
      { name: 'RETAIL', tenant: retail },
      { name: 'SERVICE', tenant: service },
      { name: 'PHARMACY', tenant: pharmacy },
      { name: 'WHOLESALE', tenant: wholesale }
    ];

    allTenants.forEach(({ name, tenant }) => {
      assert(tenant.token != null, `Created ${name} Tenant (${tenant.payload.business.name})`);
    });

    // -------------------------------------------------------------------------
    // PHASE 2: VERIFY ALL COMMON CORE MODULES ACROSS ALL 6 INDUSTRIES
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 2] Common Core Modules Execution on All 6 Industry Packs');

    for (const { name, tenant } of allTenants) {
      console.log(`\n  --- Verifying Common Core Modules for: ${name} ---`);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenant.token}`,
        'x-branch-id': tenant.branchId
      };

      // 1. Dashboard Pulse
      const pulseRes = await fetch(`${API_BASE}/reports/dashboard-pulse`, { headers });
      assert(pulseRes.ok, `[${name}] Dashboard Pulse accessible`);

      // 2. Product Management (Industry-Adapted Creation)
      const prodSku = `SKU-${name}-${Math.floor(Math.random() * 8999 + 1000)}`;
      const prodRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: `${name} Authoritative Item`,
          sku: prodSku,
          category: `${name} Category`,
          unit: name === 'WHOLESALE' ? 'BAG' : name === 'SUPERMARKET' ? 'KG' : 'PCS',
          costPrice: 500,
          sellingPrice: 750,
          taxRate: 18,
          isWeightBased: name === 'SUPERMARKET',
          initialStock: 100
        })
      });
      const prodData = await prodRes.json();
      assert(prodRes.ok && prodData.id != null, `[${name}] Product created: ${prodData.name} (${prodData.sku})`);

      // 3. Customer Management
      const custSuffix = Math.floor(Math.random() * 8999 + 1000);
      const custRes = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: `${name} Valued Client ${custSuffix}`,
          phone: `91${custSuffix}5555`,
          email: `client.${custSuffix}@mail.local`,
          creditLimit: 50000
        })
      });
      const custData = await custRes.json();
      assert(custRes.ok && custData.id != null, `[${name}] Customer created: ${custData.name}`);

      // 4. Branch Management
      const brCode = `BR2-${Math.floor(Math.random() * 899 + 100)}`;
      const brRes = await fetch(`${API_BASE}/branches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: `${name} Secondary Outlet`,
          code: brCode,
          city: 'Chennai',
          state: 'Tamil Nadu',
          phone: '9840012345'
        })
      });
      const brData = await brRes.json();
      assert(brRes.ok && brData.id != null, `[${name}] Secondary Branch created: ${brData.name} (${brData.code})`);

      // 5. Staff / Team Management
      const staffUsername = `staff_${name.toLowerCase()}_${custSuffix}`;
      const staffRes = await fetch(`${API_BASE}/team/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Ramesh',
          lastName: `${name} Staff`,
          username: staffUsername,
          password: 'Password@123',
          branchId: tenant.branchId,
          roleName: 'CASHIER'
        })
      });
      const staffData = await staffRes.json();
      assert(staffRes.ok && staffData.id != null, `[${name}] Staff member created: ${staffUsername}`);

      // 6. Quotation Flow
      const qtnRes = await fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: custData.id,
          items: [{ productId: prodData.id, quantity: 5, unitPrice: 750, taxRate: 18 }]
        })
      });
      const qtnData = await qtnRes.json();
      assert(qtnRes.ok && qtnData.quotationNumber != null, `[${name}] Quotation created: ${qtnData.quotationNumber}`);

      // 7. Billing & Tax Invoice Flow (Shared Financial Core)
      const invRes = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          branchId: tenant.branchId,
          customerId: custData.id,
          customerName: custData.name,
          lines: [{ name: prodData.name, productId: prodData.id, quantity: 2, unitPrice: 750, taxRate: 18 }],
          payment: {
            method: 'UPI',
            amount: 1770
          }
        })
      });
      const invData = await invRes.json();
      assert(invRes.ok && invData.invoiceNumber != null, `[${name}] Invoice billed: ${invData.invoiceNumber} (₹${invData.grandTotal})`);

      // 8. Payment & Receipt Recording
      const rcpRes = await fetch(`${API_BASE}/payments/receipts`, { headers });
      const rcpData = await rcpRes.json();
      assert(rcpRes.ok && Array.isArray(rcpData), `[${name}] Payments & Receipts listing accessible (${rcpData.length} records)`);

      // 9. Reports & Audits
      const rptRes = await fetch(`${API_BASE}/reports/summary`, { headers });
      assert(rptRes.ok, `[${name}] Reports & Audits summary accessible`);

      // 10. Settings & Organization Profile
      const setRes = await fetch(`${API_BASE}/organizations/settings`, { headers });
      assert(setRes.ok, `[${name}] Business Settings accessible`);
    }

    // -------------------------------------------------------------------------
    // PHASE 3: INDUSTRY-SPECIFIC MODULE EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 3] Industry-Specific Specialized Modules Execution');

    // 3.1 SUPERMARKET: Registers & Weight scale
    const smHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${supermarket.token}`, 'x-branch-id': supermarket.branchId };
    const smRegRes = await fetch(`${API_BASE}/supermarket/registers-status`, { headers: smHeaders });
    assert(smRegRes.ok, 'SUPERMARKET: Accessed /supermarket/registers-status successfully');

    // 3.2 RESTAURANT: Tables & KOTs
    const restHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${restaurant.token}`, 'x-branch-id': restaurant.branchId };
    const restTableRes = await fetch(`${API_BASE}/restaurant/tables`, { headers: restHeaders });
    assert(restTableRes.ok, 'RESTAURANT: Accessed /restaurant/tables successfully');

    const kotRes = await fetch(`${API_BASE}/restaurant/kots`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({
        tableNumber: 'T-12',
        orderId: 'ORD-REST-01',
        items: [{ menuItemId: 'MENU-01', name: 'Paneer Butter Masala', quantity: 2 }]
      })
    });
    const kotData = await kotRes.json();
    assert(kotRes.ok && kotData.kotNumber != null, `RESTAURANT: Created Kitchen Order Ticket: ${kotData.kotNumber}`);

    // 3.3 SERVICE: Job Cards
    const srvHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${service.token}`, 'x-branch-id': service.branchId };
    const srvCustRes = await fetch(`${API_BASE}/customers`, { headers: srvHeaders });
    const srvCustList = await srvCustRes.json();
    const srvCust = srvCustList[0];

    const jobRes = await fetch(`${API_BASE}/service-jobs`, {
      method: 'POST',
      headers: srvHeaders,
      body: JSON.stringify({
        customerId: srvCust.id,
        customerName: srvCust.name,
        customerPhone: srvCust.phone,
        assetDetails: { assetType: 'Laptop', brand: 'Dell', model: 'XPS 15' },
        complaint: 'Screen flickering issue',
        estimatedAmount: 3500
      })
    });
    const jobData = await jobRes.json();
    assert(jobRes.ok && jobData.jobNumber != null, `SERVICE: Created Job Card: ${jobData.jobNumber}`);

    // 3.4 PHARMACY: Medicines & Batches
    const pharmHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${pharmacy.token}`, 'x-branch-id': pharmacy.branchId };
    const pharmMedRes = await fetch(`${API_BASE}/pharmacy/medicines`, { headers: pharmHeaders });
    assert(pharmMedRes.ok, 'PHARMACY: Accessed /pharmacy/medicines successfully');

    // 3.5 WHOLESALE: Sales Orders & Delivery Challans
    const wsHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${wholesale.token}`, 'x-branch-id': wholesale.branchId };
    const wsCustRes = await fetch(`${API_BASE}/customers`, { headers: wsHeaders });
    const wsCustList = await wsCustRes.json();
    const wsCust = wsCustList[0];

    const wsProdRes = await fetch(`${API_BASE}/products`, { headers: wsHeaders });
    const wsProdList = await wsProdRes.json();
    const wsProd = wsProdList[0];

    const soRes = await fetch(`${API_BASE}/wholesale/sales-orders`, {
      method: 'POST',
      headers: wsHeaders,
      body: JSON.stringify({
        customerId: wsCust.id,
        items: [{ productId: wsProd.id, quantity: 50, unitPrice: 700 }]
      })
    });
    const soData = await soRes.json();
    assert(soRes.ok && soData.orderNumber != null, `WHOLESALE: Created Sales Order: ${soData.orderNumber}`);

    const challanRes = await fetch(`${API_BASE}/wholesale/sales-orders/${soData.id}/challan`, {
      method: 'POST',
      headers: wsHeaders,
      body: JSON.stringify({ vehicleNumber: 'TN-09-XX-9999', driverName: 'Murugan', dispatchedQuantity: 50 })
    });
    const challanData = await challanRes.json();
    assert(challanRes.ok && challanData.challanNumber != null, `WHOLESALE: Dispatched Delivery Challan: ${challanData.challanNumber}`);

    // -------------------------------------------------------------------------
    // PHASE 4: MANDATORY DIRECT API SECURITY ENFORCEMENT (CROSS-INDUSTRY REJECTION)
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 4] Mandatory Direct API Security Enforcement (Cross-Industry Rejection)');

    // 4.1 Restaurant tenant attempts Wholesale Sales Order -> 403 Forbidden
    const xRes1 = await fetch(`${API_BASE}/wholesale/sales-orders`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({ customerId: 'dummy', items: [] })
    });
    assert(xRes1.status === 403, `SECURITY: Restaurant tenant blocked from /wholesale/sales-orders (HTTP ${xRes1.status} Forbidden)`);

    // 4.2 Wholesale tenant attempts Restaurant Tables -> 403 Forbidden
    const xRes2 = await fetch(`${API_BASE}/restaurant/tables`, { headers: wsHeaders });
    assert(xRes2.status === 403, `SECURITY: Wholesale tenant blocked from /restaurant/tables (HTTP ${xRes2.status} Forbidden)`);

    // 4.3 Service tenant attempts Pharmacy Medicines -> 403 Forbidden
    const xRes3 = await fetch(`${API_BASE}/pharmacy/medicines`, { headers: srvHeaders });
    assert(xRes3.status === 403, `SECURITY: Service tenant blocked from /pharmacy/medicines (HTTP ${xRes3.status} Forbidden)`);

    // 4.4 Supermarket tenant attempts Service Jobs -> 403 Forbidden
    const xRes4 = await fetch(`${API_BASE}/service-jobs`, { headers: smHeaders });
    assert(xRes4.status === 403, `SECURITY: Supermarket tenant blocked from /service-jobs (HTTP ${xRes4.status} Forbidden)`);

    // 4.5 Retail tenant attempts Wholesale Delivery Challan -> 403 Forbidden
    const retHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${retail.token}`, 'x-branch-id': retail.branchId };
    const xRes5 = await fetch(`${API_BASE}/wholesale/sales-orders/dummy-id/challan`, {
      method: 'POST',
      headers: retHeaders,
      body: JSON.stringify({})
    });
    assert(xRes5.status === 403, `SECURITY: Retail tenant blocked from /wholesale/sales-orders/:id/challan (HTTP ${xRes5.status} Forbidden)`);

    // -------------------------------------------------------------------------
    // PHASE 5: REAL-TIME CROSS-PLATFORM & SUPER ADMIN SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 5] Real-Time Cross-Platform & Super Admin Synchronization');

    let saReceivedBranch = false;
    let saReceivedTeam = false;
    let saReceivedInvoice = false;

    superAdminSocket.on('platform_branch_updated', (p) => { if (p.organizationId === restaurant.orgId) saReceivedBranch = true; });
    superAdminSocket.on('platform_team_updated', (p) => { if (p.organizationId === restaurant.orgId) saReceivedTeam = true; });
    superAdminSocket.on('platform_invoice_created', (p) => { if (p.organizationId === restaurant.orgId) saReceivedInvoice = true; });

    // Client socket for Restaurant tenant
    const restSocket = io(SOCKET_URL, { transports: ['websocket'] });
    await new Promise((r) => restSocket.on('connect', r));
    restSocket.emit('identify_presence', {
      userId: restaurant.auth.user.id,
      organizationId: restaurant.orgId,
      branchId: restaurant.branchId,
      roleType: 'OWNER',
      platform: 'desktop'
    });
    restSocket.emit('join_org', { organizationId: restaurant.orgId });
    restSocket.emit('join_branch', { organizationId: restaurant.orgId, branchId: restaurant.branchId });
    restSocket.emit('joinBranchRoom', { organizationId: restaurant.orgId, branchId: restaurant.branchId });

    let clientReceivedBranch = false;
    let clientReceivedTeam = false;
    let clientReceivedInvoice = false;

    restSocket.on('branch_updated', () => { clientReceivedBranch = true; });
    restSocket.on('team_updated', () => { clientReceivedTeam = true; });
    restSocket.on('invoice_created', () => { clientReceivedInvoice = true; });

    // 1. Create a Branch on Restaurant
    const realBr = await fetch(`${API_BASE}/branches`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({ name: 'Realtime Grand Hall', code: `GH${Math.floor(Math.random() * 899 + 100)}` })
    });
    assert(realBr.ok, 'Created Branch on Restaurant tenant');

    // 2. Create a Staff Member on Restaurant
    const realStaff = await fetch(`${API_BASE}/team/members`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({
        firstName: 'Chef',
        lastName: 'Anand',
        username: `chef_anand_${Math.floor(Math.random() * 8999 + 1000)}`,
        password: 'Password@123',
        branchId: restaurant.branchId,
        roleName: 'MANAGER'
      })
    });
    assert(realStaff.ok, 'Created Staff member on Restaurant tenant');

    // 3. Create a Bill on Restaurant
    const realProdRes = await fetch(`${API_BASE}/products`, { headers: restHeaders });
    const realProds = await realProdRes.json();
    const realCustRes = await fetch(`${API_BASE}/customers`, { headers: restHeaders });
    const realCusts = await realCustRes.json();

    const realBill = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({
        branchId: restaurant.branchId,
        customerId: realCusts[0].id,
        customerName: realCusts[0].name,
        lines: [{ name: realProds[0].name, productId: realProds[0].id, quantity: 3, unitPrice: 750, taxRate: 18 }],
        payment: {
          method: 'CARD',
          amount: 2655
        }
      })
    });
    assert(realBill.ok, 'Created Bill on Restaurant tenant');

    await new Promise((r) => setTimeout(r, 1000));

    assert(clientReceivedBranch, 'Tenant socket received realtime branch_updated event');
    assert(clientReceivedTeam, 'Tenant socket received realtime team_updated event');
    assert(clientReceivedInvoice, 'Tenant socket received realtime invoice_created event');

    assert(saReceivedBranch, 'Super Admin received realtime platform_branch_updated event');
    assert(saReceivedTeam, 'Super Admin received realtime platform_team_updated event');
    assert(saReceivedInvoice, 'Super Admin received realtime platform_invoice_created event');

    // Clean up sockets
    restSocket.disconnect();
    superAdminSocket.disconnect();

    // -------------------------------------------------------------------------
    // PHASE 6: STRICT MULTI-TENANT DATA ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 6] Strict Multi-Tenant Data Isolation Verification');

    // Wholesale inspects its products and invoices
    const wsInvoicesRes = await fetch(`${API_BASE}/invoices`, { headers: wsHeaders });
    const wsInvoices = await wsInvoicesRes.json();
    const wsInvoiceNumbers = wsInvoices.map((i) => i.invoiceNumber);

    // Verify Wholesale does NOT see Restaurant invoices
    const restInvoicesRes = await fetch(`${API_BASE}/invoices`, { headers: restHeaders });
    const restInvoices = await restInvoicesRes.json();
    const restInvoiceNumbers = restInvoices.map((i) => i.invoiceNumber);

    const hasOverlap = wsInvoiceNumbers.some((num) => restInvoiceNumbers.includes(num));
    assert(!hasOverlap, 'TENANT ISOLATION: Zero invoice leakage between Wholesale and Restaurant tenants');

    // -------------------------------------------------------------------------
    // FINAL RESULTS SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`  COMMON MODULES & 6-INDUSTRY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runCommonModulesAndIndustryAdaptationSuite();
