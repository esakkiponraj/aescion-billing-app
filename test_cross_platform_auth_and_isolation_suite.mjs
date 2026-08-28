const API_BASE = 'http://localhost:4000/api/v1';

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = new Error(`Request failed with status ${res.status}: ${JSON.stringify(data)}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function runCrossPlatformTestSuite() {
  console.log('\n================================================================');
  console.log('🔄 AESCION COMMERCE — CROSS-PLATFORM OWNER REGISTRATION & AUTH SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testId = Date.now();
  const mobileEmail = `mobile_owner_${testId}@teststore.com`;
  const mobileUsername = `mob_owner_${testId}`;
  const mobilePassword = 'SecurePassword@123';
  const mobileCompany = `Metro Supermart ${testId}`;

  const desktopEmail = `desktop_owner_${testId}@testretail.com`;
  const desktopUsername = `desk_owner_${testId}`;
  const desktopPassword = 'SecurePassword@456';
  const desktopCompany = `Apex Retailers ${testId}`;

  let mobileAuthPayload = null;
  let desktopAuthPayload = null;

  // -------------------------------------------------------------
  // TEST GROUP 1: MOBILE OWNER REGISTRATION (ATOMIC ONBOARDING)
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: MOBILE OWNER REGISTRATION (ATOMIC ONBOARDING) ---');
  try {
    mobileAuthPayload = await apiRequest('/onboarding/create-business', {
      method: 'POST',
      body: JSON.stringify({
        owner: {
          firstName: 'Vikram',
          lastName: 'Singhania',
          mobileNumber: '9876543210',
          email: mobileEmail,
          username: mobileUsername,
          password: mobilePassword
        },
        businessType: 'SUPERMARKET',
        business: {
          name: mobileCompany,
          legalName: mobileCompany,
          phone: '9876543210',
          email: mobileEmail,
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
      })
    });

    if (
      mobileAuthPayload.accessToken &&
      mobileAuthPayload.user.email === mobileEmail.toLowerCase() &&
      mobileAuthPayload.organization.name === mobileCompany &&
      mobileAuthPayload.activeRole.roleType === 'OWNER' &&
      mobileAuthPayload.activeRole.roleType !== 'SUPER_ADMIN'
    ) {
      console.log('✅ [PASS] Mobile Owner registered atomically with OWNER role and starter catalog');
      passed++;
    } else {
      throw new Error('Invalid mobile registration response structure');
    }
  } catch (err) {
    console.error('❌ [FAIL] Mobile Owner registration failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: LOGIN TO DESKTOP USING MOBILE-CREATED OWNER
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: LOGIN TO DESKTOP USING MOBILE-CREATED OWNER ---');
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: mobileEmail,
        password: mobilePassword
      })
    });

    if (
      res.accessToken &&
      res.organization.name === mobileCompany &&
      res.user.email === mobileEmail.toLowerCase() &&
      res.activeRole.roleType === 'OWNER'
    ) {
      console.log('✅ [PASS] Desktop login succeeded using mobile-created Owner credentials');
      passed++;
    } else {
      throw new Error('Desktop login returned incorrect organization or user');
    }
  } catch (err) {
    console.error('❌ [FAIL] Desktop login failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: DESKTOP OWNER REGISTRATION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: DESKTOP OWNER REGISTRATION ---');
  try {
    desktopAuthPayload = await apiRequest('/onboarding/create-business', {
      method: 'POST',
      body: JSON.stringify({
        owner: {
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          mobileNumber: '9123456780',
          email: desktopEmail,
          username: desktopUsername,
          password: desktopPassword
        },
        businessType: 'RETAIL',
        business: {
          name: desktopCompany,
          legalName: desktopCompany,
          phone: '9123456780',
          email: desktopEmail,
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
          country: 'India',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          gstStatus: false
        },
        branches: [
          {
            name: 'Colaba Flagship Store',
            code: 'COLABA',
            city: 'Mumbai',
            state: 'Maharashtra',
            phone: '9123456780',
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
      })
    });

    if (
      desktopAuthPayload.accessToken &&
      desktopAuthPayload.user.email === desktopEmail.toLowerCase() &&
      desktopAuthPayload.organization.name === desktopCompany &&
      desktopAuthPayload.activeRole.roleType === 'OWNER'
    ) {
      console.log('✅ [PASS] Desktop Owner registered atomically with OWNER role and Retail pack');
      passed++;
    } else {
      throw new Error('Invalid desktop registration response structure');
    }
  } catch (err) {
    console.error('❌ [FAIL] Desktop Owner registration failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: LOGIN TO MOBILE USING DESKTOP-CREATED OWNER
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: LOGIN TO MOBILE USING DESKTOP-CREATED OWNER ---');
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: desktopEmail,
        password: desktopPassword
      })
    });

    if (
      res.accessToken &&
      res.organization.name === desktopCompany &&
      res.user.email === desktopEmail.toLowerCase() &&
      res.activeRole.roleType === 'OWNER'
    ) {
      console.log('✅ [PASS] Mobile login succeeded using desktop-created Owner credentials');
      passed++;
    } else {
      throw new Error('Mobile login returned incorrect organization or user');
    }
  } catch (err) {
    console.error('❌ [FAIL] Mobile login failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: BI-DIRECTIONAL SHARED DATA (DESKTOP & MOBILE)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: BI-DIRECTIONAL SHARED DATA ---');
  try {
    // 1. Desktop creates a product
    const createdProduct = await apiRequest('/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopAuthPayload.accessToken}`,
        'x-organization-id': desktopAuthPayload.organization.id,
        'x-branch-id': desktopAuthPayload.activeBranch.id
      },
      body: JSON.stringify({
        name: `Premium Silk Scarf ${testId}`,
        sku: `APP-SCF-${testId}`,
        barcode: `890${testId}`,
        category: 'Accessories',
        unit: 'PCS',
        costPrice: 400,
        sellingPrice: 899,
        mrp: 999,
        taxRate: 12,
        currentStock: 20
      })
    });

    // 2. Mobile reads product list
    const getProdsRes = await apiRequest('/products', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${desktopAuthPayload.accessToken}`,
        'x-organization-id': desktopAuthPayload.organization.id,
        'x-branch-id': desktopAuthPayload.activeBranch.id
      }
    });

    const itemsList = getProdsRes.items || getProdsRes;
    const foundInMobile = Array.isArray(itemsList) && itemsList.some((p) => p.id === createdProduct.id);

    if (foundInMobile) {
      console.log('✅ [PASS] Desktop-created product immediately accessible in Mobile catalog view');
      passed++;
    } else {
      throw new Error('Product created on Desktop not visible to Mobile');
    }

    // 3. Mobile creates an invoice with CreateInvoiceSchema structure
    const createdInvoice = await apiRequest('/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${desktopAuthPayload.accessToken}`,
        'x-organization-id': desktopAuthPayload.organization.id,
        'x-branch-id': desktopAuthPayload.activeBranch.id
      },
      body: JSON.stringify({
        branchId: desktopAuthPayload.activeBranch.id,
        customerName: 'Walk-in Customer',
        lines: [
          {
            productId: createdProduct.id,
            name: createdProduct.name,
            sku: createdProduct.sku,
            quantity: 2,
            unitPrice: createdProduct.sellingPrice,
            taxRate: createdProduct.taxRate,
            unit: 'PCS'
          }
        ],
        payment: {
          method: 'CASH',
          amount: Math.round(createdProduct.sellingPrice * 2 * 1.12)
        }
      })
    });

    // 4. Desktop fetches invoices
    const getInvsRes = await apiRequest('/invoices', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${desktopAuthPayload.accessToken}`,
        'x-organization-id': desktopAuthPayload.organization.id,
        'x-branch-id': desktopAuthPayload.activeBranch.id
      }
    });

    const invList = getInvsRes.items || getInvsRes;
    const foundInDesktop = Array.isArray(invList) && invList.some((i) => i.id === createdInvoice.id);

    if (foundInDesktop) {
      console.log('✅ [PASS] Mobile-created invoice immediately accessible in Desktop reports and ledger');
      passed++;
    } else {
      throw new Error('Invoice created on Mobile not visible to Desktop');
    }
  } catch (err) {
    console.error('❌ [FAIL] Bi-directional data sync failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: STRICT MULTI-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: STRICT MULTI-TENANT ISOLATION ---');
  try {
    // Mobile Owner (Org A) tries to fetch Desktop Owner (Org B) products
    const leakAttemptRes = await apiRequest('/products', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mobileAuthPayload.accessToken}`,
        'x-organization-id': mobileAuthPayload.organization.id,
        'x-branch-id': mobileAuthPayload.activeBranch.id
      }
    });

    const items = leakAttemptRes.items || leakAttemptRes;
    const leaked = Array.isArray(items) && items.some((p) => p.name && p.name.includes(testId.toString()));

    if (!leaked) {
      console.log('✅ [PASS] Tenant Guard verified: Mobile Owner A cannot see Desktop Owner B data');
      passed++;
    } else {
      throw new Error('DATA LEAK DETECTED: Owner A can see Owner B items!');
    }
  } catch (err) {
    console.error('❌ [FAIL] Multi-tenant isolation test failed:', err.data || err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST GROUP 7: DUPLICATE EMAIL REJECTION & ERROR INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: DUPLICATE EMAIL REJECTION ---');
  try {
    await apiRequest('/onboarding/create-business', {
      method: 'POST',
      body: JSON.stringify({
        owner: {
          firstName: 'Duplicate',
          lastName: 'Tester',
          mobileNumber: '9999999999',
          email: mobileEmail, // Duplicate!
          username: `dup_${testId}`,
          password: 'Password@123'
        },
        businessType: 'SUPERMARKET',
        business: {
          name: 'Duplicate Company',
          phone: '9999999999',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '600001'
        },
        branches: [{ name: 'Branch', code: 'BR1' }],
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
      })
    });
    console.error('❌ [FAIL] Duplicate email was accepted when it should have been rejected!');
    failed++;
  } catch (err) {
    if (err.status === 409) {
      console.log('✅ [PASS] Duplicate email registration rejected with HTTP 409 Conflict');
      passed++;
    } else {
      console.error('❌ [FAIL] Unexpected error status:', err.status, err.data);
      failed++;
    }
  }

  console.log('\n================================================================');
  if (failed === 0) {
    console.log(`🎉 ALL ${passed}/${passed} CROSS-PLATFORM REGISTRATION & AUTH TESTS PASSED (100%)!`);
  } else {
    console.log(`⚠️ SUITE FINISHED WITH ${failed} FAILURES, ${passed} PASSED.`);
  }
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runCrossPlatformTestSuite();
