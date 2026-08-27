const API_BASE = 'http://localhost:4000/api/v1';

async function testShiftsFlow() {
  console.log('================================================================');
  console.log('⏱️ VERIFYING CASHIER SHIFTS CONTROLLER & SERVICE ENDPOINTS');
  console.log('================================================================\n');

  // 1. Create a fresh test organization
  const onboardRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner: {
        firstName: 'Shift',
        lastName: 'Tester',
        mobileNumber: '9840554433',
        email: `shift_tester_${Date.now()}@example.com`,
        username: `shift_tester_${Date.now()}`,
        password: 'password123',
        confirmPassword: 'password123'
      },
      businessType: 'SUPERMARKET',
      business: {
        name: 'Grand Mart Express',
        legalName: 'Grand Mart Express Ltd',
        phone: '044-24567890',
        email: `mart_${Date.now()}@example.com`,
        address: '100 Mount Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600002',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: true,
        gstin: '33AAAAA0000A1Z5'
      },
      branches: [{ name: 'Express Branch', code: 'EXP', address: '100 Mount Road', city: 'Chennai', state: 'Tamil Nadu', phone: '044-24567890', isMain: true }],
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
      }
    })
  });
  const onboard = await onboardRes.json();
  const token = onboard.accessToken;
  const branchId = onboard.branches?.[0]?.id || onboard.organization?.id;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-branch-id': branchId
  };

  // Test 1: GET /cashier-shifts/active when NO active shift exists
  console.log('1. Testing GET /cashier-shifts/active when no shift is open:');
  const activeRes1 = await fetch(`${API_BASE}/cashier-shifts/active`, { headers: authHeaders });
  const text1 = await activeRes1.text();
  const activeData1 = text1 ? JSON.parse(text1) : null;
  console.log(`   HTTP Status: ${activeRes1.status}`, activeData1);
  if (activeRes1.status === 200 && activeData1 === null) {
    console.log('   ✅ PASS: Returns HTTP 200 with safe null value');
  } else {
    throw new Error(`FAIL: Expected 200 null, got ${activeRes1.status}`);
  }

  // Test 2: POST /cashier-shifts/open
  console.log('\n2. Testing POST /cashier-shifts/open with ₹2500 float:');
  const openRes = await fetch(`${API_BASE}/cashier-shifts/open`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      registerId: branchId,
      openingFloat: 2500
    })
  });
  const openData = await openRes.json();
  console.log(`   HTTP Status: ${openRes.status}`, openData);
  if (openRes.status === 201 && openData.status === 'OPEN' && openData.openingFloat === 2500) {
    console.log('   ✅ PASS: Opened new shift with opening float');
  } else {
    throw new Error(`FAIL: Shift open failed with status ${openRes.status}`);
  }

  // Test 3: Duplicate active shift block
  console.log('\n3. Testing duplicate shift opening block:');
  const dupRes = await fetch(`${API_BASE}/cashier-shifts/open`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ openingFloat: 1000 })
  });
  console.log(`   HTTP Status: ${dupRes.status}`);
  if (dupRes.status === 400) {
    console.log('   ✅ PASS: Duplicate open shift correctly rejected with 400 Bad Request');
  } else {
    throw new Error(`FAIL: Expected 400 Bad Request for duplicate shift, got ${dupRes.status}`);
  }

  // Test 4: GET /cashier-shifts/active when shift IS active
  console.log('\n4. Testing GET /cashier-shifts/active with open shift:');
  const activeRes2 = await fetch(`${API_BASE}/cashier-shifts/active`, { headers: authHeaders });
  const activeData2 = await activeRes2.json();
  console.log(`   HTTP Status: ${activeRes2.status}`, activeData2?.shiftNumber);
  if (activeRes2.status === 200 && activeData2?.status === 'OPEN' && activeData2?.expectedCash === 2500) {
    console.log('   ✅ PASS: Returned active shift with live expected cash calculations');
  } else {
    throw new Error('FAIL: Expected active shift object');
  }

  // Test 5: GET /cashier-shifts
  console.log('\n5. Testing GET /cashier-shifts (history list):');
  const listRes = await fetch(`${API_BASE}/cashier-shifts`, { headers: authHeaders });
  const listData = await listRes.json();
  console.log(`   HTTP Status: ${listRes.status}, count: ${listData.length}`);
  if (listRes.status === 200 && Array.isArray(listData) && listData.length >= 1) {
    console.log('   ✅ PASS: Returned shift history array');
  } else {
    throw new Error('FAIL: Expected shift history array');
  }

  // Test 6: POST /cashier-shifts/close
  console.log('\n6. Testing POST /cashier-shifts/close (active shift closure):');
  const closeRes = await fetch(`${API_BASE}/cashier-shifts/close`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      actualCashCounted: 2500,
      notes: 'End of evening shift'
    })
  });
  const closeData = await closeRes.json();
  console.log(`   HTTP Status: ${closeRes.status}, shiftStatus: ${closeData.status}`);
  if (closeRes.status === 201 || closeRes.status === 200) {
    console.log('   ✅ PASS: Active shift closed and reconciled successfully');
  } else {
    throw new Error(`FAIL: Shift close failed with status ${closeRes.status}`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL CASHIER SHIFTS API TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

testShiftsFlow().catch(err => {
  console.error('Fatal error during shift tests:', err);
  process.exit(1);
});
