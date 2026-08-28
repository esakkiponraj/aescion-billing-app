import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:4000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:4000';

async function runMobileDrawerAndReceiptTestSuite() {
  console.log('========================================================================');
  console.log('  AESCION COMMERCE — MOBILE DRAWER & SOFT COPY RECEIPT TEST SUITE');
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
    // PHASE 1: ONBOARD WHOLESALE TENANT & CASHIER STAFF
    // -------------------------------------------------------------
    console.log('[PHASE 1] Provisioning Wholesale Tenant & Staff');

    const suffix = Math.floor(Math.random() * 8999 + 1000);
    const tenantPayload = {
      business: {
        name: `Hari Enterprises ${suffix}`,
        legalName: `Hari Private Ltd ${suffix}`,
        phone: `98${suffix}1111`,
        email: `hari.${suffix}@wholesale.com`,
        address: '45 Wholesale Market Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: true,
        gstin: `33AAACH${suffix}A1Z5`
      },
      businessType: 'WHOLESALE',
      owner: {
        firstName: 'Hari',
        lastName: 'Kumar',
        username: `hari_${suffix}`,
        email: `hari.${suffix}@wholesale.com`,
        password: 'Password@123',
        mobileNumber: `98${suffix}1111`
      },
      branches: [
        {
          name: 'Main Distribution Hub',
          code: `HUB${suffix}`,
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

    const regRes = await fetch(`${API_BASE}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantPayload)
    });
    const tenantAuth = await regRes.json();
    assert(regRes.ok, `Created Wholesale Tenant: ${tenantPayload.business.name} (Owner: Hari Kumar)`);

    const ownerToken = tenantAuth.accessToken;
    const orgId = tenantAuth.organization.id;
    const branchId = tenantAuth.activeBranch.id;

    // Create a Cashier user in this organization
    const cashierRes = await fetch(`${API_BASE}/team/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        firstName: 'Ramesh',
        lastName: 'Cashier',
        username: `ramesh_${suffix}`,
        email: `ramesh.${suffix}@wholesale.com`,
        password: 'Password@123',
        roleType: 'CASHIER',
        branchId: branchId
      })
    });
    assert(cashierRes.ok, 'Created Cashier user: Ramesh Cashier');

    // Login as Cashier
    const cashierLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `ramesh_${suffix}`,
        password: 'Password@123'
      })
    });
    const cashierAuth = await cashierLoginRes.json();
    const cashierToken = cashierAuth.accessToken;
    assert(cashierLoginRes.ok, 'Cashier logged in successfully');

    // -------------------------------------------------------------
    // PHASE 2: ROLE-BASED & INDUSTRY PERMISSION CHECKS
    // -------------------------------------------------------------
    console.log('\n[PHASE 2] Role-Based & Module Access Enforcement');

    // Cashier CAN view invoices and receipts
    const cashierReceiptsCheck = await fetch(`${API_BASE}/payments/receipts`, {
      headers: { Authorization: `Bearer ${cashierToken}`, 'x-branch-id': branchId }
    });
    assert(cashierReceiptsCheck.ok, 'Cashier authorized to access /payments/receipts (Operational module)');

    // Cashier CANNOT access team administration or settings
    const cashierTeamCheck = await fetch(`${API_BASE}/team/members`, {
      headers: { Authorization: `Bearer ${cashierToken}`, 'x-branch-id': branchId }
    });
    assert(cashierTeamCheck.status === 403, 'Cashier correctly BLOCKED from /team/members with 403 Forbidden');

    // -------------------------------------------------------------
    // PHASE 3: CREATE INVOICE (₹10,000) AND PARTIAL PAYMENT (₹4,000)
    // -------------------------------------------------------------
    console.log('\n[PHASE 3] Commercial Invoice & Partial Payment Lifecycle');

    // Create Wholesale Product
    const prodRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        name: 'Premium Basmati Grain 25kg',
        sku: `BASMATI-${suffix}`,
        category: 'Grains',
        sellingPrice: 2000,
        costPrice: 1500,
        taxRate: 0,
        currentStock: 100,
        unit: 'BAG'
      })
    });
    const prod = await prodRes.json();

    // Create Customer
    const custRes = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        name: 'Royal Supermart Wholesale',
        phone: `98${suffix}2222`,
        email: `royalsupermart.${suffix}@test.com`,
        creditLimit: 50000
      })
    });
    const cust = await custRes.json();

    // Create Invoice for ₹10,000 (5 Bags * ₹2,000 = ₹10,000)
    const invRes = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        branchId,
        customerId: cust.id,
        customerName: cust.name,
        lines: [
          {
            productId: prod.id,
            name: prod.name,
            quantity: 5,
            unitPrice: 2000,
            taxRate: 0,
            unit: 'BAG'
          }
        ]
      })
    });
    const invoice = await invRes.json();
    assert(invRes.ok, `Created Invoice ${invoice.invoiceNumber}: Total ₹${invoice.grandTotal}, Balance ₹${invoice.balanceAmount}`);
    assert(invoice.grandTotal === 10000, 'Invoice grand total is exactly ₹10,000');
    assert(invoice.balanceAmount === 10000, 'Initial outstanding balance is exactly ₹10,000');

    // Desktop Socket for Real-Time Verification
    const desktopSocket = io(SOCKET_URL, { transports: ['websocket'] });
    let desktopReceivedPayment = false;
    let desktopReceivedPulse = false;

    await new Promise((resolve) => {
      desktopSocket.on('connect', () => {
        desktopSocket.emit('identify_presence', {
          userId: tenantAuth.user.id,
          organizationId: orgId,
          branchId,
          roleType: 'OWNER',
          platform: 'desktop'
        }, resolve);
      });
    });

    desktopSocket.on('payment_created', (p) => {
      if (p.invoiceId === invoice.id) desktopReceivedPayment = true;
    });

    desktopSocket.on('pulse_updated', (p) => {
      if (p.trigger === 'PAYMENT_COLLECTED') desktopReceivedPulse = true;
    });

    // Record Partial Payment of ₹4,000
    const paymentRes = await fetch(`${API_BASE}/payments/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: 4000,
        method: 'UPI',
        referenceNumber: `UPI-REF-${suffix}`,
        notes: 'Partial advance collection via QR'
      })
    });
    const paymentData = await paymentRes.json();
    assert(paymentRes.ok, `Recorded Payment of ₹4,000 via UPI (Receipt: ${paymentData.receipt?.receiptNumber})`);

    const receipt = paymentData.receipt;
    assert(receipt != null, 'Payment response includes valid Receipt entity');
    assert(receipt.amountPaid === 4000, 'Receipt amountPaid is exactly ₹4,000');
    assert(receipt.remainingBalance === 6000, 'Receipt remainingBalance is exactly ₹6,000');
    assert(paymentData.invoice.balanceAmount === 6000, 'Updated Invoice balance is exactly ₹6,000');
    assert(paymentData.invoice.paidAmount === 4000, 'Updated Invoice paid amount is exactly ₹4,000');

    // -------------------------------------------------------------
    // PHASE 4: RECEIPT SOFT-COPY & REPRINT ENDPOINTS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[PHASE 4] Soft-Copy Receipt Retrieval & Reprint Integrity');

    // 1. Check /payments/receipts listing
    const receiptsListRes = await fetch(`${API_BASE}/payments/receipts`, {
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-branch-id': branchId }
    });
    const receiptsList = await receiptsListRes.json();
    assert(receiptsListRes.ok, `Fetched /payments/receipts (${receiptsList.length} vouchers found)`);
    const foundReceipt = receiptsList.find((r) => r.id === receipt.id);
    assert(foundReceipt != null, 'Created receipt is listed in /payments/receipts');
    assert(foundReceipt.receiptNumber === receipt.receiptNumber, 'Receipt number matches in listing');
    assert(foundReceipt.paymentMethod === 'UPI', 'Receipt paymentMethod is UPI');

    // 2. Check /payments/receipts/:id/reprint (Canonical Soft-Copy Payload)
    const softCopyRes = await fetch(`${API_BASE}/payments/receipts/${receipt.id}/reprint`, {
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-branch-id': branchId }
    });
    const softCopyData = await softCopyRes.json();
    assert(softCopyRes.ok, 'Fetched authoritative soft copy via /payments/receipts/:id/reprint');
    assert(softCopyData.customerName === cust.name, `Soft copy includes customer: ${softCopyData.customerName}`);
    assert(softCopyData.invoice?.invoiceNumber === invoice.invoiceNumber, `Soft copy includes linked invoice: ${softCopyData.invoice?.invoiceNumber}`);
    assert(softCopyData.amountPaid === 4000, 'Soft copy confirms ₹4,000 received');
    assert(softCopyData.remainingBalance === 6000, 'Soft copy confirms ₹6,000 remaining');

    // -------------------------------------------------------------
    // PHASE 5: REPEATED PRINT / SHARE / VIEW READ-ONLY SAFETY
    // -------------------------------------------------------------
    console.log('\n[PHASE 5] Verification of Zero Financial Mutation During Repeated Views');

    // Simulating viewing / printing / sharing 5 times
    for (let i = 1; i <= 5; i++) {
      const repRes = await fetch(`${API_BASE}/payments/receipts/${receipt.id}/reprint`, {
        headers: { Authorization: `Bearer ${ownerToken}`, 'x-branch-id': branchId }
      });
      const rep = await repRes.json();
      assert(rep.amountPaid === 4000 && rep.remainingBalance === 6000, `View/Print attempt #${i}: Receipt data constant (Read-Only)`);
    }

    // Verify Invoice balance in database remains strictly ₹6,000
    const invCheckRes = await fetch(`${API_BASE}/invoices/${invoice.id}`, {
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-branch-id': branchId }
    });
    const invCheck = await invCheckRes.json();
    assert(invCheck.balanceAmount === 6000, 'Post-print verification: Invoice balance remains strictly ₹6,000');
    assert(invCheck.paidAmount === 4000, 'Post-print verification: Invoice paid amount remains strictly ₹4,000');

    // Verify Receipts count for this invoice is strictly 1 (no duplicate receipts)
    const allReceiptsRes = await fetch(`${API_BASE}/payments/receipts`, {
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-branch-id': branchId }
    });
    const allReceipts = await allReceiptsRes.json();
    const invoiceReceipts = allReceipts.filter((r) => r.invoiceId === invoice.id);
    assert(invoiceReceipts.length === 1, 'Strictly ONE receipt exists for this payment (NO duplicates created)');

    // -------------------------------------------------------------
    // PHASE 6: REAL-TIME CROSS-PLATFORM PROPAGATION
    // -------------------------------------------------------------
    console.log('\n[PHASE 6] Desktop ↔ Mobile Realtime Sync Verification');

    await new Promise((r) => setTimeout(r, 600));
    assert(desktopReceivedPayment, 'Desktop received realtime payment_created socket event');
    assert(desktopReceivedPulse, 'Desktop received realtime pulse_updated event');

    desktopSocket.disconnect();

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`  MOBILE DRAWER & RECEIPT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  }
}

runMobileDrawerAndReceiptTestSuite();
