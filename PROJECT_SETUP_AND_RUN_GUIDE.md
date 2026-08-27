# AESCION Commerce — Project Setup and Run Guide

> **Document Version:** 2.0.0  
> **Target Audience:** Developers, DevOps Engineers, QA Engineers, System Administrators  
> **Operating System Focus:** Windows (PowerShell) / Cross-Platform  
> **Source Repository Path:** `C:\Users\esakk\.gemini\antigravity-ide\scratch\aescion_billing_app`

---

## 1. Project Overview

### Project Name
**AESCION Commerce** (Enterprise Multi-Tenant POS & Business Billing Platform)

### Description
AESCION Commerce is a production-grade point-of-sale (POS) and business operating system engineered for high-throughput retail, grocery supermarkets, restaurants, wholesale distribution, service/repair centers, and pharmacies. It combines fast barcode checkout, real-time multi-counter synchronization, cashier shift drawer audits, and authoritative Indian GST compliance.

### Main Purpose
To provide single-store and multi-outlet enterprises with an offline-resilient, role-governed, multi-tenant billing engine with automated ledger accounting, inventory decrementing, commercial quotation estimation, and payment receipts.

### Application Architecture
AESCION Commerce uses an **npm workspaces monorepo** architecture:
* **Frontend Application (`apps/desktop`)**: Single-Page Application (SPA) built with React 18, Vite, and TailwindCSS, packaged for web and Electron desktop execution.
* **Backend Application (`apps/api`)**: Modular enterprise REST & WebSocket API built on NestJS, Express, and Prisma ORM.
* **Shared Workspace Packages (`packages/*`)**: Shared TypeScript types, Zod validation schemas, business capability registry, RBAC definitions, and GST calculation algorithms.
* **Database Layer**: PostgreSQL 14+ database with schema relations, foreign key cascades, unique document indexes, and audit logging.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser / Desktop App                │
│             React 18 + Vite (Port 5173)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST & Socket.IO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 NestJS Backend API Gateway                  │
│             Node.js + Express (Port 4000)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma ORM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL 14+ Database                     │
│                  Port 5432 (Relational)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Category | Technology | Project Version | Purpose / Scope |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Declarative component UI engine |
| **DOM Renderer** | React DOM | `^18.3.1` | Browser DOM rendering |
| **Routing** | React Router DOM | `^6.23.1` | Client-side SPA navigation |
| **Frontend Bundler** | Vite | `^5.2.11` | Hot module replacement & production bundling |
| **Styling Engine** | TailwindCSS | `^3.4.3` | Utility-first CSS styling |
| **Icons Library** | Lucide React | `^0.379.0` | UI interface iconography |
| **Desktop Wrapper** | Electron | `^30.0.9` | Cross-platform desktop native runtime |
| **Backend Framework** | NestJS | `^10.3.8` | Modular enterprise server architecture |
| **HTTP Server** | Express | `^4.19.2` | Core HTTP request handling |
| **Database ORM** | Prisma | `^5.14.0` | Type-safe SQL modeling & migrations |
| **Database** | PostgreSQL | `14+` | Multi-tenant relational persistence |
| **Authentication** | Passport & JWT | `^10.2.0` | Access tokens (1d) & Refresh tokens (7d) |
| **Password Hashing** | bcryptjs | `^2.4.3` | Salted SHA-512 password hashing |
| **Realtime Engine** | Socket.IO | `^4.7.5` | Outlet/branch room live event dispatch |
| **API Documentation** | NestJS Swagger | `^7.3.1` | OpenAPI specification generation |
| **Validation** | Zod / class-validator | `^3.23.8` | Strict request payload validation |
| **Language** | TypeScript | `^5.4.5` | End-to-end type safety |

---

## 3. Required Software & Version Verification

### Prerequisites
1. **Node.js**: `v18.0.0` or higher (`v20.x` or `v24.x` recommended)
2. **npm**: `v9.0.0` or higher
3. **PostgreSQL**: `v14.0` or higher (running locally or accessible remotely)
4. **Git**: `v2.30+`
5. **Modern Web Browser**: Google Chrome (v115+), Microsoft Edge, or Mozilla Firefox

### PowerShell Verification Commands
Run the following commands in Windows PowerShell to verify your installed versions:

```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version

# Check PostgreSQL connection (if psql is in PATH)
psql --version
```

---

## 4. Project Folder Structure

