/**
 * NEXORA Commerce Core Type Definitions
 */

export type UserRole = "CUSTOMER" | "STAFF" | "MANAGER" | "OWNER" | "SUPERADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
  createdAt: Date;
}

export interface ProductVariantItem {
  id: string;
  productId: string;
  sku: string;
  title: string;
  size?: string | null;
  color?: string | null;
  priceInCents: number;
  stock: number;
  available: boolean;
}

export interface ProductItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  basePriceInCents: number;
  featured: boolean;
  images: string[];
  variants: ProductVariantItem[];
}

export interface CartLineItem {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  priceInCents: number;
  quantity: number;
  image: string;
  maxStock: number;
}

export interface CartSummary {
  items: CartLineItem[];
  itemCount: number;
  subtotalInCents: number;
  estimatedTaxInCents: number;
  shippingInCents: number;
  totalInCents: number;
}
