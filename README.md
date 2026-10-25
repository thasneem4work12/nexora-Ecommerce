# NEXORA Commerce — Haute Couture & Bespoke Luxury E-Commerce Platform

> **Version:** 0.6.0 (Phase 1 Complete — Core Scaffolding, Luxury Storefront & Auth Foundation)  
> **Architecture:** Modular Monolith with Next.js 15 App Router, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL

---

## 1. Project Overview

**NEXORA Commerce** is a production-grade, multi-business e-commerce platform designed for discerning retailers, physical goods boutiques, and atelier fashion brands.

In **Phase 1**, we have stabilized and scaffolded the complete single-store commerce foundation:
- **Design System:** Custom **Editorial Luxury** theme tokens (warm ivory canvas, dark charcoal typography, muted bronze accents, elegant serif typography).
- **Storefront Navigation & Pages:**
  - **Homepage:** Editorial hero section, signature creations grid, three house disciplines, and philosophy manifesto.
  - **Catalog (`/products`):** Dynamic category filtering (Apparel, Footwear, Accessories), pricing sort, and inventory availability indicators.
  - **Product Details (`/products/[slug]`):** High-resolution image gallery, variant selection (size/color), dynamic pricing, stock limit enforcement, and related piece recommendations.
  - **Shopping Bag (`/cart` & Slide-Over Drawer):** Client-side persistent cart with quantity bounds, subtotal, shipping rules, and tax estimation.
  - **Checkout Flow (`/checkout`):** Destination address inputs, order review, and verification.
  - **Authentication & Client Portal (`/login`, `/register`, `/account`):** Maintained **Better Auth** solution with email/password authentication, encrypted HTTP-only session cookies, and protected client portal.
- **Database Architecture:** Normalized PostgreSQL models for `User`, `Session`, `Account`, `Product`, `ProductVariant`, `ProductImage`, and `Cart`.
- **Testing & QA:** Comprehensive Vitest unit and component test suite + Playwright E2E configuration.

---

## 2. Technology Stack

- **Framework:** Next.js 15.2 (App Router, Server Components & Client Boundaries)
- **Language:** TypeScript 5 (Strict Mode enabled)
- **Styling:** Tailwind CSS 3.4 with custom design tokens, CVA (Class Variance Authority), and Lucide Icons
- **Database & ORM:** PostgreSQL 16 Alpine with Prisma ORM 6
- **Authentication:** Better Auth (Official Prisma adapter for PostgreSQL, HTTP-only session cookies, secure password hashing)
- **Testing:** Vitest 3, React Testing Library, and Playwright

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

### Step 5: Start the Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Testing & Verification

### Run Unit and Component Tests (Vitest)
```powershell
npm run test
```

### Run TypeScript Verification
```powershell
npx tsc --noEmit
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
│   ├── schema.prisma         # Prisma data schema (User, Session, Product, Cart)
│   └── migrations/           # Version-controlled PostgreSQL SQL migrations
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Global layout with CartProvider, Header, Footer
│   │   ├── page.tsx          # Homepage with Hero, Signature creations, and Manifesto
│   │   ├── products/         # Catalog page & dynamic [slug] product details
│   │   ├── cart/             # Dedicated full-page shopping cart
│   │   ├── checkout/         # Checkout and address submission
│   │   ├── login/            # Client authentication login page
│   │   ├── register/         # Client profile registration page
│   │   ├── account/          # Protected client account portal
│   │   └── api/auth/         # Better Auth Next.js route handler
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Button, Badge with luxury design tokens
│   │   ├── layout/           # Header, Footer, Navigation
│   │   ├── product/          # ProductCard with image hover and quick-add
│   │   └── cart/             # Slide-over CartDrawer
│   ├── context/              # CartContext with local persistence
│   ├── lib/                  # Prisma client, Better Auth instance, Seed data, Utils
│   └── styles/               # globals.css with Editorial Luxury CSS variables
└── e2e/                      # Playwright end-to-end test specs
```
