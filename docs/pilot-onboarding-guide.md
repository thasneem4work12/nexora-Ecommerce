# NEXORA Commerce — Pilot Business Onboarding & Operational Runbook

**Program:** NEXORA Commerce Private Pilot Cohort (Staging/Alpha)  
**Version:** 1.0  
**Target Audience:** Selected Pilot Store Directors, Merchandisers, and Client Liaisons  
**Confidentiality:** Private & Restricted. No external public dissemination.

---

## 1. Program Overview & Pilot Scope

The NEXORA Commerce Pilot Program provides select luxury fashion, horology, and artisanal businesses with early access to the multi-tenant SaaS platform. 

### Pilot Ground Rules
1. **Isolated Staging Environment:** Pilot operations run in a private, sandboxed environment.
2. **Simulated Payments Only:** All transactions utilize development mock payments or PayHere sandbox cards. No real fiat currencies or customer credit cards are charged.
3. **Dedicated Data Partition:** Your store data (products, pricing, orders, patron dossier, appearance presets) is strictly isolated using cryptographic tenant scoping.

---

## 2. Business Owner First-Time Setup

### Step 1: Account & Business Onboarding
1. Navigate to the invitation URL provided by your NEXORA Platform Liaison:  
   `http://localhost:3005/invite?token=<INVITATION_TOKEN>`
2. Complete your Director profile (Full Name, Secure Password min. 8 characters).
3. Upon acceptance, access your Store Command Center:  
   `http://localhost:3005/admin`

### Step 2: Store Identity & Currency
1. In the Store Command Center, open **Business Directory** -> **Store Details**.
2. Confirm your business metadata:
   - **Store Name:** (e.g. *Atelier Aurelia Haute Parfumerie*)
   - **Business Type:** Luxury Fashion / Haute Horology / Leather Goods / Fine Jewelry
   - **Base Currency:** `USD`, `EUR`, `GBP`, or `LKR`
   - **Contact Email:** For administrative inquiries

---

## 3. Product Catalog & Variant Configuration

NEXORA organizes products into collections, categories, and inventory-tracked variants.

### Step 1: Create Categories
1. Navigate to **Admin** -> **Categories** (`/admin/categories`).
2. Click **Create Category**.
3. Specify Name, Slug (URL-friendly), and an editorial description (e.g., *Rare Complications*, *Silk Evening Wear*).

### Step 2: Add Master Product
1. Navigate to **Admin** -> **Products** -> **New Product** (`/admin/products/new`).
2. Provide:
   - **Title:** Full artisanal creation title
   - **Description:** Craftsmanship provenance, materials, care instructions
   - **Category:** Select from previously configured categories
   - **Base Price:** Integer unit (e.g. `$1,450.00` = `145000` cents)
   - **Imagery:** Upload JPEG, PNG, or WebP imagery (max 5 MB per asset). The binary upload inspector automatically verifies file authenticity.

### Step 3: Configure Inventory Variants
1. Define distinct sizes, colorways, or complications (e.g., *Size 38 / Obsidian*, *41mm / Rose Gold*).
2. Enter initial stock level. Each stock adjustment automatically generates an immutable audit record in **Inventory Movements** (`/admin/inventory/movements`).

---

## 4. Theme Selection & Appearance Studio

NEXORA features four curated luxury themes:
- **Editorial Luxury:** High-fashion serif typography, champagne bronze accents, cream canvas.
- **Dark Elegance:** Deep charcoal palette, gold foil highlights, dramatic contrast.
- **Minimal Clean:** Swiss modernist typography, generous whitespace, monochrome restraint.
- **Orange Energy:** Dynamic contemporary avant-garde palette with bold vermilion accents.

### Safe Draft Customization
1. Open **Admin** -> **Appearance Studio** (`/admin/appearance`).
2. Select your desired theme preset.
3. Adjust hero headline, banner announcements, and button corner curvature in the **Draft Studio**.
4. The live preview iframe renders your draft instantly using `SAMEORIGIN` framing.
5. Once satisfied, click **Publish Changes**. Your live storefront updates immediately while drafts remain editable.

---

## 5. Order Management & Fulfillment Workflow

Each patron transaction moves through a deterministic, auditable state machine:
`PENDING -> PAID -> PROCESSING -> PACKED -> SHIPPED -> DELIVERED`

### Processing an Order
1. When a client places an order, it appears in **Admin** -> **Orders** (`/admin/orders`).
2. Click **Manage** on the order to inspect:
   - Client contact dossier and verified delivery coordinates
   - Reserved variant items and immutable purchase prices
   - Payment settlement reference (Mock / Sandbox)
3. Under **Fulfillment Dispatch**:
   - Enter Courier Name (e.g., *DHL Express Luxury Courier*)
   - Enter Tracking Number (e.g., *DHL-LUX-882910*)
   - Click **Save Tracking & Mark Shipped**.
4. The client receives an automated transactional notification in their account portal.

---

## 6. Client Relations & Concierge Support Desk

1. Access the **Concierge Desk** at `/admin/support`.
2. Review incoming client inquiries tagged by priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
3. Open an inquiry, review the client's past order history, and submit official atelier responses.
4. Conclude or resolve tickets once sizing adjustments or inquiries are settled.

---

## 7. SaaS Subscription & Usage Quota Management

1. Access **Admin** -> **SaaS Billing** (`/admin/billing`).
2. Review your active plan allocation (*Starter*, *Growth*, or *Enterprise*).
3. Monitor your active quota bars:
   - **Product Catalog Limit:** Current products vs plan ceiling
   - **Staff Member Limit:** Current team seats vs plan ceiling
4. Test plan upgrades or downgrades. The system mathematically prevents downgrades if your active catalog exceeds target plan quotas.

---

## 8. Feedback Collection & Issue Reporting

During the pilot, report any friction or anomalies immediately:
- **Email:** `pilot-feedback@nexoracommerce.com`
- **Internal Ticket Desk:** `/account/support` (Category: *Platform Feedback*)
- **Required Details:**
  1. Business Slug
  2. Page URL / User Role
  3. Steps to reproduce
  4. Expected vs Actual behavior
  5. Browser & Viewport size
