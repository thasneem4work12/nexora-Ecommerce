# NEXORA Commerce — Multi-Tenant Luxury & Specialty E-Commerce Platform

> **Version:** 1.1.0 (Phase 7 Complete — Multi-Tenant SaaS Architecture, Business Onboarding & Strict Store Isolation)  
> **Architecture:** Modular Multi-Tenant SaaS Monolith with Next.js 15 App Router, TypeScript Strict Mode, Tailwind CSS, Prisma ORM 6, and PostgreSQL 16

---

## 1. Project Overview

**NEXORA Commerce** is an enterprise-grade, multi-tenant e-commerce SaaS application designed to empower independent brands, boutiques, and fashion ateliers with isolated catalogs, bespoke branding, concurrent stock ledgers, and sovereign order operations on a unified cloud infrastructure.

In **Phase 7**, the application transitioned into a full multi-tenant architecture while maintaining 100% backwards compatibility and data preservation for all Phase 1–6 records:

- **Multi-Tenant SaaS Data Model:**
  - `Business`: Unique ID, URL slug (`/store/[slug]`), brand name, discipline type, operational status (`ACTIVE`, `SUSPENDED`, `ONBOARDING`), currency, and contact info.
  - `BusinessMember`: Connects users to businesses with business-specific roles (`OWNER`, `MANAGER`, `STAFF`). Users can belong to multiple businesses with distinct roles in each.
  - `BusinessSettings`: Per-tenant operational flags, payment provider settings, inventory tracking, and brand-specific order prefixes (`LUM-`, `APX-`, `NXR-`).
  - `BusinessInvitation`: Tokenized single-use invitations with 7-day expiration for onboarding team members (`/invite?token=...`).
  - `BusinessAuditLog`: Cryptographic audit trails for administrative operations stamped with tenant and actor metadata.
- **Strict Data & Catalog Isolation:**
  - Composite uniqueness for categories (`@@unique([businessId, slug])`) and products (`@@unique([businessId, slug])`), allowing identical slugs to exist safely across tenants without conflict.
  - Cross-tenant inventory manipulation prevention: attempts to adjust stock across business boundaries are strictly blocked.
  - Cart and checkout isolation: client carts are partitioned by business (`nexora_cart_${businessId}`), and checkout rejects mixed-tenant carts with authoritative validation.
- **Public Multi-Tenant Routing:**
  - Dedicated public storefronts at `/store/[slug]` (e.g. `/store/lumina-tech`, `/store/apex-kicks`, `/store/nexora`) with dynamic theme resolution, catalog browsing, shopping cart, and checkout.
  - Transparent root `/` fallback mapped to the flagship `default-store`.
- **Store Administration & Business Switching:**
  - Interactive **Store Switcher** in the administration header for instantaneous context switching between authorized businesses.
  - **Stores Directory (`/admin/businesses`)**: Comprehensive overview of all businesses managed by the user with role badges, status, and catalog metrics.
  - **Self-Serve Business Onboarding (`/admin/businesses/new`)**: Multi-step onboarding to launch new storefronts with automated theme, setting, and membership provisioning.
  - **Team Member Management (`/admin/members`)**: Invitation dispatcher, role assigner, and sole-owner protection guard.

### Previous Milestone Deliverables (Phases 1–5)

- **Phase 5:** Dual-status order lifecycle (`OrderStatus` & `FulfillmentStatus`), shipment tracking, cancellation workflows, return requests with inventory audit restock, customer directory with lifetime spend aggregations, concierge support desk with private staff notes, and transactional luxury HTML emails.

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
| `VIEW_APPEARANCE` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `MANAGE_APPEARANCE` | ❌ | ❌ | ❌ | ✅ | ✅ |
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
Executes 177 automated tests across 19 test files verifying multi-tenant catalog isolation, composite slug uniqueness, cross-tenant inventory stock blocks, cart and checkout tenant protection, tenant order prefixing, support ticket scoping, business membership authorization, sole OWNER protection, RBAC matrix enforcement, product lifecycle, duplicate SKU prevention, category deletion guards, audited inventory adjustments, concurrency-safe stock reservations, authoritative order pricing, webhook signature verification, Phase 5 order transitions, shipment tracking URL validation, cancellation workflows, return quantity limits, support ticket privacy, customer spend aggregations, theme draft-publish isolation, CSS variable generation, safe URL validation, and theme reset protections:
```powershell
npm run test
```

### End-to-End Browser Tests (Playwright)
Executes comprehensive browser automation suites across multi-tenant storefronts, cart isolation, administrative switching, business onboarding, appearance studio, order management, and patron support:
```powershell
npx playwright test e2e/multi-tenant.spec.ts e2e/appearance.spec.ts e2e/storefront.spec.ts e2e/admin.spec.ts e2e/operations.spec.ts e2e/orders.spec.ts
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
- `23-theme-editorial-luxury-homepage.png` — Editorial Luxury theme homepage rendering
- `24-theme-editorial-luxury-catalog.png` — Editorial Luxury theme catalog rendering
- `25-theme-midnight-noir-homepage.png` — Midnight Noir theme dark cinematic homepage
- `26-theme-midnight-noir-catalog.png` — Midnight Noir theme catalog with gold accents
- `27-theme-modern-minimal-homepage.png` — Modern Minimal theme clean white homepage
- `28-theme-modern-minimal-catalog.png` — Modern Minimal theme catalog with rounded cards
- `29-theme-orange-energy-homepage.png` — Orange Energy theme streetwear kinetic homepage
- `30-theme-orange-energy-catalog.png` — Orange Energy theme catalog with high-contrast electric orange accents
- `31-admin-appearance-themes-grid.png` — Protected Admin Appearance Studio theme presets browser
- `32-admin-appearance-branding-studio.png` — Admin Appearance Studio store branding and color customization
- `33-admin-appearance-homepage-sections.png` — Admin Appearance Studio dynamic section reordering and toggles
- `34-admin-appearance-responsive-preview.png` — Admin Appearance Studio live responsive preview with viewport switcher
- `35-theme-midnight-noir-mobile.png` — Midnight Noir theme mobile responsive viewport
- `36-theme-orange-energy-mobile.png` — Orange Energy theme mobile responsive viewport
- `37-store-lumina-tech-homepage.png` — Lumina Audio & Tech multi-tenant public storefront (`/store/lumina-tech`)
- `38-store-apex-kicks-homepage.png` — Apex Kicks Streetwear multi-tenant public storefront (`/store/apex-kicks`)
- `39-store-lumina-tech-catalog.png` — Lumina Audio isolated product catalog with Modern Minimal layout
- `40-admin-business-switcher-dropdown.png` — Admin multi-tenant store switcher dropdown with one-click store changing
- `41-admin-businesses-directory.png` — Admin Stores Directory (`/admin/businesses`) listing managed tenants and metrics
- `42-admin-team-members.png` — Store Team & Staff Administration (`/admin/members`) with invitations and role matrix
- `43-admin-new-store-onboarded.png` — Automated verification of self-serve store onboarding flow (`/admin/businesses/new`)
