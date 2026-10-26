import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
import { checkProductLimit } from "@/services/saas/usage.service";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Schemas for validation
export const VariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(3, "SKU must be at least 3 characters").max(50),
  title: z.string().min(1, "Variant title is required"),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  priceInCents: z.number().int().min(0, "Price cannot be negative"),
  stock: z.number().int().min(0, "Initial stock cannot be negative").default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

export const ProductImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "Image URL is required"),
  alt: z.string().optional().nullable(),
  position: z.number().int().default(0),
});

export const CreateProductSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  slug: z.string().optional(),
  description: z.string().min(5, "Description must be at least 5 characters"),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional(),
  basePriceInCents: z.number().int().min(0, "Base price cannot be negative"),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  images: z.array(ProductImageSchema).default([]),
  variants: z.array(VariantSchema).min(1, "At least one variant must be created"),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.input<typeof CreateProductSchema>;
export type UpdateProductInput = z.input<typeof UpdateProductSchema>;

/**
 * Generates an SEO-friendly slug and ensures uniqueness in PostgreSQL.
 */
export async function generateUniqueSlug(
  title: string,
  existingId?: string,
  businessId: string = DEFAULT_BUSINESS_ID
): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug || "product";
  let count = 1;

  while (true) {
    const existing = await prisma.product.findFirst({
      where: { businessId, slug },
      select: { id: true },
    });

    if (!existing || (existingId && existing.id === existingId)) {
      return slug;
    }

    count++;
    slug = `${baseSlug}-${count}`;
  }
}

/**
 * Retrieves dashboard metrics computed directly from PostgreSQL.
 */
