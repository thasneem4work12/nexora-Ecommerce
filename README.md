# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 0.9.0 (Phase 4 Complete — Secure Checkout, Order Processing, Payment Integration & Stock Reservation)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript Strict Mode, Tailwind CSS, Prisma ORM 6, and PostgreSQL 16

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce SaaS platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 4**, we transformed the catalog into a transactional commerce engine with authoritative pricing, concurrency-safe stock reservation, payment gateway integration, and comprehensive order lifecycle management:

- **Authoritative Database Models:** Implemented `Order`, `OrderItem`, `Address`, `Payment`, `PaymentEvent`, `StockReservation`, and `Shipment` with strict referential integrity, indexes, and immutable snapshots.
- **Authoritative Server-Side Pricing:** All currency stored strictly in integer minor units (USD cents). Client-submitted prices and totals are never trusted; the server recomputes subtotal, tiered shipping, and destination taxes.
- **Concurrency-Safe Stock Reservations:**
  - PostgreSQL row locking (`FOR UPDATE`) serializes simultaneous checkout attempts.
  - Active reservation prevents race conditions and overselling.
  - Sweeper service automatically releases expired reservations (`PENDING` -> `EXPIRED`) and atomically restores variant stock.
- **Sri Lankan & International Payment Architecture:**
  - **PayHere Gateway:** Sri Lanka CBSL-approved payment provider supporting LKR and international currencies (USD, GBP, EUR) with MD5 signature validation.
  - **Mock Sandbox Provider:** Isolated sandbox provider with HMAC-SHA256 signature verification for zero-cost automated testing, strictly disabled in production.
  - **Webhook Idempotency:** Secure webhook processing with event deduplication (`PaymentEvent`) preventing replay attacks or duplicate captures.
- **Client Checkout & Order History:**
  - Luxury Editorial Checkout (`/checkout`): Multi-tier delivery selection (Standard, Express, White Glove), separate shipping/billing addresses, live summary.
  - Confirmation Portal (`/checkout/success`): Clear order reference (`NXR-YYYY-XXXXXX`), financial breakdown, and printable invoice.
  - Client Order History (`/account/orders` and `/account/orders/[id]`): Filterable order cards, line item snapshots, live order timeline, and self-service cancellation for pending commissions.
- **Executive Order Fulfillment Suite (`/admin/orders`):**
  - Atelier Order Desk (`/admin/orders`): Real-time financial metrics (Gross Volume, Commission Count, Pending Payments, In Dispatch), filter by status/payment/search.
  - Detailed Order Inspector (`/admin/orders/[id]`): Client details, billing/shipping addresses, itemized breakdown, and audit ledger.
  - Courier Dispatch Modal: Record carrier, tracking number, and dispatch notes with automatic `SHIPPED` status progression.
  - Financial Safety Rules: Unpaid orders cannot be fraudulently forced to paid without authoritative gateway webhook confirmation.

---

### Previous Milestone Deliverables (Phases 1–3)

- **Role-Based Access Control (RBAC):** Strict 5-tier role hierarchy (`CUSTOMER`, `STAFF`, `MANAGER`, `OWNER`, `SUPERADMIN`) verified directly against PostgreSQL.
- **Product & Variant Catalog:** Multi-image gallery, category associations, and live stock auditing.
- **Auditable Inventory Ledger:** Append-only ledger recording all stock changes with administrator attribution.

---

## 2. Technology Stack

- **Framework:** Next.js 15.2 (App Router, Server Components, Route Handlers, Dynamic Metadata)
- **Language:** TypeScript 5.8 (Strict Mode enabled across client and server)
- **Styling:** Tailwind CSS 3.4 with custom Editorial Luxury design tokens, Lucide Icons, and CVA
- **Database & ORM:** PostgreSQL 16 Alpine running in Docker, Prisma ORM 6
- **Authentication & RBAC:** Better Auth with PostgreSQL session verification and custom RBAC guard layer (`src/lib/admin-auth.ts`)
- **Validation:** Zod schemas for products, variants, images, and inventory adjustments
- **Testing:** Vitest 3 (unit & integration tests) and Playwright 1.50 (E2E browser tests)

