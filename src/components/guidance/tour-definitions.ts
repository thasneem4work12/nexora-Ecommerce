export interface TourStep {
  target: string; // CSS selector or data-tour attribute (e.g., '[data-tour="new-product-btn"]')
  title: string;
  content: string; // Keep to one concise sentence in simple English
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export interface TourDefinition {
  id: string;
  title: string;
  description: string;
  role: "OWNER" | "SUPERADMIN" | "CUSTOMER" | "STAFF" | "ALL";
  steps: TourStep[];
}

export const TOURS: Record<string, TourDefinition> = {
  "owner-dashboard": {
    id: "owner-dashboard",
    title: "Store Owner Walkthrough",
    description: "Learn how to monitor sales, adjust inventory, and switch between stores in 5 quick steps.",
    role: "OWNER",
    steps: [
      {
        target: '[data-tour="dashboard-header"]',
        title: "Welcome to Your Command Center",
        content: "Monitor gross revenue, order volume, and catalog stock queried directly from your database.",
        placement: "bottom",
      },
      {
        target: '[data-tour="dashboard-quick-actions"]',
        title: "Quick Operation Actions",
        content: "Register new creations, adjust stock quantities, or inspect incoming orders with one click.",
        placement: "bottom",
      },
      {
        target: '[data-tour="business-switcher"]',
        title: "Multi-Store Tenant Switcher",
        content: "Seamlessly switch between your fashion, audio, and streetwear boutiques without relogging.",
        placement: "bottom",
      },
      {
        target: '[data-tour="appearance-link"]',
        title: "Storefront Theme Studio",
        content: "Preview visual choices on desktop, tablet, and mobile before publishing them live.",
        placement: "right",
      },
      {
        target: '[data-tour="help-trigger"]',
        title: "Help & Quick Guides",
        content: "Replay this guide or learn unfamiliar workflows anytime from here.",
        placement: "top",
      },
    ],
  },

  "theme-studio": {
    id: "theme-studio",
    title: "Theme Studio & Gallery",
    description: "Discover how to preview, customize, and publish storefront designs safely.",
    role: "OWNER",
    steps: [
      {
        target: '[data-tour="theme-gallery"]',
        title: "Explore the Theme Gallery",
        content: "Choose between Editorial Luxury, Midnight Noir, Modern Minimal, and Orange Energy.",
        placement: "bottom",
      },
      {
        target: '[data-tour="customization-tabs"]',
        title: "Theme Customization",
        content: "Customize core brand colors, typography pairings, and homepage section layouts.",
        placement: "bottom",
      },
      {
        target: '[data-tour="preview-tab"]',
        title: "Multi-Device Live Preview",
        content: "Test your store on desktop, tablet, and mobile using your actual store products.",
        placement: "bottom",
      },
      {
        target: '[data-tour="publish-actions"]',
        title: "Safe Draft & Publish",
        content: "Changes stay private in draft mode until you explicitly publish them to the live storefront.",
        placement: "left",
      },
    ],
  },

  "product-form": {
    id: "product-form",
    title: "Adding Products with Live Preview",
    description: "Learn how to configure product variants, upload images, and preview presentation.",
    role: "OWNER",
    steps: [
      {
        target: '[data-tour="product-basics"]',
        title: "Title & Department",
        content: "Enter your piece's title, artisan description, and assign it to a catalog department.",
        placement: "bottom",
      },
      {
        target: '[data-tour="product-pricing"]',
        title: "Base Price & Status",
        content: "Set base price in USD and toggle publication status between draft and published.",
        placement: "bottom",
      },
      {
        target: '[data-tour="product-media"]',
        title: "Gallery & Crop Guidance",
        content: "Add high-resolution photography with 3:4 aspect ratio recommendations for luxury presentation.",
        placement: "bottom",
      },
      {
        target: '[data-tour="product-variants"]',
        title: "Variants & Stock Control",
        content: "Add size and color combinations with independent SKU numbers and low-stock alerts.",
        placement: "bottom",
      },
      {
        target: '[data-tour="product-card-preview"]',
        title: "Real-Time Storefront Card Preview",
        content: "See exactly how your piece will appear to customers before saving your changes.",
        placement: "left",
      },
    ],
  },

  "order-management": {
    id: "order-management",
    title: "Order Fulfillment Workflow",
    description: "Learn how to inspect purchases, verify payments, and record courier tracking.",
    role: "OWNER",
    steps: [
      {
        target: '[data-tour="orders-metrics"]',
        title: "Fulfillment Pipeline",
        content: "Track settled revenue, orders awaiting atelier fulfillment, and dispatched packages.",
        placement: "bottom",
      },
      {
        target: '[data-tour="orders-filters"]',
        title: "Status Filters & Quick Search",
        content: "Filter orders by status (Paid, Fulfilling, Shipped) or search by customer name and order ID.",
        placement: "bottom",
      },
      {
        target: '[data-tour="orders-table"]',
        title: "Orders Action Table",
        content: "Click any order to view destination addresses, items purchased, and fulfillment controls.",
        placement: "top",
      },
    ],
  },

  "platform-superadmin": {
    id: "platform-superadmin",
    title: "Platform Administration Overview",
    description: "Govern multi-tenant fleet health, subscription plans, and recurring revenue.",
    role: "SUPERADMIN",
    steps: [
      {
        target: '[data-tour="platform-mrr"]',
        title: "SaaS Revenue & MRR",
        content: "Track Monthly Recurring Revenue, ARR run-rates, and lifetime collected platform billing.",
        placement: "bottom",
      },
      {
        target: '[data-tour="platform-tenants-btn"]',
        title: "Tenants & Store Fleet",
        content: "Inspect active boutiques and apply policy suspension controls with mandatory reasons.",
        placement: "bottom",
      },
      {
        target: '[data-tour="platform-plans-btn"]',
        title: "SaaS Plans & Quotas",
        content: "Configure Starter, Growth, and Enterprise plan quotas, pricing, and feature tags.",
        placement: "bottom",
      },
    ],
  },
};