export async function getDashboardMetrics(businessId: string = DEFAULT_BUSINESS_ID) {
  const [
    totalProducts,
    publishedProducts,
    archivedProducts,
    totalVariants,
    allVariants,
    recentMovements,
  ] = await prisma.$transaction([
    // 1. Total active products
    prisma.product.count({ where: { businessId, isArchived: false } }),
    // 2. Published products
    prisma.product.count({ where: { businessId, isArchived: false, published: true } }),
    // 3. Archived products
    prisma.product.count({ where: { businessId, isArchived: true } }),
    // 4. Total active variants
    prisma.productVariant.count({
      where: { product: { businessId, isArchived: false } },
    }),
    // 5. Variants stock query
    prisma.productVariant.findMany({
      where: { product: { businessId, isArchived: false } },
      select: { stock: true, lowStockThreshold: true },
    }),
    // 6. Recent inventory movements
    prisma.inventoryMovement.findMany({
      where: { businessId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          select: {
            sku: true,
            title: true,
            product: { select: { title: true } },
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  const lowStockVariants = allVariants.filter(
    (v) => v.stock <= v.lowStockThreshold && v.stock > 0
  ).length;

  const outOfStockVariants = allVariants.filter((v) => v.stock <= 0).length;

  return {
    totalProducts,
    publishedProducts,
    archivedProducts,
    totalVariants,
    lowStockVariants,
    outOfStockVariants,
    recentMovements,
  };
}

/**
 * Retrieves admin products list with comprehensive filtering.
 */
export async function getAdminProducts(
  params: {
    search?: string;
    categoryId?: string;
    status?: "all" | "published" | "draft" | "archived";
    page?: number;
    limit?: number;
    businessId?: string;
  } = {},
  businessId?: string
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 15));
  const skip = (page - 1) * limit;

  const effectiveBusinessId = params.businessId || businessId || DEFAULT_BUSINESS_ID;
  const where: Prisma.ProductWhereInput = { businessId: effectiveBusinessId };

  // Status filter
  if (params.status === "archived") {
    where.isArchived = true;
  } else {
    where.isArchived = false;
    if (params.status === "published") {
      where.published = true;
    } else if (params.status === "draft") {
      where.published = false;
    }
  }

  // Category filter
  if (params.categoryId && params.categoryId !== "all") {
    where.OR = [
      { categoryId: params.categoryId },
      { categoryRef: { slug: params.categoryId } },
    ];
  }

  // Search filter
  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    const searchConditions: Prisma.ProductWhereInput[] = [
      { title: { contains: term, mode: "insensitive" as const } },
      { slug: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
      { variants: { some: { sku: { contains: term, mode: "insensitive" as const } } } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        categoryRef: true,
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          orderBy: { priceInCents: "asc" },
        },
      },
    }),
  ]);

  const items = products.map((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const hasLowStock = p.variants.some(
      (v) => v.stock <= v.lowStockThreshold && v.stock > 0
    );
    const hasOutOfStock = p.variants.some((v) => v.stock <= 0);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.categoryRef?.name ?? p.category,
      categoryId: p.categoryId,
      basePriceInCents: p.basePriceInCents,
      featured: p.featured,
      published: p.published,
      isArchived: p.isArchived,
      totalStock,
      variantCount: p.variants.length,
      hasLowStock,
      hasOutOfStock,
      image: p.images[0]?.url || "/placeholder-luxury.jpg",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return {
    products: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves a single product with all images and variants for the admin editor.
 */
export async function getAdminProductById(id: string, businessId?: string) {
  const where: Prisma.ProductWhereInput = { id };
  if (businessId) where.businessId = businessId;

  const product = await prisma.product.findFirst({
    where,
    include: {
      categoryRef: true,
      images: {
        orderBy: { position: "asc" },
      },
      variants: {
        orderBy: { priceInCents: "asc" },
        include: {
          inventoryMovements: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  return product;
}

/**
 * Creates a new product with variants, initial inventory movements, and images.
 */
export async function createProduct(
  input: CreateProductInput,
  adminId: string,
  businessId: string = DEFAULT_BUSINESS_ID
) {
  const validated = CreateProductSchema.parse(input);
  const slug = await generateUniqueSlug(validated.slug || validated.title, undefined, businessId);

  // Enforce SaaS plan product limit
  const limitCheck = await checkProductLimit(businessId);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason || "Product limit reached for your subscription plan.");
  }

  // Validate SKU uniqueness across the database
  for (const v of validated.variants) {
    const existingSku = await prisma.productVariant.findUnique({
      where: { sku: v.sku },
    });
    if (existingSku) {
      throw new Error(`A variant with SKU "${v.sku}" already exists.`);
    }
  }

  // Resolve category
  let categoryName = validated.categoryName || "Uncategorized";
  if (validated.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: validated.categoryId, businessId },
    });
    if (cat) categoryName = cat.name;
  }

  const created = await prisma.$transaction(async (tx) => {
    // 1. Create product
    const product = await tx.product.create({
      data: {
        businessId,
        title: validated.title.trim(),
        slug,
        description: validated.description.trim(),
        category: categoryName,
        categoryId: validated.categoryId || null,
        basePriceInCents: validated.basePriceInCents,
        featured: validated.featured,
        published: validated.published,
      },
    });

    // 2. Create images
    if (validated.images.length > 0) {
      await tx.productImage.createMany({
        data: validated.images.map((img, idx) => ({
          productId: product.id,
          url: img.url.trim(),
          alt: img.alt?.trim() || null,
          position: img.position ?? idx,
        })),
      });
    }

    // 3. Create variants and audit initial stock movements
    for (const v of validated.variants) {
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku.trim(),
          title: v.title.trim(),
          size: v.size?.trim() || null,
          color: v.color?.trim() || null,
          priceInCents: v.priceInCents,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          isActive: v.isActive ?? true,
        },
      });

      // If initial stock is greater than 0, create an audit record
      if (v.stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            businessId,
            variantId: variant.id,
            quantityChange: v.stock,
            previousStock: 0,
            newStock: v.stock,
            type: "RESTOCK",
            reason: "Initial product creation inventory assignment",
            userId: adminId,
          },
        });
      }
    }

    return product;
  });

  // Revalidate public storefront caches
  revalidateStorefront();

  return created;
}

