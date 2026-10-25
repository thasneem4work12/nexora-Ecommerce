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

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

export type ProductSortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "newest";

export interface GetProductsFilter {
  category?: string;
  search?: string;
  sort?: ProductSortOption;
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
  includeUnpublished?: boolean;
}

export interface PaginatedProductsResult {
  products: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProductItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  categoryId?: string | null;
  basePriceInCents: number;
  featured: boolean;
  published?: boolean;
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
