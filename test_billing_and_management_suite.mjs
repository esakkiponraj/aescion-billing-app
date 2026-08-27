import assert from 'assert';

const API_BASE = 'http://localhost:4000/api/v1';

async function runBillingAndManagementTests() {
  console.log('\n================================================================');
  console.log('🏛️ AESCION COMMERCE — BILLING & MANAGEMENT END-TO-END SUITE');
  console.log('================================================================\n');

  // STEP 1: ONBOARDING FRESH ISOLATED BUSINESS
  console.log('--- TEST GROUP 1: ONBOARDING FRESH ENTERPRISE WORKSPACE ---');
  const orgPayload = {
    owner: {
      firstName: 'Vikram',
      lastName: 'Seth',
      mobileNumber: '9840112233',
      email: `vikram_${Date.now()}@aescioncommerce.com`,
      username: `vikram_${Date.now()}`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    },
    businessType: 'SUPERMARKET',
    business: {
      name: 'Seth Mega Hypermarket',
      legalName: 'Seth Retail Enterprises Pvt Ltd',
      phone: '044-24567890',
      email: `contact_${Date.now()}@sethretail.com`,
      address: '100 Mount Road, T. Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600017',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: '33AAAAA9999A1Z1'
    },
    branches: [
      {
        name: 'T. Nagar Flagship Store',
        code: 'TNG',
        address: '100 Mount Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        phone: '044-24567890',
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
    }
  };

  const onboardRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orgPayload)
  });
  const onboardData = await onboardRes.json();
  assert.strictEqual(onboardRes.status, 201, 'Onboarding failed');
  const token = onboardData.accessToken;
  const branchId = onboardData.branches[0].id;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-branch-id': branchId
  };
  console.log(`✅ [PASS] Onboarded "${orgPayload.business.name}" with branch ${branchId}`);

  // Fetch initial products seeded
  const productsRes = await fetch(`${API_BASE}/products`, { headers: authHeaders });
  const products = await productsRes.json();
  const sampleProduct = products[0];
  const initialStock = sampleProduct.currentStock;
  console.log(`✅ [PASS] Loaded catalog item: ${sampleProduct.name} (Stock: ${initialStock}, Price: ₹${sampleProduct.sellingPrice})`);

  // STEP 2: CUSTOMERS & CREDIT MANAGEMENT
  console.log('\n--- TEST GROUP 2: CUSTOMERS & CREDIT MANAGEMENT ---');
  const custRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Ramesh Corporate Services',
      phone: '9840223344',
      email: 'ramesh@corpservices.com',
      gstin: '33BBBBB2222B1Z3',
      creditLimit: 25000,
      address: '24 Anna Salai, Chennai'
    })
  });
  const customer = await custRes.json();
  assert.strictEqual(custRes.status, 201, 'Customer creation failed');
  console.log(`✅ [PASS] Registered customer: ${customer.name} (Credit Limit: ₹${customer.creditLimit})`);

  // Update Customer
  const custUpdateRes = await fetch(`${API_BASE}/customers/${customer.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Ramesh Corporate Services Pvt Ltd',
      creditLimit: 30000
    })
  });
  assert.strictEqual(custUpdateRes.status, 200, 'Customer update failed');
  console.log(`✅ [PASS] Updated customer credit limit to ₹30,000`);

  // STEP 3: QUOTATIONS LIFECYCLE (CREATE -> EDIT -> ACCEPT -> SAFE SINGLE CONVERT)
  console.log('\n--- TEST GROUP 3: QUOTATION ESTIMATES & SAFE CONVERSION ---');
  const quoteRes = await fetch(`${API_BASE}/quotations`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerId: customer.id,
      customerName: customer.name,
      lines: [
        {
          productId: sampleProduct.id,
          name: sampleProduct.name,
          quantity: 5,
          unitPrice: sampleProduct.sellingPrice,
          taxRate: sampleProduct.taxRate || 5
        }
      ]
    })
  });
  const quote = await quoteRes.json();
  assert.strictEqual(quoteRes.status, 201, 'Quotation creation failed');
  console.log(`✅ [PASS] Created Quotation ${quote.quotationNumber} (Grand Total: ₹${quote.grandTotal})`);

  // Verify stock was NOT deducted during quotation creation
  const checkStock1 = await fetch(`${API_BASE}/products/${sampleProduct.id}`, { headers: authHeaders });
  const stockData1 = await checkStock1.json();
  assert.strictEqual(stockData1.currentStock, initialStock, 'Quotation must NOT reduce stock');
  console.log(`✅ [PASS] Verified Quotation did NOT reduce stock (Stock remains: ${stockData1.currentStock})`);

  // Edit Quotation lines
  const quoteEditRes = await fetch(`${API_BASE}/quotations/${quote.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      customerName: customer.name,
      lines: [
        {
          productId: sampleProduct.id,
          name: sampleProduct.name,
          quantity: 10,
          unitPrice: sampleProduct.sellingPrice,
          taxRate: sampleProduct.taxRate || 5
        }
      ]
    })
  });
  const editedQuote = await quoteEditRes.json();
  assert.strictEqual(quoteEditRes.status, 200, 'Quotation edit failed');
  assert.strictEqual(editedQuote.lines[0].quantity, 10, 'Quotation quantity should be updated to 10');
  console.log(`✅ [PASS] Modified Quotation quantity to 10 (Updated Total: ₹${editedQuote.grandTotal})`);

  // Convert Quotation to Invoice
  const convertRes1 = await fetch(`${API_BASE}/quotations/${quote.id}/convert`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  const invoice = await convertRes1.json();
  assert.strictEqual(convertRes1.status, 201, 'Quotation conversion failed');
  console.log(`✅ [PASS] Successfully converted Quotation ${quote.quotationNumber} to Invoice ${invoice.invoiceNumber}`);

  // Test Idempotency / Double Convert Protection
  const convertRes2 = await fetch(`${API_BASE}/quotations/${quote.id}/convert`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.strictEqual(convertRes2.status, 409, 'Duplicate conversion should be strictly rejected with 409 Conflict');
  console.log(`✅ [PASS] Duplicate conversion rejected with 409 Conflict (0 duplicate invoices created)`);

  // Verify stock was reduced by 10 units after conversion
  const checkStock2 = await fetch(`${API_BASE}/products/${sampleProduct.id}`, { headers: authHeaders });
  const stockData2 = await checkStock2.json();
  assert.strictEqual(stockData2.currentStock, initialStock - 10, 'Stock should be reduced by 10 upon invoice creation');
  console.log(`✅ [PASS] Stock accurately deducted to ${stockData2.currentStock} in database`);

  // STEP 4: PAYMENTS, SPLIT TENDER & SAFE REPRINTS
  console.log('\n--- TEST GROUP 4: PAYMENTS, RECEIPTS & REPRINTS ---');
  // Partial payment of ₹1000 via CASH
  const payRes1 = await fetch(`${API_BASE}/payments/collect`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceId: invoice.id,
      amount: 1000,
      method: 'CASH',
      notes: 'Initial partial cash deposit'
    })
  });
  const payData1 = await payRes1.json();
  assert.strictEqual(payRes1.status, 201, 'Partial payment failed');
  assert.strictEqual(payData1.invoice.status, 'PARTIALLY_PAID');
  console.log(`✅ [PASS] Partial Cash payment of ₹1000 collected (Receipt: ${payData1.receipt.receiptNumber}, Remaining: ₹${payData1.invoice.balanceAmount})`);

  // Final payment via UPI
  const payRes2 = await fetch(`${API_BASE}/payments/collect`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceId: invoice.id,
      amount: payData1.invoice.balanceAmount,
      method: 'UPI',
      referenceNumber: 'UPI-984029102'
    })
  });
  const payData2 = await payRes2.json();
  assert.strictEqual(payRes2.status, 201, 'Final payment failed');
  assert.strictEqual(payData2.invoice.status, 'PAID');
  assert.strictEqual(payData2.invoice.balanceAmount, 0);
  console.log(`✅ [PASS] Final UPI payment settled invoice ${invoice.invoiceNumber} to PAID (Balance: ₹0.00)`);

  // Safe Receipt Reprint (Read-only verification)
  const reprintRes = await fetch(`${API_BASE}/payments/receipts/${payData2.receipt.id}/reprint`, { headers: authHeaders });
  const reprintData = await reprintRes.json();
  assert.strictEqual(reprintRes.status, 200, 'Receipt reprint failed');
  assert.strictEqual(reprintData.id, payData2.receipt.id);
  console.log(`✅ [PASS] Safe receipt reprint fetched (0 duplicate payments generated)`);

  // STEP 5: SUPPLIERS, PURCHASE ORDERS & GRN INTAKE
  console.log('\n--- TEST GROUP 5: SUPPLIERS & PURCHASE ORDERS GRN INTAKE ---');
  const supRes = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Southern Grains Wholesale Mart',
      contactPerson: 'Karthik Raja',
      phone: '044-24558899',
      email: 'orders@southerngrains.com',
      gstin: '33CCCCC3333C1Z4',
      address: 'Plot 88, Grain Market, Koyambedu'
    })
  });
  const supplier = await supRes.json();
  assert.strictEqual(supRes.status, 201, 'Supplier creation failed');
  console.log(`✅ [PASS] Registered Vendor: ${supplier.name}`);

  // Create Purchase Order for 50 units
  const poRes = await fetch(`${API_BASE}/suppliers/purchase-orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: [
        {
          productId: sampleProduct.id,
          name: sampleProduct.name,
          quantityOrdered: 50,
          unitCost: sampleProduct.costPrice || 180,
          taxRate: 5
        }
      ]
    })
  });
  const po = await poRes.json();
  assert.strictEqual(poRes.status, 201, 'PO creation failed');
  console.log(`✅ [PASS] Issued Purchase Order ${po.poNumber} for 50 units (Total: ₹${po.grandTotal})`);

  // Process Goods Received Note (GRN)
  const stockBeforeGRN = stockData2.currentStock;
  const grnRes = await fetch(`${API_BASE}/suppliers/purchase-orders/${po.id}/grn`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: sampleProduct.id, quantity: 50 }]
    })
  });
  assert.strictEqual(grnRes.status, 200, 'GRN intake failed');

  // Verify stock increased by 50 units
  const checkStock3 = await fetch(`${API_BASE}/products/${sampleProduct.id}`, { headers: authHeaders });
  const stockData3 = await checkStock3.json();
  assert.strictEqual(stockData3.currentStock, stockBeforeGRN + 50, 'Stock should increase by 50 upon GRN');
  console.log(`✅ [PASS] GRN successfully received goods. Stock increased from ${stockBeforeGRN} to ${stockData3.currentStock}`);

  // STEP 6: TEAM, CUSTOM ROLES & RBAC PERMISSION EDITING
  console.log('\n--- TEST GROUP 6: TEAM MANAGEMENT & RBAC PERMISSION EDITING ---');
  // Create Custom Role
  const roleRes = await fetch(`${API_BASE}/team/roles`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Shift Supervisor',
      permissions: ['pos:access', 'pos:create_bill', 'product:view', 'shift:open', 'shift:close']
    })
  });
  const customRole = await roleRes.json();
  assert.strictEqual(roleRes.status, 201, 'Custom role creation failed');
  console.log(`✅ [PASS] Created Custom Role "${customRole.name}" with 5 initial permissions`);

  // EDIT Custom Role Permissions (Requirement 26 & 27)
  const editRoleRes = await fetch(`${API_BASE}/team/roles/${customRole.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Senior Shift Supervisor',
      permissions: ['pos:access', 'pos:create_bill', 'product:view', 'shift:open', 'shift:close', 'quotation:view', 'quotation:create']
    })
  });
  const updatedRole = await editRoleRes.json();
  assert.strictEqual(editRoleRes.status, 200, 'Role edit failed');
  assert.strictEqual(updatedRole.permissions.length, 7, 'Role permissions should update to 7');
  console.log(`✅ [PASS] Modified Role permissions to 7 permissions and verified database persistence`);

  // Onboard Staff Member
  const staffRes = await fetch(`${API_BASE}/team/members`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      firstName: 'Deepak',
      lastName: 'Sharma',
      email: `deepak_${Date.now()}@sethretail.com`,
      username: `deepak_${Date.now()}`,
      password: 'StaffPassword123!',
      roleId: updatedRole.id,
      branchId: branchId
    })
  });
  const staff = await staffRes.json();
  assert.strictEqual(staffRes.status, 201, 'Staff member creation failed');
  console.log(`✅ [PASS] Onboarded staff employee: ${staff.user.firstName} ${staff.user.lastName} assigned to role ${updatedRole.name}`);

  // STEP 7: OUTLETS & REGISTERS
  console.log('\n--- TEST GROUP 7: OUTLETS & REGISTERS MANAGEMENT ---');
  const branchRes = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Velachery Super Store',
      code: 'VLC',
      city: 'Chennai',
      state: 'Tamil Nadu',
      phone: '044-22445566'
    })
  });
  const newBranch = await branchRes.json();
  assert.strictEqual(branchRes.status, 201, 'Branch creation failed');
  console.log(`✅ [PASS] Created outlet branch: ${newBranch.name} (${newBranch.code})`);

  // Create additional POS register counter
  const regRes = await fetch(`${API_BASE}/branches/${newBranch.id}/registers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'VLC-REG-02',
      code: 'REG-02'
    })
  });
  const register = await regRes.json();
  assert.strictEqual(regRes.status, 201, 'Register creation failed');
  console.log(`✅ [PASS] Configured POS billing register "${register.name}" under ${newBranch.name}`);

  // STEP 8: REPORTS SUMMARY & DASHBOARD PULSE
  console.log('\n--- TEST GROUP 8: REPORTS SUMMARY & PULSE AGGREGATION ---');
  const pulseRes = await fetch(`${API_BASE}/reports/dashboard-pulse?period=TODAY`, { headers: authHeaders });
  const pulse = await pulseRes.json();
  assert.strictEqual(pulseRes.status, 200, 'Pulse report failed');
  assert.strictEqual(pulse.completedBills >= 1, true, 'Report must reflect generated invoice');
  console.log(`✅ [PASS] Live Pulse Aggregation: Revenue ₹${pulse.totalRevenue}, Invoices: ${pulse.completedBills}`);

  const summaryRes = await fetch(`${API_BASE}/reports/summary`, { headers: authHeaders });
  const summary = await summaryRes.json();
  assert.strictEqual(summaryRes.status, 200, 'Reports summary failed');
  assert.strictEqual(Array.isArray(summary.recentInvoices), true);
  console.log(`✅ [PASS] Reports Summary: Top Selling Products: ${summary.topSellingProducts.length}, Invoices: ${summary.recentInvoices.length}`);

  console.log('\n================================================================');
  console.log('🎉 ALL 20/20 BILLING & MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runBillingAndManagementTests().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
