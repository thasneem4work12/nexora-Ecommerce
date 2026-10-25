import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  ProductItem,
  ProductVariantItem,
  CategoryItem,
  GetProductsFilter,
  PaginatedProductsResult,
  ProductSortOption,
} from "@/types";

type DbProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
    categoryRef: true;
  };
}>;

/**
 * Transforms a Prisma Product record into the standard ProductItem DTO.
 */
export function toProductItem(dbProduct: DbProductWithRelations): ProductItem {
  const images = (dbProduct.images || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  const variants: ProductVariantItem[] = (dbProduct.variants || [])
    .slice()
    .sort((a, b) => a.priceInCents - b.priceInCents)
    .map((v) => ({
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      title: v.title,
      size: v.size,
      color: v.color,
      priceInCents: v.priceInCents,
      stock: v.stock,
      available: v.stock > 0,
    }));

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    slug: dbProduct.slug,
    description: dbProduct.description,
    category: dbProduct.categoryRef?.name ?? dbProduct.category,
    categoryId: dbProduct.categoryId,
    basePriceInCents: dbProduct.basePriceInCents,
    featured: dbProduct.featured,
    published: dbProduct.published,
    images: images.length > 0 ? images : ["/placeholder-luxury.jpg"],
    variants,
  };
}

/**
 * Retrieves a paginated list of products based on category, search, and sorting criteria.
 * By default, unpublished items are strictly filtered out for client privacy.
 */
export async function getPublishedProducts(
  filter: GetProductsFilter = {}
): Promise<PaginatedProductsResult> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 12));
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isArchived: false,
  };

  // Security: only show published products unless explicitly specified by authorized context
  if (!filter.includeUnpublished) {
    where.published = true;
  }

  // Featured only filter
  if (filter.featuredOnly) {
    where.featured = true;
  }

  // Category filter
  if (filter.category && filter.category.toLowerCase() !== "all") {
    const term = filter.category.toLowerCase();
    where.OR = [
      { category: { equals: term, mode: "insensitive" } },
      { categoryRef: { slug: { equals: term } } },
    ];
  }

  // Search filter
  if (filter.search && filter.search.trim().length > 0) {
    const searchTerm = filter.search.trim();
    const searchCondition: Prisma.ProductWhereInput = {
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    if (where.OR) {
      where.AND = [{ OR: where.OR }, searchCondition];
      delete where.OR;
    } else {
      where.OR = searchCondition.OR;
    }
  }

  // Sorting
  const orderBy = resolveOrderBy(filter.sort);

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          orderBy: { priceInCents: "asc" },
        },
        categoryRef: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    products: products.map(toProductItem),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Retrieves a single product by its unique SEO slug.
 */
export async function getProductBySlug(
  slug: string,
  options: { includeUnpublished?: boolean } = {}
): Promise<ProductItem | null> {
  const where: Prisma.ProductWhereInput = { slug, isArchived: false };

  if (!options.includeUnpublished) {
    where.published = true;
  }

  const product = await prisma.product.findFirst({
    where,
    include: {
      images: {
        orderBy: { position: "asc" },
      },
      variants: {
        orderBy: { priceInCents: "asc" },
      },
      categoryRef: true,
    },
  });

  if (!product) return null;

  return toProductItem(product);
}

/**
 * Retrieves all categories available in the store.
 */
export async function getCategories(): Promise<CategoryItem[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
  }));
}

/**
 * Fetches harmonizing related products in the same category.
 */
export async function getRelatedProducts(
  productId: string,
  category: string,
  limit: number = 3
): Promise<ProductItem[]> {
  const products = await prisma.product.findMany({
    where: {
      published: true,
      isArchived: false,
      id: { not: productId },
      OR: [
        { category: { equals: category, mode: "insensitive" } },
        { categoryRef: { name: { equals: category, mode: "insensitive" } } },
        { categoryRef: { slug: { equals: category.toLowerCase() } } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
      variants: {
        orderBy: { priceInCents: "asc" },
      },
      categoryRef: true,
    },
  });

  return products.map(toProductItem);
}

/**
 * Authoritatively resolves variant price and stock directly from the database.
 */
export async function getVariantStock(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          published: true,
          basePriceInCents: true,
        },
      },
    },
  });

  if (!variant || !variant.product.published) {
    return null;
  }

  return {
    id: variant.id,
    productId: variant.productId,
    productTitle: variant.product.title,
    sku: variant.sku,
    title: variant.title,
    priceInCents: variant.priceInCents,
    stock: variant.stock,
    lowStockThreshold: variant.lowStockThreshold,
    available: variant.stock > 0,
  };
}

/**
 * Helper to translate sort option string into Prisma OrderBy
 */
function resolveOrderBy(
  sort?: ProductSortOption
): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return { basePriceInCents: "asc" };
    case "price-desc":
      return { basePriceInCents: "desc" };
    case "name-asc":
      return { title: "asc" };
    case "name-desc":
      return { title: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "featured":
    default:
      return [{ featured: "desc" }, { createdAt: "desc" }];
  }
}
