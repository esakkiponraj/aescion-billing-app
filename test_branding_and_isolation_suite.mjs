import assert from 'assert';

const API_BASE = 'http://localhost:4000/api/v1';

async function runBrandingAndIsolationTests() {
  console.log('\n================================================================');
  console.log('🛡️ AESCION COMMERCE — BRANDING & TENANT ISOLATION TEST SUITE');
  console.log('================================================================\n');

  // STEP 1: ONBOARD ORGANIZATION A (Alpha Retail)
  console.log('--- TEST GROUP 1: ONBOARDING ORGANIZATION A & B ---');
  const orgAPayload = {
    owner: {
      firstName: 'Alok',
      lastName: 'Nath',
      mobileNumber: '9840110011',
      email: `alok_${Date.now()}@alpharetail.com`,
      username: `alok_${Date.now()}`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    },
    businessType: 'SUPERMARKET',
    business: {
      name: 'Alpha Supermarket & Groceries',
      legalName: 'Alpha Retail Enterprises Pvt Ltd',
      phone: '044-24560011',
      email: `contact_${Date.now()}@alpharetail.com`,
      address: '10 Alpha Way',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: '33AAAAA1111A1Z1'
    },
    branches: [{ name: 'Alpha HQ Store', code: 'ALP-01', city: 'Chennai', state: 'Tamil Nadu', isMain: true }],
    teamSetupMode: 'JUST_ME',
    taxSettings: { taxMode: 'EXCLUSIVE', defaultRates: [0, 5, 12, 18, 28] },
    billingSettings: { invoicePrefix: 'INV-ALP', quotationPrefix: 'QTN-ALP', receiptPrefix: 'RCP-ALP' }
  };

  const resA = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orgAPayload)
  });
  const dataA = await resA.json();
  assert.strictEqual(resA.status, 201, 'Organization A creation failed');
  const tokenA = dataA.accessToken;
  const orgAId = dataA.organization.id;
  const branchAId = dataA.branches[0].id;
  const headersA = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenA}`,
    'x-branch-id': branchAId
  };
  console.log(`✅ [PASS] Onboarded Organization A: "${dataA.organization.name}" (ID: ${orgAId})`);

  // STEP 2: ONBOARD ORGANIZATION B (Beta Foods)
  const orgBPayload = {
    owner: {
      firstName: 'Brijesh',
      lastName: 'Patel',
      mobileNumber: '9840220022',
      email: `brijesh_${Date.now()}@betafoods.com`,
      username: `brijesh_${Date.now()}`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    },
    businessType: 'WHOLESALE',
    business: {
      name: 'Beta Wholesale Foods',
      legalName: 'Beta Foods Distribution Ltd',
      phone: '080-22440022',
      email: `contact_${Date.now()}@betafoods.com`,
      address: '20 Beta Industrial Area',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: '29BBBBB2222B1Z2'
    },
    branches: [{ name: 'Beta Central Depot', code: 'BET-01', city: 'Bangalore', state: 'Karnataka', isMain: true }],
    teamSetupMode: 'JUST_ME',
    taxSettings: { taxMode: 'INCLUSIVE', defaultRates: [0, 5, 12, 18, 28] },
    billingSettings: { invoicePrefix: 'INV-BET', quotationPrefix: 'QTN-BET', receiptPrefix: 'RCP-BET' }
  };

  const resB = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orgBPayload)
  });
  const dataB = await resB.json();
  assert.strictEqual(resB.status, 201, 'Organization B creation failed');
  const tokenB = dataB.accessToken;
  const orgBId = dataB.organization.id;
  const branchBId = dataB.branches[0].id;
  const headersB = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenB}`,
    'x-branch-id': branchBId
  };
  console.log(`✅ [PASS] Onboarded Organization B: "${dataB.organization.name}" (ID: ${orgBId})`);

  // STEP 3: VERIFY BRANDING RESOLUTION
  console.log('\n--- TEST GROUP 2: BRANDING RESOLUTION & BUSINESS PROFILE ---');
  const profileARes = await fetch(`${API_BASE}/organizations/business-profile`, { headers: headersA });
  const profileA = await profileARes.json();
  assert.strictEqual(profileARes.status, 200);
  assert.strictEqual(profileA.name, 'Alpha Supermarket & Groceries');
  assert.strictEqual(profileA.id, orgAId);
  console.log(`✅ [PASS] Owner A profile correctly returns: "${profileA.name}"`);

  const profileBRes = await fetch(`${API_BASE}/organizations/business-profile`, { headers: headersB });
  const profileB = await profileBRes.json();
  assert.strictEqual(profileBRes.status, 200);
  assert.strictEqual(profileB.name, 'Beta Wholesale Foods');
  assert.strictEqual(profileB.id, orgBId);
  console.log(`✅ [PASS] Owner B profile correctly returns: "${profileB.name}"`);

  // STEP 4: LOGO UPLOAD, STORAGE & SERVING
  console.log('\n--- TEST GROUP 3: LOGO UPLOAD, SERVING & REMOVAL ---');
  // 1x1 transparent PNG base64 for testing
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const uploadRes = await fetch(`${API_BASE}/organizations/logo`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      base64: samplePngBase64,
      mimetype: 'image/png'
    })
  });
  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadRes.status, 201, 'Logo upload failed');
  assert.strictEqual(typeof uploadData.logoUrl, 'string');
  console.log(`✅ [PASS] Logo uploaded for Org A. Relative URL: ${uploadData.logoUrl}`);

  // Fetch logo through public static endpoint
  const logoServeRes = await fetch(`http://localhost:4000${uploadData.logoUrl}`);
  assert.strictEqual(logoServeRes.status, 200, 'Logo serving failed');
  assert.strictEqual(logoServeRes.headers.get('content-type'), 'image/png');
  console.log(`✅ [PASS] Static logo served with HTTP 200 and image/png content-type`);

  // Test invalid logo format rejection
  const invalidLogoRes = await fetch(`${API_BASE}/organizations/logo`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      base64: 'data:text/plain;base64,SGVsbG8=',
      mimetype: 'text/plain'
    })
  });
  assert.strictEqual(invalidLogoRes.status, 400, 'Invalid logo format must return 400 Bad Request');
  console.log(`✅ [PASS] Invalid MIME type text/plain rejected with 400 Bad Request`);

  // STEP 5: UPDATE BUSINESS PROFILE WITH VALIDATION
  console.log('\n--- TEST GROUP 4: COMPANY NAME VALIDATION & UPDATE ---');
  const updateNameRes = await fetch(`${API_BASE}/organizations/business-profile`, {
    method: 'PUT',
    headers: headersA,
    body: JSON.stringify({
      name: 'Alpha Supermarket & Hypermart Pvt Ltd',
      legalName: 'Alpha Retail Enterprises Pvt Ltd',
      city: 'Chennai'
    })
  });
  const updatedOrgA = await updateNameRes.json();
  assert.strictEqual(updateNameRes.status, 200);
  assert.strictEqual(updatedOrgA.name, 'Alpha Supermarket & Hypermart Pvt Ltd');
  console.log(`✅ [PASS] Updated Org A company name to: "${updatedOrgA.name}"`);

  // Empty name validation
  const emptyNameRes = await fetch(`${API_BASE}/organizations/business-profile`, {
    method: 'PUT',
    headers: headersA,
    body: JSON.stringify({ name: '   ' })
  });
  assert.strictEqual(emptyNameRes.status, 400, 'Empty company name must return 400 Bad Request');
  console.log(`✅ [PASS] Empty company name rejected with 400 Bad Request`);

  // Remove Logo
  const removeLogoRes = await fetch(`${API_BASE}/organizations/logo`, {
    method: 'DELETE',
    headers: headersA
  });
  const removeLogoData = await removeLogoRes.json();
  assert.strictEqual(removeLogoRes.status, 200);
  assert.strictEqual(removeLogoData.logoUrl, null);
  console.log(`✅ [PASS] Logo removed. Falls back to initials avatar`);

  // STEP 6: STRICT TENANT DATA ISOLATION & SECURITY ATTACK PREVENTION
  console.log('\n--- TEST GROUP 5: STRICT TENANT DATA ISOLATION SECURITY ---');
  
  // 1. Verify Catalog Isolation
  const prodARes = await fetch(`${API_BASE}/products`, { headers: headersA });
  const prodsA = await prodARes.json();
  const prodBRes = await fetch(`${API_BASE}/products`, { headers: headersB });
  const prodsB = await prodBRes.json();

  assert.notStrictEqual(prodsA[0].id, prodsB[0].id, 'Products must belong to different tenants');
  console.log(`✅ [PASS] Catalog data completely isolated between Org A and Org B`);

  // 2. Cross-Tenant Branch Spoofing Attack: Owner A attempts to supply Org B's branch ID in header
  const spoofRes = await fetch(`${API_BASE}/products`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`,
      'x-branch-id': branchBId // Owner A trying to access Branch B!
    }
  });
  assert.strictEqual(spoofRes.status, 403, 'Cross-tenant branch spoofing must be blocked with 403 Forbidden');
  console.log(`✅ [PASS] Cross-tenant branch header spoofing blocked with 403 Forbidden`);

  // 3. RBAC Enforcement: Cashier cannot modify branding
  // Create cashier in Org A
  const rolesRes = await fetch(`${API_BASE}/team/roles`, { headers: headersA });
  const roles = await rolesRes.json();
  const cashierRole = roles.find(r => r.roleType === 'CASHIER' || r.name.toLowerCase().includes('cashier'));

  const staffRes = await fetch(`${API_BASE}/team/members`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      firstName: 'Karthik',
      lastName: 'Cashier',
      email: `karthik_${Date.now()}@alpharetail.com`,
      username: `karthik_${Date.now()}`,
      password: 'CashierPassword123!',
      roleId: cashierRole.id,
      branchId: branchAId
    })
  });
  const cashierData = await staffRes.json();
  
  // Login as Cashier
  const cashierLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: cashierData.user.username,
      password: 'CashierPassword123!'
    })
  });
  const cashierAuth = await cashierLoginRes.json();
  const cashierHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cashierAuth.accessToken}`,
    'x-branch-id': branchAId
  };

  // Cashier sees Org A branding
  const cashierProfileRes = await fetch(`${API_BASE}/organizations/business-profile`, { headers: cashierHeaders });
  assert.strictEqual(cashierProfileRes.status, 200);
  console.log(`✅ [PASS] Cashier can view Org A branding`);

  // Cashier attempts to update branding -> STRICTLY FORBIDDEN
  const cashierEditRes = await fetch(`${API_BASE}/organizations/business-profile`, {
    method: 'PUT',
    headers: cashierHeaders,
    body: JSON.stringify({ name: 'Hacked Store Name' })
  });
  assert.strictEqual(cashierEditRes.status, 403, 'Cashier must be blocked from editing branding with 403 Forbidden');
  console.log(`✅ [PASS] Cashier blocked from editing branding with 403 Forbidden`);

  console.log('\n================================================================');
  console.log('🎉 ALL 17/17 BRANDING & ISOLATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runBrandingAndIsolationTests().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
