# AESCION Commerce — Production Enterprise Billing & POS Platform

> **AESCION Commerce** is a production-grade multi-tenant, multi-outlet Retail, Supermarket, Wholesale, Restaurant, Service/Repair, and Pharmacy point-of-sale (POS) and business billing engine built in strict compliance with the **AESCION Commerce Desktop & Mobile SOP v2.0**.

---

## 🏗️ Architecture & Monorepo Structure

The project is structured as an npm workspaces monorepo:

```text
aescion_billing_app/
├── apps/
│   ├── api/          # NestJS Backend, Prisma ORM, Socket.IO Realtime Engine (Port 4000)
│   ├── desktop/      # React 18, Vite, Electron, TypeScript, TailwindCSS (Port 5173)
│   └── mobile/       # React Native Expo App, Expo Router, SecureStore, SQLite Offline Engine
├── packages/
│   ├── capability-config/  # Centralized Business Capability & Granular RBAC Matrix
│   ├── shared-types/       # TypeScript Data Models, DTOs, Enums
│   └── shared-utils/       # Authoritative GST Tax Engines, Currency Formatter, Document Numbering
├── apps/api/prisma/
│   ├── schema.prisma       # Complete PostgreSQL Multi-Tenant Database Schema
│   └── seed.ts             # Default System Roles & Capabilities Seeder
└── test_*.mjs              # End-to-End Automated Verification Suites
```

---

## ⚡ Core Operational Modules

### 1. Operations & Fast Billing
* **Dashboard / Business Pulse**: Live real-time KPIs, revenue aggregation, tender collections breakdown, low stock alerts, and industry metrics directly from PostgreSQL.
* **Fast Billing (POS)**: Barcode lookup, item search, quantity shortcuts, hold & recall bills, customer tender with multi-mode payments (Cash, UPI, Card, Customer Credit, Split Tender), and thermal receipt printing.
* **Cashier Shifts**: Authenticated shift lifecycle (`/cashier-shifts/open`, `/cashier-shifts/close`, `/cashier-shifts/active`), live expected cash calculation from completed payments, drawer float management, and cash variance audit.
* **Products & Stock Ledger**: Multi-unit inventory, immutable `StockLedger` audit trail (`SALE`, `PURCHASE_RECEIPT`, `SALE_RETURN`, `STOCK_ADJUSTMENT`, `TRANSFER`), batch & expiry tracking.

### 2. Billing & Documents
* **Quotations & Estimates**: Pre-sales commercial estimates, multi-line builder, customer selection, draft/sent/accepted states, and **safe single-conversion to official invoices** with backend idempotency and zero inventory deduction prior to conversion.
* **Invoices & Sales Bills**: Authoritative GST tax calculation (0%, 5%, 12%, 18%, 28% with CGST/SGST/IGST breakdown), partial/full payment tracking, voiding with safe inventory restoration.
* **Payments & Receipts**: Multi-tender payment collection, dedicated receipts ledger, thermal 80mm/58mm format, and safe reprint without creating duplicate financial transactions.

### 3. Management & Control
* **Customers & Credit Control**: Customer directory, GSTIN tracking, configurable credit limits, customer ledger audit trail, and 30/60/90-day aging breakdown.
* **Suppliers & Purchase Management**: Vendor master, Purchase Orders (PO) issuance, and Goods Received Note (GRN) goods intake that automatically updates inventory balances.
* **Team & Access (RBAC)**: Staff onboarding, outlet assignment, role mapping, active/deactivated status toggle, and custom role creation.
* **Roles & Permissions Matrix**: Grouped functional permission toggles (Dashboard, POS, Products, Inventory, Quotations, Invoices, Payments, Customers, Suppliers, Outlets, Settings, Industry modules) with live database persistence.
* **Outlets & Branches**: Multi-branch support, POS register counter management, and seamless active branch context switching.
* **Business Profile & Branding**: Company trade name validation, dynamic company logo upload/replacement/removal, initials avatar fallback, and instant reactivity across top navigation, sidebar, and dashboard.

### 4. Six Industry Capability Packs
1. **Supermarket / Grocery**: Weighted barcode decoding, multiple checkout registers, batch/expiry alerts, cashier float reconciliation.
2. **Retail Shop**: Item variant pricing, customer loyalty points, instant POS checkout, and quotations.
3. **Wholesale & Distribution**: Bulk sales orders, stock allocation, and dispatch delivery challans.
4. **Restaurant & Cafe**: Table dining floor grid, Kitchen Order Ticket (KOT) dispatch with delta-item tracking, and Kitchen Display Screen (KDS).
5. **Service & Repair**: Customer asset intake, repair job cards, technician assignment, parts/labor estimates, and status updates.
6. **Pharmacy**: Medicine master, batch & expiry control, and **strict automated blocking of expired medicines from billing (403 Forbidden)**.

---

## 🛠️ Environment Configuration

### Backend API (`apps/api/.env`)
```env
PORT=4000
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@localhost:5432/aescion_commerce?schema=public"
JWT_SECRET="replace_with_a_secure_jwt_secret"
JWT_REFRESH_SECRET="replace_with_a_secure_refresh_secret"
JWT_EXPIRATION="1d"
JWT_REFRESH_EXPIRATION="7d"
CORS_ORIGIN="http://localhost:5173"
```

### Frontend Desktop (`apps/desktop/.env`)
```env
VITE_API_URL=http://localhost:4000/api/v1
```

---

## 🚀 Running the Application

### 1. Start Backend API Server
```powershell
cd apps/api
npm run start
# Server listens on http://localhost:4000/api/v1
```

### 2. Start Desktop Web / Electron App
```powershell
cd apps/desktop
npm run dev
# Vite dev server running on http://localhost:5173
```

### 3. Start Native Mobile App (Expo Router)
```powershell
cd apps/mobile
npm run start
# Metro bundler launches for Android / iOS / Web
```

---

## 🧪 Automated Verification Test Suites

To execute the complete regression test suite:

```powershell
# 1. Native Mobile & Offline SQLite Suite
node test_mobile_and_offline_suite.mjs

# 2. Branding & Tenant Isolation Suite
node test_branding_and_isolation_suite.mjs

# 3. Billing & Management Operations Suite
node test_billing_and_management_suite.mjs

# 4. Cashier Shifts & Drawer Reconciliation Suite
node test_shifts_endpoint.mjs

# 5. Six Industry Packs Operational Suite
node test_industry_suite.mjs

# 6. Master E2E Business Lifecycle Suite
node test_e2e_suite.mjs
```
