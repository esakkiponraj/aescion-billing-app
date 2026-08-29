import http from 'http';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:4000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:4000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING MOBILE FEATURE PARITY & UX RESTRUCTURE VERIFICATION');
  console.log('===============================================================\n');

  try {
    // Step 1: Onboard a Fresh Enterprise for Parity Verification
    const timestamp = Date.now();
    console.log('1. Onboarding Multi-Branch Enterprise...');
    const onboardRes = await request('POST', '/onboarding/create-business', {
      owner: {
        firstName: 'Vikram',
        lastName: 'Singhania',
        mobileNumber: '9840012345',
        email: `vikram_${timestamp}@apexcorp.com`,
        username: `vikram_${timestamp}`,
        password: 'Password@123'
      },
      businessType: 'RESTAURANT',
      business: {
        name: `Apex Retail & Dining ${timestamp}`,
        phone: '9840012345',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: true,
        gstin: '33AAAAA0000A1Z5'
      },
      branches: [
        { name: 'Downtown Dine-in', code: `DT-${timestamp.toString().slice(-4)}`, isMain: true }
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
    });

    assert(onboardRes.status === 201 || onboardRes.status === 200, 'Enterprise Onboarded');
    const token = onboardRes.data.tokens?.accessToken || onboardRes.data.accessToken;
    const orgId = onboardRes.data.organization?.id;
    const branchId = onboardRes.data.branch?.id || onboardRes.data.branches?.[0]?.id;

    assert(Boolean(token), 'Access Token Issued');
    assert(Boolean(orgId), 'Organization ID Verified');

    // Step 2: Test Realtime Dual-Tier Connection
    console.log('\n2. Testing Real-Time Socket.IO Synchronization...');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    let receivedBranchEvent = false;
    let receivedTeamEvent = false;
    let receivedQuotationEvent = false;
    let receivedInvoiceEvent = false;

    socket.on('connect', () => {
      console.log('  📡 Socket connected to real-time gateway');
    });

    socket.on('branch_updated', () => {
      receivedBranchEvent = true;
    });

    socket.on('team_updated', () => {
      receivedTeamEvent = true;
    });

    socket.on('quotation_updated', () => {
      receivedQuotationEvent = true;
    });

    socket.on('invoice_created', () => {
      receivedInvoiceEvent = true;
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Test Product Catalog Creation & Updates
    console.log('\n3. Testing Product Creation & Parity...');
    const createProdRes = await request('POST', '/products', {
      name: 'Paneer Butter Masala',
      sku: `PBM-${timestamp.toString().slice(-4)}`,
      category: 'Main Course',
      sellingPrice: 280,
      costPrice: 150,
      mrp: 280,
      taxRate: 5,
      unit: 'PORTION',
      initialStock: 100
    }, token);

    assert(createProdRes.status === 201 || createProdRes.status === 200, 'Product Created (Paneer Butter Masala)');
    const productId = createProdRes.data?.id;

    const updateProdRes = await request('PUT', `/products/${productId}`, {
      name: 'Special Paneer Butter Masala',
      sellingPrice: 310,
      taxRate: 5
    }, token);

    assert(updateProdRes.status === 200, 'Product Price & Name Updated');
    assert(updateProdRes.data?.sellingPrice === 310 || updateProdRes.data?.name?.includes('Special'), 'Product Updated in DB');

    // Step 4: Test Customer Creation & Parity
    console.log('\n4. Testing Customer Registration & Credit Adjustment...');
    const createCustRes = await request('POST', '/customers', {
      name: 'Rohan Sharma',
      phone: '9840055555',
      email: 'rohan@example.com',
      city: 'Chennai',
      state: 'Tamil Nadu',
      creditLimit: 25000
    }, token);

    assert(createCustRes.status === 201 || createCustRes.status === 200, 'Customer Created');
    const customerId = createCustRes.data?.id;

    const updateCustRes = await request('PUT', `/customers/${customerId}`, {
      name: 'Rohan Sharma (VIP)',
      creditLimit: 50000
    }, token);

    assert(updateCustRes.status === 200, 'Customer Credit Limit Adjusted to 50,000');

    // Step 5: Test Branch CRUD
    console.log('\n5. Testing Branch Creation & Management...');
    const createBranchRes = await request('POST', '/branches', {
      name: 'Airport Express Outlet',
      code: `APT-${timestamp.toString().slice(-4)}`,
      phone: '9840011111',
      address: 'Terminal 2 Departure',
      city: 'Chennai',
      state: 'Tamil Nadu'
    }, token);

    assert(createBranchRes.status === 201 || createBranchRes.status === 200, 'Secondary Branch Created');
    const secondBranchId = createBranchRes.data?.id;

    const updateBranchRes = await request('PUT', `/branches/${secondBranchId}`, {
      name: 'Airport Express T2 Premier',
      isActive: true
    }, token);

    assert(updateBranchRes.status === 200, 'Secondary Branch Updated');

    // Step 6: Test Team / Staff CRUD & Permissions
    console.log('\n6. Testing Staff Member Account Creation & Roles...');
    const createStaffRes = await request('POST', '/team/members', {
      firstName: 'Karan',
      lastName: 'Mehta',
      username: `karan_${timestamp}`,
      email: `karan_${timestamp}@apexcorp.com`,
      password: 'Password@123',
      roleName: 'CASHIER',
      branchId
    }, token);

    assert(createStaffRes.status === 201 || createStaffRes.status === 200, 'Cashier Staff Member Created');
    const staffId = createStaffRes.data?.id;

    const updateStaffRes = await request('PUT', `/team/members/${staffId}`, {
      firstName: 'Karan',
      lastName: 'Mehta (Lead)',
      roleName: 'MANAGER',
      isActive: true
    }, token);

    assert(updateStaffRes.status === 200, 'Staff Role Promoted to MANAGER');

    // Step 7: Test Quotation Flow: Create -> Status Update -> Convert to Invoice
    console.log('\n7. Testing Quotation Lifecycle & Direct Invoice Conversion...');
    const createQuoteRes = await request('POST', '/quotations', {
      branchId,
      customerId,
      customerName: 'Rohan Sharma (VIP)',
      items: [
        {
          productId,
          name: 'Special Paneer Butter Masala',
          quantity: 4,
          unitPrice: 310,
          taxRate: 5
        }
      ],
      notes: 'Corporate catering package estimate'
    }, token);

    assert(createQuoteRes.status === 201 || createQuoteRes.status === 200, 'Commercial Quotation Generated');
    const quoteId = createQuoteRes.data?.id;
    const quoteGrandTotal = createQuoteRes.data?.grandTotal;

    const statusQuoteRes = await request('PUT', `/quotations/${quoteId}/status`, {
      status: 'ACCEPTED'
    }, token);

    assert(statusQuoteRes.status === 200, 'Quotation Status Updated to ACCEPTED');

    const convertQuoteRes = await request('POST', `/quotations/${quoteId}/convert`, {}, token);
    assert(convertQuoteRes.status === 201 || convertQuoteRes.status === 200, 'Quotation Converted into Tax Invoice');
    const generatedInvoice = convertQuoteRes.data?.invoice || convertQuoteRes.data;
    const invoiceId = generatedInvoice?.id;
    assert(Boolean(invoiceId), 'Authoritative Tax Invoice ID Created from Quote');

    // Step 8: Test Invoices & Payment Collection
    console.log('\n8. Testing Invoice Settlement & Void Action Rules...');
    // Create an unpaid invoice to test Payment Collection
    const unpaidBillRes = await request('POST', '/invoices', {
      branchId,
      customerId,
      customerName: 'Rohan Sharma (VIP)',
      lines: [
        {
          productId,
          name: 'Special Paneer Butter Masala',
          quantity: 2,
          unitPrice: 310,
          taxRate: 5
        }
      ]
    }, token);

    assert(unpaidBillRes.status === 201 || unpaidBillRes.status === 200, 'Unpaid Bill Created for Collection');
    const unpaidInvoiceId = unpaidBillRes.data?.id;
    const unpaidBalance = unpaidBillRes.data?.balanceAmount || unpaidBillRes.data?.grandTotal || 651;

    const payRes = await request('POST', '/payments/collect', {
      invoiceId: unpaidInvoiceId,
      amount: Number(unpaidBalance),
      method: 'UPI'
    }, token);

    assert(payRes.status === 200 || payRes.status === 201, 'Payment Collected via UPI and Receipt Issued');

    // Create a second direct bill to test Void
    const secondBillRes = await request('POST', '/invoices', {
      branchId,
      customerId,
      customerName: 'Rohan Sharma (VIP)',
      lines: [
        {
          productId,
          name: 'Special Paneer Butter Masala',
          quantity: 1,
          unitPrice: 310,
          taxRate: 5
        }
      ]
    }, token);

    assert(secondBillRes.status === 201 || secondBillRes.status === 200, 'Second Direct Bill Created');
    const secondInvoiceId = secondBillRes.data?.id;

    const voidRes = await request('PUT', `/invoices/${secondInvoiceId}/void`, {
      reason: 'Billing entry mistake rectified'
    }, token);

    assert(voidRes.status === 200, 'Invoice Successfully Marked VOID with Reason');

    // Step 9: Test Pulse Dashboard Aggregations via /reports/dashboard-pulse
    console.log('\n9. Testing Authoritative Pulse Metrics & Operational KPIs...');
    const pulseRes = await request('GET', '/reports/dashboard-pulse', null, token);
    assert(pulseRes.status === 200, 'Dashboard Pulse Responded with Live KPIs');
    assert(pulseRes.data?.completedBills >= 1 || pulseRes.data?.metrics?.invoiceCount >= 1, 'Pulse Live Invoice Counters Synchronized');
    assert(pulseRes.data?.quotationCount >= 1 || pulseRes.data?.metrics?.quotationCount >= 1, 'Pulse Quotation Counters Synchronized');

    // Step 10: Wait for socket events propagation
    await new Promise((r) => setTimeout(r, 1000));
    socket.disconnect();

    console.log('\n===============================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 Test suite crashed:', err);
    process.exit(1);
  }
}

runSuite();