```text
aescion_billing_app/
├── package.json                   # Root monorepo configuration & workspace definitions
├── tsconfig.base.json             # Shared compiler settings across all packages
├── .env.example                   # Master environment template with safe placeholders
├── README.md                      # General product overview & feature highlights
├── apps/
│   ├── api/                       # NestJS Backend Application (Port 4000)
│   │   ├── package.json           # Backend dependencies & npm scripts
│   │   ├── tsconfig.json          # NestJS TypeScript configuration
│   │   ├── .env                   # Local backend environment configuration
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Multi-tenant PostgreSQL database models
│   │   └── src/
│   │       ├── main.ts            # API bootstrap entrypoint & CORS configuration
│   │       ├── app.module.ts      # NestJS root application module
│   │       ├── auth/              # JWT authentication & session management
│   │       ├── onboarding/        # 9-Step business wizard & tenant initialization
│   │       ├── products/          # Catalog master & stock ledger tracking
│   │       ├── pos/               # Fast billing checkout engine
│   │       ├── cashier-shifts/    # Shift lifecycle & cash drawer reconciliation
│   │       ├── quotations/        # Pre-sales estimates & invoice conversion
│   │       ├── invoices/          # Financial invoices & void audit restore
│   │       ├── payments/          # Multi-tender collections & receipt reprints
│   │       ├── customers/         # Customer directory & 30/60/90 ageing
│   │       ├── suppliers/         # Vendor master, POs & GRN stock intake
│   │       ├── team/              # Staff onboarding & granular RBAC matrix
│   │       ├── branches/          # Store outlets & register terminals
│   │       ├── reports/           # Real-time aggregated business pulse
│   │       ├── organizations/     # Legal profile & tax configuration
│   │       ├── common/            # Guards, decorators, filters & audit service
│   │       └── realtime/          # Socket.IO gateway & branch event rooms
│   └── desktop/                   # React 18 + Vite Desktop Web Application (Port 5173)
│       ├── package.json           # Desktop frontend dependencies & scripts
│       ├── vite.config.ts         # Vite build configuration & proxy settings
│       ├── tailwind.config.js     # Tailwind design system tokens & colors
│       ├── index.html             # HTML5 entrypoint
│       ├── .env                   # Frontend environment configuration
│       └── src/
│           ├── main.tsx           # React DOM initialization & router mount
│           ├── app/
│           │   ├── App.tsx        # Authentication shell & onboarding switcher
│           │   └── routes.tsx     # Route mapping for all operational screens
│           ├── components/        # Shell layout, sidebar, header & modals
│           ├── features/          # Feature views (POS, Billing, Management)
│           ├── services/          # API client, WebSocket & hardware adapters
│           └── store/             # React AuthContext state provider
├── packages/                      # Monorepo Shared Libraries
│   ├── shared-types/              # TypeScript interfaces, DTOs & enums
│   ├── shared-utils/              # GST tax calculations & currency formatting
│   ├── capability-config/         # 6 Industry packs & RBAC permission matrix
│   └── validation/                # Zod schemas for forms and API requests
└── test_*.mjs                     # Automated End-to-End Verification Test Suites
```

---

## 5. Dependency Installation & Build Order

The repository uses **npm workspaces**. Dependencies must be installed from the project root.

### Step 1: Install Root and Workspace Dependencies
Open PowerShell in the project root directory:

```powershell
# Navigate to the repository root
cd C:\Users\esakk\.gemini\antigravity-ide\scratch\aescion_billing_app

# Install all workspace dependencies
npm install
```

### Step 2: Build Shared Packages First
The application workspaces (`apps/api` and `apps/desktop`) depend on the compiled output of the shared packages in `packages/*`.

```powershell
# Build shared types, utilities, capabilities, and validation packages
npm run build:packages
```

---

## 6. Environment Configuration

### Overview of Environment Files

| Environment File | Location | Purpose |
| :--- | :--- | :--- |
| **Backend `.env`** | `apps/api/.env` | Database connection, JWT secrets, server ports |
| **Frontend `.env`** | `apps/desktop/.env` | Backend API base URL for browser fetch requests |
| **Root `.env.example`** | `.env.example` | Reference template for all environment variables |

---

### Backend Environment Configuration (`apps/api/.env`)
Create or edit `apps/api/.env` with safe development values:

