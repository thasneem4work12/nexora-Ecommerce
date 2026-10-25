# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 0.8.0 (Phase 3 Complete — Business Administration, Product Management & Inventory Auditing)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript Strict Mode, Tailwind CSS, Prisma ORM 6, and PostgreSQL 16

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce SaaS platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 3**, we implemented a comprehensive business administration dashboard, product management CRUD, variant management, and an audited transactional inventory system connected directly to PostgreSQL:

- **Role-Based Access Control (RBAC):** Strict 5-tier role hierarchy (`CUSTOMER`, `STAFF`, `MANAGER`, `OWNER`, `SUPERADMIN`) verified directly against PostgreSQL on every protected API and Server Component page. Customer accounts cannot access administrative capabilities.
- **Secure Owner Bootstrapping CLI:** `npm run admin:bootstrap` CLI script (`scripts/bootstrap-owner.ts`) enables initial store director creation without exposing any vulnerable public elevation endpoints.
- **Executive Administration Dashboard (`/admin`):**
  - Live metric cards queried authoritatively from PostgreSQL: Active Creations, Published Pieces, Total SKUs, Low-Stock Alerts, and Sold-Out Indicators (no fake analytics).
  - Recent stock movements feed with administrator attribution.
  - Responsive administrative sidebar with role badge and secure sign-out.
- **Product Management & Lifecycle (`/admin/products`):**
  - Paginated product list with search, house discipline filter, and status tabs (All, Published, Draft, Private Archive).
  - Creation & Edit suite (`/admin/products/new`, `/admin/products/[id]`) with Zod validation.
  - Automated SEO-friendly slug generator with collision resolution.
  - Quick publish/unpublish toggling with immediate storefront cache invalidation (`revalidatePath`).
  - Non-destructive archiving (`isArchived: true`, `archivedAt`) preserving historical inventory movements and order records while instantly hiding products from customer discovery.
- **House Discipline / Category Management (`/admin/categories`):**
  - Category manager with linked product counters.
  - Safe deletion guard preventing deletion of categories with active creations.
- **Variant & Inventory Management (`/admin/inventory`):**
  - Variant-level inventory tracking (SKU, title, size, color, price in cents, stock, threshold).
  - Configurable low-stock alert thresholds.
  - Filter by low-stock and out-of-stock items.
  - Audited stock adjustment modal supporting Restock, Manual Correction, Damaged Write-off, and Return.
  - Concurrency-safe Prisma transactions preventing negative inventory (`adjustStock`).
- **Auditable Inventory Ledger (`/admin/inventory/movements`):**
  - Immutable audit trail recording variant ID, quantity change, previous stock, new stock, classification, audit reason, reference code, timestamp, and acting administrator.
- **Product Image Uploading (`/api/admin/upload`):**
  - Multi-image gallery supporting both local uploads (JPEG, PNG, WebP, AVIF up to 5MB, stored in `public/uploads/products/` with UUID filenames) and high-resolution CDN URLs.
- **Storefront Compatibility:** Customer storefront queries (`catalog.service.ts`) filter out archived products, and mutations immediately invalidate public Next.js caches.

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
Executes 56 automated tests verifying RBAC matrix enforcement, product lifecycle, duplicate SKU prevention, category deletion guards, audited inventory adjustments, and negative stock rejection:
```powershell
npm run test
```

### End-to-End Browser Tests (Playwright)
Executes 11 full browser tests across desktop and mobile viewports, including unauthorized access denial, customer rejection, store director authentication, product creation, stock adjustment, audit ledger entry, and storefront reflection:
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
