# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 1.0.0 (Phase 5 Complete — Order Management, Customer Operations, Fulfillment, Returns & After-Sales Concierge Support)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript Strict Mode, Tailwind CSS, Prisma ORM 6, and PostgreSQL 16

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce SaaS platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 5**, we delivered end-to-end post-purchase operations, customer relationship management, fulfillment tracking, returns, and after-sales concierge support:

- **Complete Order Lifecycle & Dual-Status Architecture:**
  - Implemented decoupled order state (`OrderStatus`: `PENDING`, `AWAITING_PAYMENT`, `PAID`, `PROCESSING`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURN_REQUESTED`, `RETURNED`, `REFUNDED`) and fulfillment state (`FulfillmentStatus`: `UNFULFILLED`, `PROCESSING`, `PACKED`, `SHIPPED`, `DELIVERED`, `RETURNED`, `CANCELLED`).
  - Enforced strict state machine transition guards preventing invalid operations (e.g. shipping unconfirmed orders, cancelling dispatched items).
- **Courier & Shipment Management:**
  - Shipping tracking with carrier attribution, tracking code, dispatch timestamp, and secure URL validation (strictly enforcing HTTP/HTTPS to prevent script injection).
  - Multi-step customer-facing delivery progress timeline (`Payment Verified` -> `Atelier Preparation` -> `Dispatched` -> `Delivered`).
- **Comprehensive Cancellation Workflows:**
  - **Unpaid Orders:** Immediate client cancellation with atomic release of stock reservations.
  - **Paid Unfulfilled Orders:** Registered as pending cancellation requests requiring store director review; approval restores inventory with `CANCELLATION` movements and flags orders for refund reconciliation.
  - Dispatched or delivered commissions cannot be cancelled without initiating a return.
- **Returns & Manual Refund Reconciliation Foundation:**
  - `ReturnRequest` model capturing return reasons, requested quantities, inspection status, and return tracking.
  - Strict validation preventing return requests exceeding purchased quantities (`requestedQuantity <= item.quantity`).
  - Store inspection workflow with optional inventory restocking via `RETURN` audit ledger movements.
  - Manual refund reconciliation workflow recording transaction references, amounts, and notes without unverified automated reversals.
- **Clientele & Private Patron Directory (`/admin/customers`):**
  - Authoritative directory backed by PostgreSQL aggregations: total order count and completed lifetime spend computed exclusively from confirmed, non-cancelled orders.
  - Individual Patron Dossier (`/admin/customers/[id]`): Historical commissions, delivery addresses, concierge inquiries, and return records.
- **Concierge & Support Ticket Architecture:**
  - Customer ticket portal (`/account/support` and `/account/support/[id]`) and executive support desk (`/admin/support`).
  - Support ticket isolation: clients can only view and message their own inquiries.
  - Staff internal notes: private staff annotations (`isInternalNote: true`) masked from customer view.
  - Distinct ticket codes (`TCK-XXXXXX`), status progression, and priority tiers (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
- **Transactional Notifications & Luxury HTML Outbox:**
  - `Notification` model with delivery outbox pattern (`QUEUED`, `SENT`, `FAILED`).
  - High-end dark Editorial Luxury HTML email template generator (`generateLuxuryEmailHtml`) with preheaders, gold accents, and brand styling.
  - Development email logger adapter for non-production environments.
- **Security Hardening:**
  - `MockPaymentProvider` is strictly disabled in production (`NODE_ENV === "production"`) with zero bypass.
  - E2E Playwright tests execute in development mode (`npm run dev`) where sandboxing is permitted.

---

### Previous Milestone Deliverables (Phases 1–4)

- **Phase 4:** Authoritative server-side pricing in minor units (cents), PostgreSQL row-locked stock reservations, Sri Lankan PayHere gateway integration, sandbox mock provider, webhook idempotency, checkout demo, order history.
- **Phase 3:** 5-tier RBAC matrix (`CUSTOMER`, `STAFF`, `MANAGER`, `OWNER`, `SUPERADMIN`), product variant management, append-only inventory audit ledger with administrator attribution.
- **Phase 2:** PostgreSQL-powered dynamic product catalog, multi-image galleries, category associations, seed script.
- **Phase 1:** Next.js 15 App Router scaffolding, Editorial Luxury design system, Better Auth PostgreSQL foundation.

---

## 2. Technology Stack

- **Framework:** Next.js 15.2 (App Router, Server Components, Route Handlers, Dynamic Metadata)
- **Language:** TypeScript 5.8 (Strict Mode enabled across client and server)
- **Styling:** Tailwind CSS 3.4 with custom Editorial Luxury design tokens, Lucide Icons, and CVA
- **Database & ORM:** PostgreSQL 16 Alpine running in Docker, Prisma ORM 6
- **Authentication & RBAC:** Better Auth with PostgreSQL session verification and custom RBAC guard layer (`src/lib/admin-auth.ts`)
- **Validation:** Zod schemas for products, variants, images, inventory adjustments, and tracking URLs
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
| `VIEW_ORDERS` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_ORDERS` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `VIEW_CUSTOMERS` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_SUPPORT` | ❌ | ✅ | ✅ | ✅ | ✅ |
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
Executes 145 automated tests across 17 test files verifying RBAC matrix enforcement, product lifecycle, duplicate SKU prevention, category deletion guards, audited inventory adjustments, concurrency-safe stock reservations, authoritative order pricing, webhook signature verification, Phase 5 order transitions, shipment tracking URL validation, cancellation workflows, return quantity limits, support ticket privacy, and authoritative customer spend aggregations:
```powershell
npm run test -- --run
```

### End-to-End Browser Tests (Playwright)
Executes 15 full browser tests across desktop and mobile viewports, including unauthorized access denial, customer rejection, store director authentication, product creation, stock adjustment, audit ledger entry, full customer checkout, order confirmation, client order history, admin order filtering, shipment tracking dispatch, customer support ticket creation, patron dossier inspection, and concierge support replies:
```powershell
npx playwright test e2e/storefront.spec.ts e2e/admin.spec.ts e2e/orders.spec.ts e2e/operations.spec.ts
```

### Visual Verification Screenshots Capture
```powershell
npx playwright test e2e/screenshots.spec.ts
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
- `16-admin-order-detail.png` — Admin detailed order view with line item snapshots and tracking controls
- `17-account-orders-history.png` — Client account order history with status badges
- `18-admin-customers-list.png` — Clientele & Private Patrons directory with PostgreSQL computed spend
- `19-admin-customer-dossier.png` — Patron Dossier with historical acquisitions and inquiries
- `20-admin-support-desk.png` — Concierge & Support Desk with conversation timeline and staff notes
- `21-account-order-timeline.png` — Client order details with 4-step delivery progress timeline
- `22-account-support-tickets.png` — Client Concierge & Support portal with active inquiries
