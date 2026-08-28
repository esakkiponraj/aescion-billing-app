import fetch from 'node-fetch';

const LOCALHOST_API = 'http://localhost:4000/api/v1';
const LOOPBACK_API = 'http://127.0.0.1:4000/api/v1';

async function runMobileOnboardingAndCrossPlatformAuthSuite() {
  console.log('========================================================================');
  console.log('  AESCION COMMERCE — MOBILE/WEB ONBOARDING & SHARED ACCOUNT TEST SUITE');
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
    // TEST 1: BACKEND REACHABILITY ON LOCALHOST & 127.0.0.1 (PORT 4000)
    // -------------------------------------------------------------
    console.log('[TEST 1] Backend Health & Reachability Verification');

    const loopbackRes = await fetch(`${LOOPBACK_API}/reports/dashboard-pulse`);
    assert(loopbackRes.status === 401 || loopbackRes.status === 200, 'API reachable on 127.0.0.1:4000 (Android ADB reverse endpoint)');

    const localhostRes = await fetch(`${LOCALHOST_API}/reports/dashboard-pulse`);
    assert(localhostRes.status === 401 || localhostRes.status === 200, 'API reachable on localhost:4000 (Web preview endpoint)');

    // -------------------------------------------------------------
    // TEST 2: MOBILE/WEB OWNER ONBOARDING ("CREATE BUSINESS ACCOUNT")
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Mobile/Web Owner Registration (Step 4 Create Business)');

    const suffix = Math.floor(Math.random() * 8999 + 1000);
    const ownerEmail = `banu.${suffix}@gmail.com`;
    const ownerUsername = `banu_${suffix}`;
    const companyName = `Banu Restaurant ${suffix}`;

    // Exact payload format created by Mobile RegisterScreen Step 4
    const onboardingPayload = {
      owner: {
        firstName: 'Banu',
        lastName: 'M',
        mobileNumber: `98${suffix}3333`,
        email: ownerEmail,
        username: ownerUsername,
        password: 'Password@123'
      },
      businessType: 'RESTAURANT',
      business: {
        name: companyName,
        legalName: `${companyName} Pvt Ltd`,
        phone: `98${suffix}3333`,
        email: ownerEmail,
        address: '100 Mount Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600002',
        country: 'India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        gstStatus: true,
        gstin: `33AAACB${suffix}C1Z8`
      },
      branches: [
        {
          name: `${companyName} (Main)`,
          code: `BR${suffix}`,
          address: '100 Mount Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          phone: `98${suffix}3333`,
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
      industrySettings: {
        enableKOT: true,
        enableTables: true
      }
    };

    const registerRes = await fetch(`${LOOPBACK_API}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboardingPayload)
    });

    const registerData = await registerRes.json();
    assert(registerRes.ok, `POST /onboarding/create-business succeeded (HTTP ${registerRes.status})`);
    assert(registerData.accessToken != null, 'Received valid JWT access token for owner');
    assert(registerData.user != null, 'Received user payload');
    assert(registerData.user.email === ownerEmail, `User email matches: ${registerData.user.email}`);
    assert(registerData.organization != null, 'Received organization payload');
    assert(registerData.organization.name === companyName, `Organization matches: ${registerData.organization.name}`);
    assert(registerData.organization.businessType === 'RESTAURANT', 'Business Type is RESTAURANT');
    assert(registerData.activeBranch != null, 'Received active main branch');
    assert(registerData.activeRole?.roleType === 'OWNER', 'Assigned role is strictly OWNER (not SUPER_ADMIN)');

    // -------------------------------------------------------------
    // TEST 3: CROSS-PLATFORM DESKTOP LOGIN WITH NEW ACCOUNT
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Desktop Login using Mobile-Created Account');

    const desktopLoginRes = await fetch(`${LOCALHOST_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: ownerEmail,
        password: 'Password@123'
      })
    });

    const desktopAuth = await desktopLoginRes.json();
    assert(desktopLoginRes.ok, 'Desktop login with mobile-created owner succeeded');
    assert(desktopAuth.organization.id === registerData.organization.id, 'Desktop accesses EXACT SAME Organization ID');
    assert(desktopAuth.user.id === registerData.user.id, 'Desktop accesses EXACT SAME User ID');

    // -------------------------------------------------------------
    // TEST 4: CROSS-PLATFORM MOBILE LOGIN WITH NEW ACCOUNT
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Mobile Login using Username Identifier');

    const mobileLoginRes = await fetch(`${LOOPBACK_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: ownerUsername,
        password: 'Password@123'
      })
    });

    const mobileAuth = await mobileLoginRes.json();
    assert(mobileLoginRes.ok, 'Mobile login with username succeeded');
    assert(mobileAuth.organization.id === registerData.organization.id, 'Mobile accesses EXACT SAME Organization ID');

    // -------------------------------------------------------------
    // TEST 5: DUPLICATE REGISTRATION / CONFLICT PROTECTION
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Repeated Submission & Duplicate Prevention');

    const duplicateRes = await fetch(`${LOOPBACK_API}/onboarding/create-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboardingPayload)
    });

    assert(duplicateRes.status === 400 || duplicateRes.status === 409, `Duplicate registration rejected with HTTP ${duplicateRes.status}`);
    const duplicateData = await duplicateRes.json();
    assert(duplicateData.message != null, `Safe error message returned: "${duplicateData.message}"`);

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`  ONBOARDING & AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  }
}

runMobileOnboardingAndCrossPlatformAuthSuite();
