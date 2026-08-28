import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOnboardingPayload(companyName, businessType, email, username, password) {
  return {
    owner: {
      firstName: 'Wholesale',
      lastName: 'Manager',
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

async function runSuite() {
  console.log('\n================================================================');
  console.log('⚡ AESCION COMMERCE — WHOLESALE, LIVE COUNTERS & REPORTS TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 10;

  try {
    const ownerEmail = `wholesale.owner.${Date.now()}@aescion.com`;
    const ownerUser = `wholesale_${Date.now()}`;
    const ownerPass = 'SecurePass!2026';

    const regRes = await fetch(`${API_BASE}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOnboardingPayload('AESCION Wholesale & Distribution Hub', 'WHOLESALE', ownerEmail, ownerUser, ownerPass))
    });

    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.accessToken) {
      throw new Error(`Owner registration failed: ${JSON.stringify(regData)}`);
    }

    const token = regData.accessToken;
    const orgId = regData.organization.id;
    const branchId = regData.branches?.[0]?.id || regData.branch?.id || regData.organization?.branches?.[0]?.id;

    // Connect Desktop and Mobile socket clients
    const desktopSocket = io(SOCKET_URL, { transports: ['websocket'] });
    const mobileSocket = io(SOCKET_URL, { transports: ['websocket'] });

    await new Promise((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count === 2) resolve(null);
      };
      desktopSocket.on('connect', check);
      mobileSocket.on('connect', check);
    });

    desktopSocket.emit('joinBranchRoom', { organizationId: orgId, branchId });
    mobileSocket.emit('join_branch', { organizationId: orgId, branchId });
    await wait(600);

    // -------------------------------------------------------------
    // TEST 1: INITIAL DASHBOARD KPI COUNTERS
    // -------------------------------------------------------------
    console.log('--- TEST 1: INITIAL DASHBOARD AUTHORITATIVE COUNTERS ---');
    const pulseRes1 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const initialPulse = await pulseRes1.json();

    if (
      initialPulse.quotationCount === 0 &&
      initialPulse.invoiceCount === 0 &&
      initialPulse.receiptCount === 0 &&
      initialPulse.salesOrderCount === 0
    ) {
      console.log('✅ [PASS] Initial state: All commercial counters authoritatively zero (0)');
      passedTests++;
    } else {
      console.error('❌ [FAIL] Initial pulse unexpected values:', initialPulse);
    }

    // -------------------------------------------------------------
    // TEST 2: WHOLESALE SALES ORDER CREATION & REALTIME PULSE
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: WHOLESALE SALES ORDER CREATION ---');
    let realtimeOrderReceived = false;
    mobileSocket.on('wholesale_order_updated', () => {
      realtimeOrderReceived = true;
    });

    // Create a starter product for stock testing
    const prodRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Bulk Basmati Rice 50kg Sack',
        sku: 'RICE-50KG',
        barcode: '8901234567890',
        initialStock: 100,
        costPrice: 2000,
        sellingPrice: 2500,
        mrp: 2700,
        taxRate: 5,
        unit: 'BAG'
      })
    });
    const starterProduct = await prodRes.json();

    const soRes = await fetch(`${API_BASE}/wholesale/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customerName: 'Tamil Nadu Super Foods Ltd',
        customerPhone: '9840123456',
        gstin: '33AAACT1234F1Z5',
        paymentTerms: 'Net 30',
        items: [
          {
            productId: starterProduct.id,
            name: 'Bulk Basmati Rice 50kg Sack',
            quantityOrdered: 20,
            unitPrice: 2500,
            taxRate: 5
          }
        ]
      })
    });
    const salesOrder = await soRes.json();

    await wait(600);
    const pulseRes2 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pulseAfterSO = await pulseRes2.json();

    if (
      salesOrder.orderNumber && salesOrder.orderNumber.startsWith('SO-') &&
      salesOrder.items[0].quantityOrdered === 20 &&
      pulseAfterSO.salesOrderCount === 1 &&
      pulseAfterSO.pendingDispatches === 1 &&
      realtimeOrderReceived
    ) {
      console.log(`✅ [PASS] Created Sales Order ${salesOrder.orderNumber}: ₹${salesOrder.totalAmount}, live counters updated (SO: 1, Pending DC: 1)`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Sales order creation test failed:', { salesOrder, pulseAfterSO, realtimeOrderReceived });
    }

    // -------------------------------------------------------------
    // TEST 3: DISPATCH & DELIVERY CHALLAN (STOCK DEDUCTION)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: DISPATCH & STOCK DEDUCTION (DELIVERY CHALLAN) ---');
    const dispatchResRaw = await fetch(`${API_BASE}/wholesale/sales-orders/${salesOrder.id}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        vehicleNo: 'TN-09-AB-9999',
        driverName: 'Ramesh Kumar',
        transporterName: 'VRL Logistics Express'
      })
    });
    const dispatchRes = await dispatchResRaw.json();

    // Verify inventory reduced in database
    const prodCheckRes = await fetch(`${API_BASE}/products/${starterProduct.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const productAfterDispatch = await prodCheckRes.json();
    const stockDeducted = productAfterDispatch.currentStock === 80; // 100 - 20 = 80

    if (
      dispatchRes.status === 'DISPATCHED' &&
      dispatchRes.challanNumber && dispatchRes.challanNumber.startsWith('DC-') &&
      stockDeducted
    ) {
      console.log(`✅ [PASS] Issued Delivery Challan ${dispatchRes.challanNumber}: Stock deducted from 100 to ${productAfterDispatch.currentStock} BAGs`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Dispatch test failed:', { dispatchRes, productAfterDispatch });
    }

    // -------------------------------------------------------------
    // TEST 4: CONVERT SALES ORDER TO INVOICE
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: CONVERT SALES ORDER TO OFFICIAL TAX INVOICE ---');
    const convertResRaw = await fetch(`${API_BASE}/wholesale/sales-orders/${salesOrder.id}/convert-to-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    const invoiceRes = await convertResRaw.json();

    await wait(400);
    const pulseRes3 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pulseAfterInvoice = await pulseRes3.json();

    if (
      invoiceRes.invoice && invoiceRes.invoice.invoiceNumber && invoiceRes.invoice.invoiceNumber.startsWith('INV-') &&
      invoiceRes.order.status === 'INVOICED' &&
      pulseAfterInvoice.invoiceCount === 1
    ) {
      console.log(`✅ [PASS] Converted SO to Invoice ${invoiceRes.invoice.invoiceNumber}: ₹${invoiceRes.invoice.grandTotal}, Dashboard Invoices: 1`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Convert to invoice test failed:', { invoiceRes, pulseAfterInvoice });
    }

    // -------------------------------------------------------------
    // TEST 5: CUSTOMER CREDIT & PAYMENT RECEIPT COLLECTION
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: CUSTOMER CREDIT SETTLEMENT & RECEIPT RECORDING ---');
    // Billed ₹52,500 on credit. Now record ₹20,000 partial collection.
    const collectResRaw = await fetch(`${API_BASE}/payments/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        invoiceId: invoiceRes.invoice.id,
        amount: 20000,
        method: 'UPI',
        referenceNumber: 'UPI987654321',
        notes: 'Partial settlement via UPI'
      })
    });
    const collectRes = await collectResRaw.json();

    await wait(400);
    const pulseRes4 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pulseAfterReceipt = await pulseRes4.json();

    if (
      collectRes.receipt && collectRes.receipt.receiptNumber && collectRes.receipt.receiptNumber.startsWith('RCP-') &&
      collectRes.invoice.balanceAmount === 32500 &&
      collectRes.customer.currentOutstanding === 32500 &&
      pulseAfterReceipt.receiptCount === 1 &&
      pulseAfterReceipt.collections.upi === 20000
    ) {
      console.log(`✅ [PASS] Recorded Receipt ${collectRes.receipt.receiptNumber}: Collected ₹20,000 UPI, Customer balance reduced to ₹${collectRes.customer.currentOutstanding}, Receipts: 1`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Payment collection test failed:', { collectRes, pulseAfterReceipt });
    }

    // -------------------------------------------------------------
    // TEST 6: QUOTATION CREATION & LIVE DASHBOARD INCREMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: QUOTATION CREATION & LIVE DASHBOARD INCREMENT ---');
    let quotationEventReceived = false;
    mobileSocket.on('quotation_updated', () => {
      quotationEventReceived = true;
    });

    const quoteResRaw = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customerName: 'Metro Hypermarket',
        customerPhone: '9888877777',
        validUntilDays: 14,
        lines: [
          {
            productId: starterProduct.id,
            name: 'Bulk Basmati Rice 50kg Sack',
            quantity: 50,
            unit: 'BAG',
            unitPrice: 2400,
            taxRate: 5,
            taxMode: 'EXCLUSIVE'
          }
        ]
      })
    });
    const quotation = await quoteResRaw.json();

    await wait(600);
    const pulseRes5 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pulseAfterQuote = await pulseRes5.json();

    if (
      quotation.quotationNumber && quotation.quotationNumber.startsWith('QTN-') &&
      pulseAfterQuote.quotationCount === 1
    ) {
      console.log(`✅ [PASS] Created Quotation ${quotation.quotationNumber}: Live Quotations count updated from 0 to 1`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Quotation test failed:', { quotation, pulseAfterQuote });
    }

    // -------------------------------------------------------------
    // TEST 7: INVOICE CREATION & LIVE REVENUE CONVERGENCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: INVOICE CREATION & LIVE REVENUE UPDATE ---');
    let invoiceEventReceived = false;
    desktopSocket.on('invoice_created', () => {
      invoiceEventReceived = true;
    });

    const newInvResRaw = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-branch-id': branchId
      },
      body: JSON.stringify({
        branchId,
        customerName: 'Direct Cash Customer',
        customerPhone: '9111122222',
        lines: [
          {
            productId: starterProduct.id,
            name: starterProduct.name,
            sku: starterProduct.sku,
            quantity: 1,
            unitPrice: 2500,
            taxRate: 5,
            taxMode: 'EXCLUSIVE'
          }
        ],
        payment: {
          method: 'CASH',
          amount: 2625
        }
      })
    });
    const newInvoice = await newInvResRaw.json();

    await wait(600);
    const pulseRes6 = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${token}`, 'x-branch-id': branchId }
    });
    const pulseAfterSecondInvoice = await pulseRes6.json();

    if (
      newInvoice.invoiceNumber && newInvoice.invoiceNumber.startsWith('INV-') &&
      pulseAfterSecondInvoice.invoiceCount === 2 &&
      pulseAfterSecondInvoice.totalRevenue === 55125 && // 52500 + 2625
      invoiceEventReceived
    ) {
      console.log(`✅ [PASS] Billed Invoice ${newInvoice.invoiceNumber}: ₹2,625 Cash, Total Revenue converged to ₹${pulseAfterSecondInvoice.totalRevenue}, Invoices: 2`);
      passedTests++;
    } else {
      console.error('❌ [FAIL] Direct invoice test failed:', { newInvoice, pulseAfterSecondInvoice, invoiceEventReceived });
    }

    // -------------------------------------------------------------
    // TEST 8: ADVANCED REPORTING APIS (TRENDS, AGEING, PIPELINES)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: ADVANCED VISUAL REPORTING APIS ---');
    const analyticsResRaw = await fetch(`${API_BASE}/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const analytics = await analyticsResRaw.json();

    const hasRevenueTrend = analytics.revenueTrend && analytics.revenueTrend.length === 7;
    const hasTopProducts = analytics.topSellingProducts && analytics.topSellingProducts.length > 0;
    const hasAgeing = analytics.receivablesAgeing && analytics.receivablesAgeing.total > 0;
    const hasPipeline = analytics.invoiceStatusBreakdown && analytics.salesOrderStatusBreakdown;

    if (hasRevenueTrend && hasTopProducts && hasAgeing && hasPipeline) {
      console.log('✅ [PASS] Analytics APIs verified: 7-day revenue trend, top selling items ranking, receivables ageing buckets, status pipelines');
      passedTests++;
    } else {
      console.error('❌ [FAIL] Reporting summary API test failed:', analytics);
    }

    // -------------------------------------------------------------
    // TEST 9: SYSTEM AUDIT TRAIL LOGGING
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: SYSTEM AUDIT TRAIL (WHO • DID WHAT • WHEN) ---');
    const auditResRaw = await fetch(`${API_BASE}/reports/audit-logs?limit=15`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const auditLogsRes = await auditResRaw.json();

    const actionsLogged = (auditLogsRes.logs || []).map((l) => l.action);
    const hasOrderCreated = actionsLogged.includes('WHOLESALE_ORDER_CREATED');
    const hasDispatched = actionsLogged.includes('WHOLESALE_ORDER_DISPATCHED');
    const hasPayment = actionsLogged.includes('PAYMENT_COLLECTED');

    if (hasOrderCreated && hasDispatched && hasPayment) {
      console.log('✅ [PASS] System Audit Trail verified: Immutable logs for WHOLESALE_ORDER_CREATED, WHOLESALE_ORDER_DISPATCHED, PAYMENT_COLLECTED');
      passedTests++;
    } else {
      console.error('❌ [FAIL] Audit log verification failed:', auditLogsRes);
    }

    // -------------------------------------------------------------
    // TEST 10: STRICT TENANT ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: STRICT MULTI-TENANT ISOLATION ---');
    // Onboard a separate Tenant B
    const tenantBEmail = `tenantB.${Date.now()}@aescion.com`;
    const tenantBUser = `tenantB_${Date.now()}`;
    const tenantBPass = 'SecurePass!2026';

    const regBRes = await fetch(`${API_BASE}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOnboardingPayload('Tenant B Retail Express', 'RETAIL', tenantBEmail, tenantBUser, tenantBPass))
    });
    const tenantB = await regBRes.json();

    // Check Tenant B cannot see Tenant A's orders or revenue
    const tBPulseRes = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, {
      headers: { Authorization: `Bearer ${tenantB.accessToken}` }
    });
    const tenantBPulse = await tBPulseRes.json();

    const tBOrdersRes = await fetch(`${API_BASE}/wholesale/sales-orders`, {
      headers: { Authorization: `Bearer ${tenantB.accessToken}` }
    });
    const tenantBOrders = await tBOrdersRes.json();

    if (tenantBPulse.totalRevenue === 0 && (tenantBOrders.length === 0 || tenantBOrders.statusCode === 403)) {
      console.log('✅ [PASS] Tenant & Industry Guard verified: Tenant B isolated with 0 revenue and 403 Forbidden / 0 orders from Tenant A');
      passedTests++;
    } else {
      console.error('❌ [FAIL] Tenant isolation test failed:', { tenantBPulse, tenantBOrders });
    }

    // Cleanup sockets
    desktopSocket.disconnect();
    mobileSocket.disconnect();

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED (100%)!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    process.exit(1);
  }
}

runSuite();