```env
# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:Esakki%402005@localhost:5432/aescion_commerce?schema=public"

# HTTP API Server Port
PORT=4000

# API Global Prefix
API_PREFIX=/api/v1

# JWT Secret Keys (Replace with strong random strings in production)
JWT_SECRET="aescion_super_secure_enterprise_jwt_secret_key_2026_production"
JWT_EXPIRATION="1d"
JWT_REFRESH_SECRET="aescion_refresh_token_super_secret_key_2026_production"
JWT_REFRESH_EXPIRATION="7d"

# WebSocket Real-Time Gateway Port
SOCKET_PORT=4000

# Environment Mode
NODE_ENV=development
```

#### Explanation of Backend Variables:
* `DATABASE_URL`: PostgreSQL connection string including user, encoded password, host, port, database name, and schema.
* `PORT`: The TCP port on which NestJS listens (Default: `4000`).
* `API_PREFIX`: Global route prefix applied to all controller endpoints (Default: `/api/v1`).
* `JWT_SECRET`: Secret key used to sign and verify short-lived access tokens.
* `JWT_REFRESH_SECRET`: Secret key used to issue and refresh session tokens.
* `SOCKET_PORT`: Port assigned for real-time WebSocket communication.

---

### Frontend Environment Configuration (`apps/desktop/.env`)
Create or edit `apps/desktop/.env`:

```env
# URL pointing to the NestJS API Base
VITE_API_URL=http://localhost:4000/api/v1
```

#### Explanation of Frontend Variables:
* `VITE_API_URL`: The absolute HTTP URL consumed by `ApiClient` (`apps/desktop/src/services/api.ts`) for all network requests.

---

## 7. Database Setup & Prisma Operations

### Step 1: Ensure PostgreSQL Service is Running
Make sure your local PostgreSQL service is active. In PowerShell:

```powershell
# Verify PostgreSQL service status in Windows
Get-Service -Name postgresql*
```

### Step 2: Create the Database
If the database `aescion_commerce` does not already exist, create it using `psql` or pgAdmin:

```powershell
# Create database via psql (replace username if different)
psql -U postgres -c "CREATE DATABASE aescion_commerce;"
```

### Step 3: Generate Prisma Client
Generates the type-safe Prisma Client from the schema file:

```powershell
# From project root
npm run prisma:generate

# Or directly from apps/api
cd apps/api
npx prisma generate
```

### Step 4: Push Schema to Database
Synchronize the PostgreSQL database structure with `schema.prisma`:

```powershell
# From apps/api directory
cd apps/api
npx prisma db push
```

> [!TIP]
> `prisma db push` safely creates all tables, columns, constraints, and indexes without dropping existing test data.

### Step 5: Open Prisma Studio (Database GUI)
To inspect tables and view saved records visually in your browser:

```powershell
cd apps/api
npx prisma studio
# Opens Prisma Studio at http://localhost:5555
```

---

## 8. Starting the Application

Running AESCION Commerce locally requires **two separate PowerShell terminals**.

### Terminal 1: Start the Backend API Server

```powershell
# Navigate to the API application
cd C:\Users\esakk\.gemini\antigravity-ide\scratch\aescion_billing_app\apps\api

# Start the NestJS server in watch/development mode
npm run start:dev
```

#### Expected Terminal 1 Output:
```text
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [RoutesResolver] AuthController {/api/v1/auth}
[Nest] LOG [RoutesResolver] ProductController {/api/v1/products}
[Nest] LOG [RoutesResolver] InvoiceController {/api/v1/invoices}
[Nest] LOG [RoutesResolver] QuotationController {/api/v1/quotations}
[Nest] LOG [RoutesResolver] ShiftController {/api/v1/cashier-shifts}
[Nest] LOG [AESCION-API-BOOTSTRAP] AESCION Commerce Backend Engine is LIVE on port 4000
[Nest] LOG [AESCION-API-BOOTSTRAP] API Base: http://localhost:4000/api/v1
```

---

### Terminal 2: Start the Desktop Web Application

```powershell
# Navigate to the Desktop application
cd C:\Users\esakk\.gemini\antigravity-ide\scratch\aescion_billing_app\apps\desktop

# Start the Vite development server
npm run dev
```

#### Expected Terminal 2 Output:
```text
  VITE v5.2.11  ready in 420 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 9. Desktop Browser Testing

### Accessing the Web Application
* **Frontend Application**: [http://localhost:5173](http://localhost:5173)
* **Backend API Base**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

### Opening Browser Developer Tools
1. Open Google Chrome or Microsoft Edge and go to `http://localhost:5173`.
2. Press `F12` (or `Ctrl + Shift + I`).
3. Switch to the **Console** tab to verify that zero blocking JavaScript errors exist.
4. Switch to the **Network** tab to observe HTTP status codes for outgoing API requests.