/**
 * Updates an existing product, images, and variants.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  adminId: string,
  businessId?: string
) {
  const where: Prisma.ProductWhereInput = { id };
  if (businessId) where.businessId = businessId;

  const existingProduct = await prisma.product.findFirst({
    where,
    include: { variants: true, images: true },
  });

  if (!existingProduct) {
    throw new Error(`Product not found with ID: ${id}`);
  }

  let slug = existingProduct.slug;
  if (input.title && input.title !== existingProduct.title) {
    slug = await generateUniqueSlug(input.slug || input.title, existingProduct.id, existingProduct.businessId);
  } else if (input.slug && input.slug !== existingProduct.slug) {
    slug = await generateUniqueSlug(input.slug, existingProduct.id, existingProduct.businessId);
  }

  // Resolve category name if categoryId changed
  let categoryName = existingProduct.category;
  if (input.categoryId && input.categoryId !== existingProduct.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (cat) categoryName = cat.name;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update basic product info
    const product = await tx.product.update({
      where: { id },
      data: {
        title: input.title?.trim() ?? existingProduct.title,
        slug,
        description: input.description?.trim() ?? existingProduct.description,
        category: categoryName,
        categoryId: input.categoryId !== undefined ? input.categoryId : existingProduct.categoryId,
        basePriceInCents: input.basePriceInCents ?? existingProduct.basePriceInCents,
        featured: input.featured ?? existingProduct.featured,
        published: input.published ?? existingProduct.published,
      },
    });

    // 2. Replace images if provided
    if (input.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img, idx) => ({
            productId: id,
            url: img.url.trim(),
            alt: img.alt?.trim() || null,
            position: img.position ?? idx,
          })),
        });
      }
    }

    // 3. Upsert or update variants if provided
    if (input.variants !== undefined) {
      for (const v of input.variants) {
        if (v.id) {
          // Existing variant update
          const existingVariant = existingProduct.variants.find((ev) => ev.id === v.id);
          if (existingVariant) {
            // Check SKU uniqueness if changed
            if (v.sku && v.sku !== existingVariant.sku) {
              const skuConflict = await tx.productVariant.findUnique({
                where: { sku: v.sku },
              });
              if (skuConflict && skuConflict.id !== v.id) {
                throw new Error(`SKU "${v.sku}" is already in use by another variant.`);
              }
            }

            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku ?? existingVariant.sku,
                title: v.title ?? existingVariant.title,
                size: v.size !== undefined ? v.size : existingVariant.size,
                color: v.color !== undefined ? v.color : existingVariant.color,
                priceInCents: v.priceInCents ?? existingVariant.priceInCents,
                lowStockThreshold: v.lowStockThreshold ?? existingVariant.lowStockThreshold,
                isActive: v.isActive !== undefined ? v.isActive : existingVariant.isActive,
              },
            });
          }
        } else {
          // New variant addition to existing product
          const skuConflict = await tx.productVariant.findUnique({
            where: { sku: v.sku },
          });
          if (skuConflict) {
            throw new Error(`SKU "${v.sku}" is already in use.`);
          }

          const initialStock = v.stock ?? 0;
          const newVar = await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku.trim(),
              title: v.title.trim(),
              size: v.size?.trim() || null,
              color: v.color?.trim() || null,
              priceInCents: v.priceInCents ?? 0,
              stock: initialStock,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              isActive: v.isActive ?? true,
            },
          });

          if (initialStock > 0) {
            await tx.inventoryMovement.create({
              data: {
                variantId: newVar.id,
                quantityChange: initialStock,
                previousStock: 0,
                newStock: initialStock,
                type: "RESTOCK",
                reason: "New variant added to product",
                userId: adminId,
              },
            });
          }
        }
      }
    }

    return product;
  });

  revalidateStorefront();
  return updated;
}

/**
 * Toggles product publication status.
 */
export async function setProductPublishStatus(
  id: string,
  published: boolean,
  businessId?: string
) {
  const where: Prisma.ProductWhereUniqueInput = { id };
  if (businessId) {
    const p = await prisma.product.findFirst({ where: { id, businessId } });
    if (!p) throw new Error("Product not found in this business");
  }

  const updated = await prisma.product.update({
    where,
    data: { published },
  });

  revalidateStorefront();
  return updated;
}

