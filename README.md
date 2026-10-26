# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 1.0.0 (Phase 6 Complete — Premium Storefront Customization, Theme Engine & Store Branding)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript Strict Mode, Tailwind CSS, Prisma ORM 6, and PostgreSQL 16

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce SaaS platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 6**, we delivered a comprehensive, database-backed storefront theme engine and interactive Appearance Studio:

- **Database-Backed Theme Engine (`StoreThemeConfig`):**
  - PostgreSQL schema supporting active theme identifier, store branding (name, tagline, safe URLs for logo & favicon, contact details), announcement bar configuration, custom primary/secondary color overrides, and homepage section layouts.
  - Architecture scoped for single-store operation (`businessId: "default-store"`) while natively designed for future Phase 7 multi-tenancy.
  - Zero arbitrary CSS injection or unsanitized script execution: all color inputs are strictly validated with hexadecimal regex (`#RRGGBB`), URLs require HTTPS/HTTP/relative protocols, and typography tokens map to strictly typed design presets.
- **Four Visibly Distinct Production Themes:**
  1. **Editorial Luxury (`editorial-luxury`):** Ivory/cream canvas (`#FAF8F5`, `#F4EFEA`), warm charcoal text (`#1C1917`), bronze accents (`#966A38`), Playfair Display serif typography, classic split hero, editorial card styling with no border radius (`0px`).
  2. **Midnight Noir (`midnight-noir`):** Dark charcoal/jet black canvas (`#0D0E11`, `#1C1F26`), pearl white text (`#F0EFEB`), metallic gold accents (`#D4AF37`), Cinzel luxury serif typography, cinematic dark hero with glowing accents and subtle luxury card borders.
  3. **Modern Minimal (`modern-minimal`):** Pure white canvas (`#FFFFFF`, `#F9FAFB`), deep graphite text (`#111827`), slate/cool neutral accents (`#1F2937`), Inter clean sans-serif typography, rounded cards/buttons (`6px`), airy grid layout and high-contrast minimalism.
  4. **Orange Energy (`orange-energy`):** High-contrast deep black/charcoal (`#0A0A0A`, `#1E1E1E`), clean white text (`#FFFFFF`), kinetic electric orange accents (`#FF5500`), condensed heavy sans typography, high-impact streetwear energy with razor pill buttons.
- **Protected Admin Appearance Studio (`/admin/appearance`):**
  - **Theme Presets Tab:** Live cards for all 4 themes showing typography specs, color swatches, and one-click draft selection.
  - **Store Branding Tab:** Custom store name, tagline, logo URL, favicon URL, contact email/phone, announcement bar controls, and custom primary/secondary hex color overrides with live preview.
  - **Homepage Sections Tab:** Dynamic reordering (Up/Down controls), visibility toggling, and content customization for all 8 section types (`hero`, `featured_products`, `categories`, `promotional_banner`, `brand_story`, `image_text`, `newsletter`, `benefits`).
  - **Responsive Live Preview Tab:** Viewport switcher (Desktop 100%, Tablet 768px, Mobile 375px) rendering the storefront within an isolated sandbox frame, plus full-window preview support.
- **Draft vs. Published Isolation Lifecycle:**
  - Changes saved in the studio are stored exclusively as drafts (`draftConfig` JSON) in PostgreSQL.
  - The public live storefront remains completely unaffected until the Store Owner explicitly clicks "Publish to Live Store".
  - Staff and Store Directors can discard drafts to restore current published settings or reset to safe default Editorial Luxury settings at any time.
- **End-to-End Visual Verification:**
  - 36 full-page screenshots capturing all 4 themes across desktop and mobile viewports, responsive preview modes, and administrative studio workflows.

---

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
Executes 159 automated tests across 18 test files verifying RBAC matrix enforcement, product lifecycle, duplicate SKU prevention, category deletion guards, audited inventory adjustments, concurrency-safe stock reservations, authoritative order pricing, webhook signature verification, Phase 5 order transitions, shipment tracking URL validation, cancellation workflows, return quantity limits, support ticket privacy, customer spend aggregations, theme draft-publish isolation, CSS variable generation, safe URL validation, and theme reset protections:
```powershell
npm run test -- --run
```

### End-to-End Browser Tests (Playwright)
Executes 20 full browser tests across desktop and mobile viewports, including unauthorized access denial, customer rejection, store director authentication, product creation, stock adjustment, audit ledger entry, full customer checkout, order confirmation, client order history, admin order filtering, shipment tracking dispatch, customer support ticket creation, patron dossier inspection, concierge support replies, appearance studio RBAC protection, theme preset browsing, draft modification isolation, responsive iframe previewing, theme publishing, and defaults restoration:
```powershell
npx playwright test e2e/appearance.spec.ts e2e/storefront.spec.ts e2e/admin.spec.ts e2e/operations.spec.ts e2e/orders.spec.ts
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