### HTTP Status Code Reference
* `200 OK` / `201 Created`: Successful request and database persistence.
* `400 Bad Request`: Payload validation error (e.g., missing mandatory field).
* `401 Unauthorized`: Token missing or expired.
* `403 Forbidden`: User role lacks the required granular permission.
* `404 Not Found`: Route or requested entity does not exist.
* `409 Conflict`: Business safety block (e.g., duplicate quotation conversion).
* `500 Server Error`: Unhandled server exception.

---

### Comprehensive Desktop Testing Checklist

| Module | Verification Steps | Expected Result |
| :--- | :--- | :--- |
| **Landing & Onboarding** | Click "Get Started", complete 9-step wizard with Supermarket type | Organization, Branch, Register, and Admin user created |
| **Authentication** | Sign in with registered email and password | JWT issued, stored in `localStorage`, redirected to Dashboard |
| **Business Pulse** | Check revenue card and collections breakdown | Live figures aggregated directly from PostgreSQL database |
| **Products & Stock** | Search catalog, view stock balance, check unit pricing | Products load with correct stock quantities |
| **Fast Billing POS** | Add item to cart, choose CASH tender, complete bill | Invoice created, stock reduced, thermal receipt displayed |
| **Cashier Shifts** | Open shift with float, check active status, close and reconcile | Float tracked, cash sales computed, variance logged |
| **Quotations** | Create new quotation, edit quantity, mark accepted, click Convert | Quotation converted to Invoice without double-billing |
| **Invoices** | Filter by PAID / ISSUED, view invoice detail, click Void | Void cancels bill and restores items back to inventory |
| **Payments & Receipts**| Collect payment on unpaid invoice, reprint receipt | Receipt reprinted safely without duplicate transactions |
| **Customers & Credit** | Add customer, set credit limit, view 30/60/90 ageing | Customer ledger records updated |
| **Suppliers & POs** | Issue Purchase Order, click "Receive (GRN)" | Inventory stock balance immediately increases |
| **Team & Roles** | Create custom role, edit permission toggles, add employee | Role permissions saved and applied dynamically |
| **Outlets & Branches** | Create new store branch, add register counter, switch branch | Active context and data scoped to selected branch |

---

## 10. Mobile Responsive Testing (Chrome DevTools)

To verify mobile responsiveness on your desktop browser:

1. Open `http://localhost:5173` in Google Chrome or Microsoft Edge.
2. Press `F12` to open DevTools.
3. Click the **Toggle Device Toolbar** icon (or press `Ctrl + Shift + M`).
4. Select different viewport presets from the top dropdown menu.

```
┌──────────────────────────────────────────────────────────┐
│ [Dimensions: Responsive ▾] [390 x 844] [100% ▾]          │
└──────────────────────────────────────────────────────────┘
```

### Viewport Testing Matrix

| Preset Device | Viewport Width | Features to Verify |
| :--- | :--- | :--- |
| **iPhone SE / Small Mobile** | `320px – 375px` | Collapsible sidebar, readable font size, no horizontal scroll |
| **iPhone 12 / 14 / 15** | `390px – 400px` | Cart sheet drawer, touch-friendly buttons (min 44px height) |
| **iPhone 14 Pro Max / Large** | `428px – 430px` | Modal dialogs fit viewport, tables scroll horizontally inside container |
| **iPad Mini / Tablet** | `768px – 820px` | 2-column card layouts, POS product grid adapts cleanly |
| **Desktop / Laptop** | `1280px+` | Full persistent sidebar, multi-column operational tables |

---

## 11. Testing on a Real Mobile Phone (Same Wi-Fi)

To test the application on a physical smartphone connected to the same local wireless network:

### Step 1: Find Your Computer's Local IPv4 Address
In PowerShell, run:

```powershell
ipconfig
```
Look for `IPv4 Address` under your active Wi-Fi adapter (e.g., `192.168.1.15`).

### Step 2: Expose Vite Dev Server to the Network
Stop the frontend terminal (`Ctrl + C`) and restart Vite with the `--host` flag:

```powershell
cd apps/desktop
npm run dev -- --host
```

Vite will display:
```text
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/
```

### Step 3: Configure Frontend API URL for LAN Access
> `Configuration Required`

Update `apps/desktop/.env` so mobile devices send requests to your PC's IP instead of `localhost`:

```env
# Replace 192.168.1.15 with your actual PC IPv4 address
VITE_API_URL=http://192.168.1.15:4000/api/v1
```

