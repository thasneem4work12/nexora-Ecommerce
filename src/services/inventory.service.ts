import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
import type { InventoryMovementType, Prisma } from "@prisma/client";

export interface StockAdjustmentInput {
  businessId?: string;
  variantId: string;
  delta: number; // positive to add stock, negative to remove
  type: InventoryMovementType;
  reason: string;
  reference?: string;
  adminId: string;
}

export interface InventoryFilter {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Concurrency-safe, transactional inventory adjustment.
 * Guarantees stock never becomes negative and produces an auditable InventoryMovement.
 */
export async function adjustStock(input: StockAdjustmentInput) {
  if (input.delta === 0) {
    throw new Error("Adjustment delta cannot be zero.");
  }

  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error("An audit reason must be provided for stock adjustments.");
  }

  return await prisma.$transaction(async (tx) => {
    const businessId = input.businessId || DEFAULT_BUSINESS_ID;

    // Concurrency safety: acquire exclusive PostgreSQL row-level lock on the variant.
    // Serializes concurrent requests on the same variant and prevents race conditions.
    await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${input.variantId} FOR UPDATE`;

    // 1. Fetch variant with current stock and product businessId
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            published: true,
            businessId: true,
          },
        },
      },
    });

    if (!variant) {
      throw new Error(`Variant not found with ID: ${input.variantId}`);
    }

    if (input.businessId && variant.product.businessId !== input.businessId) {
      throw new Error(
        `Cross-tenant access denied: Variant "${variant.id}" does not belong to business "${input.businessId}".`
      );
    }

    const previousStock = variant.stock;
    const newStock = previousStock + input.delta;

    // 2. Strict negative stock protection
    if (newStock < 0) {
      throw new Error(
        `Insufficient inventory: cannot reduce stock of "${variant.product.title} (${variant.title})" from ${previousStock} by ${Math.abs(input.delta)}. Stock cannot be negative.`
      );
    }

    // 3. Update stock in database
    const updatedVariant = await tx.productVariant.update({
      where: { id: variant.id },
      data: {
        stock: newStock,
      },
    });

    // 4. Create audit record
    const movement = await tx.inventoryMovement.create({
      data: {
        businessId: variant.product.businessId || businessId,
        variantId: variant.id,
        quantityChange: input.delta,
        previousStock,
        newStock,
        type: input.type,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        userId: input.adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      variant: updatedVariant,
      movement,
    };
  });
}

/**
 * Sets low stock alert threshold for a variant.
 */
export async function setLowStockThreshold(
  variantId: string,
  threshold: number
) {
  if (threshold < 0) {
    throw new Error("Low stock threshold cannot be negative.");
  }

  return await prisma.productVariant.update({
    where: { id: variantId },
    data: { lowStockThreshold: threshold },
  });
}

/**
 * Retrieves paginated list of variants with current inventory and low stock indicators.
 */
export async function getInventoryItems(
  filter: InventoryFilter & { businessId?: string } = {},
  businessIdArg?: string
) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const skip = (page - 1) * limit;
  const businessId = filter.businessId || businessIdArg || DEFAULT_BUSINESS_ID;

  // We can build the where query for variants scoped to the tenant business
  const where: Prisma.ProductVariantWhereInput = {
    product: {
      businessId,
      isArchived: false,
    },
  };

  if (filter.search && filter.search.trim().length > 0) {
    const term = filter.search.trim();
    where.OR = [
      { sku: { contains: term, mode: "insensitive" as const } },
      { title: { contains: term, mode: "insensitive" as const } },
      { product: { title: { contains: term, mode: "insensitive" as const } } },
    ];
  }

  // If lowStockOnly is selected, we filter in query or post-process
  const [totalRaw, variants] = await prisma.$transaction([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      skip: filter.lowStockOnly ? undefined : skip,
      take: filter.lowStockOnly ? undefined : limit,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      include: {
        product: {
          select: {
            id: true,
            businessId: true,
            title: true,
            category: true,
            published: true,
            images: {
              take: 1,
              orderBy: { position: "asc" },
            },
          },
        },
        inventoryMovements: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    }),
  ]);

  let items = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    title: v.title,
    size: v.size,
    color: v.color,
    priceInCents: v.priceInCents,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold,
    isLowStock: v.stock <= v.lowStockThreshold && v.stock > 0,
    isOutOfStock: v.stock <= 0,
    isActive: v.isActive,
    product: {
      id: v.product.id,
      businessId: v.product.businessId,
      title: v.product.title,
      category: v.product.category,
      published: v.product.published,
      image: v.product.images[0]?.url || null,
    },
    latestMovement: v.inventoryMovements[0] || null,
  }));

  if (filter.lowStockOnly) {
    items = items.filter((i) => i.isLowStock || i.isOutOfStock);
    const paginatedItems = items.slice(skip, skip + limit);
    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit) || 1,
      },
    };
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalRaw,
      totalPages: Math.ceil(totalRaw / limit) || 1,
    },
  };
}

/**
 * Retrieves auditable movement history scoped to businessId.
 */
export async function getInventoryMovements(
  params: {
    variantId?: string;
    page?: number;
    limit?: number;
    businessId?: string;
  } = {},
  businessIdArg?: string
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const skip = (page - 1) * limit;
  const businessId = params.businessId || businessIdArg || DEFAULT_BUSINESS_ID;

  const where: Prisma.InventoryMovementWhereInput = {
    businessId,
    ...(params.variantId ? { variantId: params.variantId } : {}),
  };

  const [total, movements] = await prisma.$transaction([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            title: true,
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
