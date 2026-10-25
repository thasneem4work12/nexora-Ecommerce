# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 0.7.0 (Phase 2 Complete — Database-Driven Product Catalog & Server Services)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 2**, we transitioned from mock datasets to a 100% PostgreSQL-driven product catalog while preserving the Editorial Luxury visual aesthetic:
- **Relational Catalog Schema:** Normalized PostgreSQL models for `Category`, `Product`, `ProductVariant`, `ProductImage`, and `Cart`.
- **Performance Indexes:** Optimized B-tree indexes for `published`, `featured`, `category`, `basePriceInCents`, and variant SKU lookups.
- **Idempotent Database Seeding:** Professional seed script (`prisma/seed.ts` via `npm run db:seed`) creating luxury demonstration items across Apparel, Footwear, and Accessories, complete with variants, SKUs, inventory counts, and multi-angle imagery.
- **Server-Side Catalog Services:** Modular service layer (`src/services/catalog.service.ts`) handling published product listing, category filtering, keyword search, price/alphabetical sorting, pagination, related piece discovery, and variant stock resolution.
- **Authoritative Cart Validation:** Server-side inventory and pricing validation service (`src/services/cart.service.ts`) protecting against client price tampering and enforcing inventory limits.
- **Safe Read-Only REST APIs:**
  - `GET /api/products`: Paginated product query with category filter, search, and sorting.
  - `GET /api/products/[slug]`: Single product lookup by SEO slug with 404 for unpublished items.
  - `GET /api/categories`: List all store categories.
  - `POST /api/cart/validate`: Authoritative cart validation verifying stock and calculating server totals.
- **Storefront Integration:**
  - **Homepage:** Featured creations dynamically queried from PostgreSQL.
  - **Catalog (`/products`):** Server Component with real-time URL query parameters for search, category tabs, sort options, and pagination.
  - **Product Details (`/products/[slug]`):** Server Component with dynamic OpenGraph metadata, variant selector, stock limit indicators, and related product recommendations.
  - **Checkout Flow (`/checkout`):** Pre-checkout cart verification against PostgreSQL before commission acceptance.

---

## 2. Technology Stack

- **Framework:** Next.js 15.2 (App Router, Server Components & Dynamic Metadata)
- **Language:** TypeScript 5 (Strict Mode enabled)
- **Styling:** Tailwind CSS 3.4 with custom design tokens, CVA (Class Variance Authority), and Lucide Icons
- **Database & ORM:** PostgreSQL 16 Alpine with Prisma ORM 6
- **Authentication:** Better Auth (Official Prisma adapter for PostgreSQL, HTTP-only session cookies, secure password hashing)
- **Testing:** Vitest 3, React Testing Library, and Playwright E2E suite

---

## 3. Local Setup Instructions (Windows PowerShell)

### Prerequisites
- **Node.js:** v20+ or v22+ LTS installed (`node -v`)
- **Docker Desktop:** Installed and running (for containerized PostgreSQL) or a local PostgreSQL 16 instance

### Step 1: Clone and Install Dependencies
```powershell
cd c:\Users\DELL\Documents\antigravity\resilient-einstein
npm install
```

### Step 2: Environment Configuration
Copy the sample environment file:
```powershell
Copy-Item .env.example .env
```
Ensure your database credentials in `.env` match your PostgreSQL instance:
```env
DATABASE_URL="postgresql://nexora:nexora_password@localhost:5432/nexora_db?schema=public"
BETTER_AUTH_SECRET="nexora_development_session_secret_key_at_least_32_characters_long"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3: Start PostgreSQL with Docker Compose
```powershell
npm run db:up
```
*(If running native PostgreSQL, ensure port 5432 is running with user `nexora` and database `nexora_db`).*

### Step 4: Run Prisma Database Migrations
```powershell
npx prisma migrate dev
```

### Step 5: Seed the Database
Populate PostgreSQL with realistic luxury demonstration physical items, variants, images, and categories:
```powershell
npm run db:seed
```

### Step 6: Start the Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Testing & Verification

### Run Unit and Integration Tests (Vitest)
```powershell
npm run test
```

### Run End-to-End Browser Tests (Playwright)
```powershell
npx playwright test
```

### Run TypeScript Verification
```powershell
npx tsc --noEmit
```

### Run Linting
```powershell
npm run lint
```

### Run Production Build
```powershell
npm run build
```

---

## 5. Project Folder Structure

```
resilient-einstein/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # PostgreSQL 16 Alpine container configuration
├── package.json              # Project dependencies and npm scripts
├── tsconfig.json             # TypeScript strict configuration
├── tailwind.config.ts        # Luxury Editorial theme tokens
├── vitest.config.ts          # Vitest testing configuration
├── playwright.config.ts      # Playwright E2E configuration
├── prisma/
│   ├── schema.prisma         # Prisma data schema (User, Session, Category, Product, Cart)
│   ├── seed.ts               # Idempotent database seeding script (npm run db:seed)
│   └── migrations/           # Version-controlled PostgreSQL SQL migrations
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Global layout with CartProvider, Header, Footer
│   │   ├── page.tsx          # Homepage with database-driven Signature creations
│   │   ├── products/         # Catalog page & dynamic [slug] product details (Server Components)
│   │   ├── cart/             # Dedicated full-page shopping cart
│   │   ├── checkout/         # Checkout with server-side cart inventory validation
│   │   ├── login/            # Client authentication login page
│   │   ├── register/         # Client profile registration page
│   │   ├── account/          # Protected client account portal
│   │   └── api/              # Safe REST API endpoints
│   │       ├── products/     # GET /api/products & GET /api/products/[slug]
│   │       ├── categories/   # GET /api/categories
│   │       ├── cart/validate # POST /api/cart/validate
│   │       └── auth/         # Better Auth Next.js route handler
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Button, Badge with luxury design tokens
│   │   ├── layout/           # Header (with expandable search), Footer
│   │   ├── product/          # ProductCard, CatalogToolbar, ProductDetailClient
│   │   └── cart/             # Slide-over CartDrawer
│   ├── services/             # Server-side business logic (PostgreSQL via Prisma)
│   │   ├── catalog.service.ts # Products listing, search, category filter, sort, slug lookup
│   │   └── cart.service.ts    # Authoritative stock and price validation
│   ├── context/              # CartContext with local persistence
│   │   └── CartContext.tsx   # Client cart state and convenience actions
│   ├── lib/                  # Prisma client, Better Auth instance, Seed data, Utils
│   └── styles/               # globals.css with Editorial Luxury CSS variables
└── e2e/                      # Playwright end-to-end test specs
```
