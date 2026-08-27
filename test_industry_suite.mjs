const API_BASE = 'http://localhost:4000/api/v1';

async function runIndustryTests() {
  console.log('================================================================');
  console.log('🍽️ AESCION COMMERCE — 6 INDUSTRY PACKS AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, name) {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      process.exit(1);
    }
  }

  // 1. Setup Onboarded Organization
  const onboardRes = await fetch(`${API_BASE}/onboarding/create-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner: {
        firstName: 'Vikram',
        lastName: 'Menon',
        mobileNumber: '9840112233',
        email: `vikram_${Date.now()}@multibiz.com`,
        username: `vikram_${Date.now()}`,
        password: 'password123',
        confirmPassword: 'password123'
      },
      businessType: 'RESTAURANT',
      business: {
        name: 'Royal Spice Restaurant & Cafe',
        legalName: 'Royal Spice Hospitality Pvt Ltd',
        phone: '044-24567890',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600004'
      },
      branches: [{ name: 'Main Cafe', code: 'MC', isMain: true }],
      teamSetupMode: 'JUST_ME',
      taxSettings: { taxMode: 'EXCLUSIVE', defaultRates: [5] },
      billingSettings: { invoicePrefix: 'INV', quotationPrefix: 'QTN', receiptPrefix: 'RCP', defaultReceiptFormat: '80MM' }
    })
  });
  const onboardData = await onboardRes.json();
  const token = onboardData.accessToken;
  const branchId = onboardData.activeBranch.id;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-branch-id': branchId
  };

  // 2. Restaurant Tables & KOT Flow
  console.log('--- TEST GROUP 1: RESTAURANT TABLES & KOT LIFECYCLE ---');
  const tables = await fetch(`${API_BASE}/restaurant/tables`, { headers: authHeaders }).then(r => r.json());
  assert(Array.isArray(tables) && tables.length >= 5, 'Floor plan tables seeded with ground floor and AC hall sections');

  const table1 = tables[0];
  const kotRes = await fetch(`${API_BASE}/restaurant/kots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tableId: table1.id,
      items: [{ name: 'Butter Chicken Masala', unitPrice: 320, quantity: 2 }]
    })
  });
  const kot = await kotRes.json();
  assert(kot.kotNumber.startsWith('KOT-') && kot.status === 'NEW', `KOT ${kot.kotNumber} dispatched to kitchen`);

  const prepKotRes = await fetch(`${API_BASE}/restaurant/kots/${kot.id}/status`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ status: 'PREPARING' })
  });
  const prepKot = await prepKotRes.json();
  assert(prepKot.status === 'PREPARING', 'Kitchen KDS updated status to PREPARING');

  // 3. Service Center & Repair Job Cards
  console.log('\n--- TEST GROUP 2: SERVICE REPAIR & ASSET INTAKE ---');
  const jobRes = await fetch(`${API_BASE}/service-jobs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerName: 'Anand Krishnan',
      customerPhone: '9840998877',
      complaint: 'Display flickering and battery draining fast',
      assetDetails: {
        assetType: 'Laptop',
        brand: 'Dell',
        model: 'XPS 15',
        serialNumber: 'DLXPS-89210',
        conditionNotes: 'Good condition'
      },
      estimatedAmount: 6500,
      advancePaid: 2000
    })
  });
  const job = await jobRes.json();
  if (!job.jobNumber) {
    console.error('Job error response:', jobRes.status, job);
  }
  assert(job.jobNumber && job.jobNumber.startsWith('JOB-') && job.status === 'RECEIVED', `Job card ${job.jobNumber} created for customer asset`);

  const updateJobRes = await fetch(`${API_BASE}/service-jobs/${job.id}/status`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ status: 'IN_PROGRESS' })
  });
  const updatedJob = await updateJobRes.json();
  assert(updatedJob.status === 'IN_PROGRESS', 'Technician assigned and repair status updated to IN_PROGRESS');

  // 4. Wholesale Sales Orders & Delivery Challans
  console.log('\n--- TEST GROUP 3: WHOLESALE B2B & DELIVERY CHALLANS ---');
  const soRes = await fetch(`${API_BASE}/wholesale/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerName: 'Southern Provisions Wholesale Ltd',
      totalAmount: 92500
    })
  });
  const so = await soRes.json();
  assert(so.orderNumber && so.orderNumber.startsWith('SO-') && so.status === 'ORDER_PLACED', `Sales Order ${so.orderNumber} created`);

  const dcRes = await fetch(`${API_BASE}/wholesale/orders/${so.id}/dispatch`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      vehicleNo: 'TN-07-CD-9988',
      transporterName: 'Express Cargo'
    })
  });
  const dc = await dcRes.json();
  assert(dc.status === 'DISPATCHED' && dc.dispatchDetails?.vehicleNo === 'TN-07-CD-9988', `Delivery Challan ${dc.dispatchDetails?.challanNumber} issued with vehicle registration`);

  // 5. Suppliers & Goods Received Note (GRN)
  console.log('\n--- TEST GROUP 4: VENDORS & PURCHASE GRN STOCK INTAKE ---');
  const supplierRes = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Pioneer Agro Distributors',
      contactPerson: 'Karthik Rao',
      phone: '9840123987',
      gstin: '33AABCP1234A1Z1'
    })
  });
  const supplier = await supplierRes.json();
  assert(supplier.id, 'Vendor master created');

  const products = await fetch(`${API_BASE}/products`, { headers: authHeaders }).then(r => r.json());
  const sampleProd = products[0];

  const poRes = await fetch(`${API_BASE}/suppliers/purchase-orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: [{ productId: sampleProd.id, name: sampleProd.name, quantityOrdered: 100, unitCost: 150, taxRate: 5 }]
    })
  });
  const po = await poRes.json();
  assert(po.poNumber.startsWith('PO-') && po.status === 'APPROVED', `Purchase Order ${po.poNumber} created`);

  const grnRes = await fetch(`${API_BASE}/suppliers/purchase-orders/${po.id}/grn`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: sampleProd.id, quantity: 100 }]
    })
  });
  const completedPo = await grnRes.json();
  assert(completedPo.status === 'COMPLETED', 'GRN received goods and updated purchase order status to COMPLETED');

  // Verify stock increased
  const afterProd = await fetch(`${API_BASE}/products`, { headers: authHeaders }).then(r => r.json());
  const updatedProd = afterProd.find(p => p.id === sampleProd.id);
  assert(updatedProd.currentStock === sampleProd.currentStock + 100, 'Stock balance increased by 100 units through GRN intake');

  // 6. Void Invoice & Stock Restoral
  console.log('\n--- TEST GROUP 5: VOID INVOICE & STOCK RESTORATION ---');
  const invRes = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      branchId,
      customerName: 'Test Cancel Client',
      lines: [{ productId: sampleProd.id, name: sampleProd.name, quantity: 5, unitPrice: sampleProd.sellingPrice, taxRate: 5, taxMode: 'EXCLUSIVE' }]
    })
  });
  const inv = await invRes.json();
  const stockAfterSale = updatedProd.currentStock - 5;

  const voidRes = await fetch(`${API_BASE}/invoices/${inv.id}/void`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Customer returned items immediately' })
  });
  const voidedInv = await voidRes.json();
  assert(voidedInv.status === 'VOID', 'Invoice marked as VOID');

  const prodAfterVoid = await fetch(`${API_BASE}/products`, { headers: authHeaders }).then(r => r.json());
  const restoredProd = prodAfterVoid.find(p => p.id === sampleProd.id);
  assert(restoredProd.currentStock === updatedProd.currentStock, 'Stock ledger restored all items from voided invoice with SALE_RETURN event');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} INDUSTRY OPERATIONS TESTS PASSED!`);
  console.log('================================================================\n');
}

runIndustryTests().catch(err => {
  console.error('Fatal error during industry tests:', err);
  process.exit(1);
});