/**
 * Archives a product (soft delete) preserving historical order and inventory records.
 */
export async function archiveProduct(id: string, businessId?: string) {
  const where: Prisma.ProductWhereUniqueInput = { id };
  if (businessId) {
    const p = await prisma.product.findFirst({ where: { id, businessId } });
    if (!p) throw new Error("Product not found in this business");
  }

  const updated = await prisma.product.update({
    where,
    data: {
      isArchived: true,
      archivedAt: new Date(),
      published: false, // Immediately hide from public view
    },
  });

  revalidateStorefront();
  return updated;
}

/**
 * Restores an archived product.
 */
export async function restoreProduct(id: string, businessId?: string) {
  const effectiveBusinessId = businessId || DEFAULT_BUSINESS_ID;
  if (businessId) {
    const p = await prisma.product.findFirst({ where: { id, businessId } });
    if (!p) throw new Error("Product not found in this business");
  }

  // Enforce SaaS plan product limit before un-archiving
  const limitCheck = await checkProductLimit(effectiveBusinessId);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason || "Product limit reached for your subscription plan.");
  }

  const where: Prisma.ProductWhereUniqueInput = { id };

  const updated = await prisma.product.update({
    where,
    data: {
      isArchived: false,
      archivedAt: null,
    },
  });

  revalidateStorefront();
  return updated;
}

/**
 * Retrieves all categories with associated product count for the admin manager.
 */
export async function getAdminCategories(businessId: string = DEFAULT_BUSINESS_ID) {
  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: { where: { isArchived: false } },
        },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Creates a new category scoped to a business.
 */
export async function createCategory(
  input: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
  },
  businessId: string = DEFAULT_BUSINESS_ID
) {
  const name = input.name.trim();
  const slug = (input.slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await prisma.category.findFirst({
    where: { businessId, slug },
  });

  if (existing) {
    throw new Error(`Category slug "${slug}" is already in use.`);
  }

  const category = await prisma.category.create({
    data: {
      businessId,
      name,
      slug,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
    },
  });

  revalidateStorefront();
  return category;
}

/**
 * Updates an existing category within its business.
 */
export async function updateCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
  },
  businessId?: string
) {
  const where: Prisma.CategoryWhereInput = { id };
  if (businessId) where.businessId = businessId;

  const existing = await prisma.category.findFirst({ where });
  if (!existing) {
    throw new Error(`Category not found with ID: ${id}`);
  }

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    const slugConflict = await prisma.category.findFirst({
      where: { businessId: existing.businessId, slug: input.slug },
    });
    if (slugConflict && slugConflict.id !== id) {
      throw new Error(`Category slug "${input.slug}" is already in use.`);
    }
    slug = input.slug;
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? existing.name,
      slug,
      description: input.description !== undefined ? input.description?.trim() : existing.description,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl?.trim() : existing.imageUrl,
    },
  });

  revalidateStorefront();
  return updated;
}

/**
 * Safely deletes a category if no products are linked.
 */
export async function deleteCategory(id: string, businessId?: string) {
  const where: Prisma.CategoryWhereInput = { id };
  if (businessId) where.businessId = businessId;

  const existing = await prisma.category.findFirst({ where });
  if (!existing) {
    throw new Error(`Category not found with ID: ${id}`);
  }

  const linkedProducts = await prisma.product.count({
    where: { categoryId: id },
  });

  if (linkedProducts > 0) {
    throw new Error(
      `Cannot delete category: ${linkedProducts} product(s) are currently associated with it. Please reassign or archive them first.`
    );
  }

  const deleted = await prisma.category.delete({
    where: { id },
  });

  revalidateStorefront();
  return deleted;
}

/**
 * Invalidates Next.js cached pages so storefront immediately reflects mutations.
 */
function revalidateStorefront() {
  try {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
  } catch {
    // revalidatePath may not run in test environments without a Next context
  }
}