### Step 4: Open on Mobile Browser
Connect your smartphone to the same Wi-Fi network, open Chrome or Safari, and navigate to:
```text
http://192.168.1.15:5173
```

> [!IMPORTANT]
> When testing is complete, revert `apps/desktop/.env` back to `VITE_API_URL=http://localhost:4000/api/v1`.

---

## 12. Login and Application Testing

### Implemented Authentication Workflow
* **Method**: Email and Password authentication via `/api/v1/auth/login`.
* **Token Storage**: `localStorage.setItem('aescion_token', token)` and `aescion_refresh_token`.
* **Payload Verification**: JWT contains `userId`, `email`, `organizationId`, `branchId`, `roleType`, and permission claims.
* **Auto-Login via Session Refresh**: `/api/v1/auth/me` verifies active token and auto-authenticates returning users on page reload.

---

## 13. Process Management & Stopping Applications

### Stop Applications Gracefully
In the respective terminal window, press:
```text
Ctrl + C
```
Type `Y` and press `Enter` if prompted.

### Identify & Terminate Port Collisions (PowerShell)
If port 4000 or 5173 is already held by a lingering background process:

```powershell
# Check which process is listening on Port 4000
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess

# Terminate all lingering Node.js processes safely
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 14. Production Build Verification

To compile all shared packages, backend NestJS API, and frontend desktop bundle for production:

```powershell
# From project root
npm run build:all
```

### Build Artifact Locations
* **Shared Packages**: `packages/*/dist/`
* **Backend API**: `apps/api/dist/` (Entrypoint: `apps/api/dist/main.js`)
* **Frontend Desktop**: `apps/desktop/dist/` (Static assets: `apps/desktop/dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`)

---

## 15. Deployment Guide

### Backend Deployment (Render / Railway / Cloud VMs)
1. **Root Directory**: `apps/api`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `node dist/main`
4. **Environment Variables**:
   * `DATABASE_URL`: Hosted PostgreSQL connection string (Supabase, Neon, AWS RDS).
   * `PORT`: `4000` (or platform default `$PORT`).
   * `JWT_SECRET`: Production 64-character random string.
   * `JWT_REFRESH_SECRET`: Production 64-character random string.
   * `NODE_ENV`: `production`

### Frontend Deployment (Vercel / Netlify / Cloudflare Pages)
1. **Root Directory**: `apps/desktop`
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables**:
   * `VITE_API_URL`: Production backend URL (e.g., `https://api.yourdomain.com/api/v1`).

---

## 16. Common Troubleshooting Guide

| Issue / Error | Likely Cause | Inspection Target | Recommended Solution |
| :--- | :--- | :--- | :--- |
| `EADDRINUSE :::4000` | Port 4000 is occupied by a running background server | Process table | Run `Get-Process -Name node \| Stop-Process -Force` |
| `404 Cannot GET /api/v1/...` | Route or method mismatch | Controller decorators | Ensure route prefix in controller matches frontend API path |
| `401 Unauthorized` | Invalid or expired JWT token | `localStorage` | Log out and sign in again to obtain a fresh token |
| `403 Forbidden` | Insufficient role permissions | `roles.permissions` | Edit role permissions in **Team & Roles** screen |
| `Database connection error` | PostgreSQL service stopped or wrong credentials | `apps/api/.env` | Verify `DATABASE_URL` and ensure PostgreSQL service is active |
| `PrismaClientInitializationError` | Prisma Client not generated | `node_modules/@prisma` | Run `npm run prisma:generate` from project root |
| `CORS Error in Browser Console` | Frontend origin not permitted | `apps/api/src/main.ts` | Verify `cors` origin includes `http://localhost:5173` |
| `Blank White Screen on Load` | Unhandled runtime error | Browser Console (F12) | Inspect console error stack trace and ensure all packages are built |

---

## 17. Quick Start Guide

Execute the following commands in order for a clean start:

```powershell
# 1. Navigate to repository root
cd C:\Users\esakk\.gemini\antigravity-ide\scratch\aescion_billing_app

# 2. Install dependencies & build packages
npm install
npm run build:packages

# 3. Push database schema
npm run prisma:generate
npm run prisma:push

# 4. Terminal 1: Start Backend API
cd apps/api
npm run start:dev

# 5. Terminal 2: Start Desktop Frontend
cd apps/desktop
npm run dev
```

* **Frontend Application**: `http://localhost:5173`
* **Backend API Base**: `http://localhost:4000/api/v1`
* **Prisma Database Studio**: `http://localhost:5555`