---

## 3. RBAC Permission Matrix

| Permission | CUSTOMER | STAFF | MANAGER | OWNER | SUPERADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `VIEW_ADMIN` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_PRODUCTS` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `CREATE_PRODUCT` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `EDIT_PRODUCT` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `PUBLISH_PRODUCT` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `ARCHIVE_PRODUCT` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `MANAGE_CATEGORIES` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `MANAGE_VARIANTS` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `VIEW_INVENTORY` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ADJUST_INVENTORY` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_AUDIT_LOGS` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `MANAGE_SETTINGS` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 4. Local Setup Instructions (Windows PowerShell)

### Prerequisites
- **Node.js:** v20+ or v22+ LTS installed (`node -v`)
- **Docker Desktop:** Installed and running (for containerized PostgreSQL)

### Step 1: Clone and Install
```powershell
cd c:\Users\DELL\Documents\antigravity\resilient-einstein
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` if not already present:
```powershell
Copy-Item .env.example .env
```
Ensure `.env` matches your database configuration:
```env
DATABASE_URL="postgresql://nexora_user:nexora_secret_2026@localhost:5432/nexora_db?schema=public"
BETTER_AUTH_SECRET="nexora-dev-secret-key-32-chars-long!!"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3: Start PostgreSQL & Apply Migrations
```powershell
# Start containerized PostgreSQL
npm run db:up

# Run Prisma migrations
npm run db:migrate

# Seed realistic luxury demonstration items
npm run db:seed
```

### Step 4: Bootstrap Store Director (Owner)
Execute the secure owner bootstrap CLI:
```powershell
npm run admin:bootstrap
```
*Default bootstrapped owner credentials:*
- **Email:** `owner@nexoracommerce.com`
- **Password:** `NexoraOwner2026!`
- **Role:** `OWNER`

### Step 5: Run Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the storefront, or sign in and access [http://localhost:3000/admin](http://localhost:3000/admin) for the Atelier Administration Dashboard.

---

## 5. Automated Testing

### Unit & Integration Tests (Vitest)
Executes 99 automated tests across 13 test files verifying RBAC matrix enforcement, product lifecycle, duplicate SKU prevention, category deletion guards, audited inventory adjustments, concurrency-safe stock reservations, authoritative order pricing, and webhook signature verification:
```powershell
npm run test
```

### End-to-End Browser Tests (Playwright)
Executes 13 full browser tests across desktop and mobile viewports, including unauthorized access denial, customer rejection, store director authentication, product creation, stock adjustment, audit ledger entry, full customer checkout, order confirmation, client order history, admin order filtering, and shipment tracking dispatch:
```powershell
npx playwright test
```

---

## 6. Verification Artifacts & Screenshots

Visual verification artifacts are saved to:
`C:\Users\DELL\.gemini\antigravity\brain\d5b439f2-3bc2-4b00-b531-ea446a6511bf\screenshots\`

- `01-homepage-desktop.png` — Editorial luxury storefront hero & featured collection
- `02-catalog-desktop.png` — Curated creations catalog with database products
- `02b-catalog-filtered-desktop.png` — Category filtered catalog view
- `03-product-details-desktop.png` — Product details with variant selection
- `04-cart-drawer-desktop.png` — Shopping bag drawer with server inventory validation
- `05-checkout-demo-desktop.png` — Checkout demonstration interface
- `06-register-desktop.png` — Client registration portal
- `07-login-desktop.png` — Client authentication portal
- `08-homepage-mobile.png` — Mobile responsive layout
- `09-mobile-nav-drawer.png` — Mobile navigation drawer
- `10-admin-dashboard-overview.png` — Executive Atelier Command Center & metrics overview
- `11-admin-products-list.png` — Product management table with status filtering
- `12-admin-product-editor.png` — Multi-section product creation & variant manager
- `13-admin-inventory-stock.png` — Stock control table with low-stock alerts
- `14-admin-inventory-audit-ledger.png` — Immutable audit trail with administrator attribution
- `15-admin-orders-list.png` — Atelier Order Desk with financial overview and status metrics
