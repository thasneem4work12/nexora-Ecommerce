import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import type { Business, StoreThemeConfig } from "@prisma/client";

export const DEFAULT_BUSINESS_ID = "default-store";
export const DEFAULT_BUSINESS_SLUG = "nexora";
export const ADMIN_BUSINESS_COOKIE = "nexora_admin_business_id";

export interface ResolvedTenant {
  business: Business;
  themeConfig?: StoreThemeConfig | null;
}

/**
 * Resolves a store tenant by slug, businessId, or falls back to default store.
 * Safe for public storefront usage.
 */
export async function resolveStoreTenant(
  slugOrId?: string
): Promise<ResolvedTenant | null> {
  const target = slugOrId?.trim();

  // If no specific identifier provided, resolve default store
  if (!target || target === "default" || target === DEFAULT_BUSINESS_SLUG) {
    const business = await prisma.business.findFirst({
      where: {
        OR: [{ id: DEFAULT_BUSINESS_ID }, { slug: DEFAULT_BUSINESS_SLUG }],
      },
      include: { themeConfig: true },
    });

    if (!business) return null;
    return { business, themeConfig: business.themeConfig };
  }

  // Look up by slug or ID
  const business = await prisma.business.findFirst({
    where: {
      OR: [{ slug: target.toLowerCase() }, { id: target }],
      status: "ACTIVE",
    },
    include: { themeConfig: true },
  });

  if (!business) return null;
  return { business, themeConfig: business.themeConfig };
}

/**
 * Server-side helper to get the active business ID for administrative contexts.
 * Reads from request cookie or header, falling back to default store.
 */
export async function getActiveAdminBusinessId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(ADMIN_BUSINESS_COOKIE)?.value;
    if (cookieVal) return cookieVal;

    const reqHeaders = await headers();
    const headerVal = reqHeaders.get("x-business-id");
    if (headerVal) return headerVal;
  } catch {
    // In background workers or isolated contexts without Next.js headers
  }

  return DEFAULT_BUSINESS_ID;
}
