import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-auth";
import { getActiveAdminBusinessId, ADMIN_BUSINESS_COOKIE } from "@/lib/tenant-context";

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "store",
  "stores",
  "login",
  "register",
  "checkout",
  "cart",
  "account",
  "products",
  "categories",
  "auth",
  "orders",
]);

/**
 * GET /api/admin/businesses
 * Returns all businesses accessible by the current administrator.
 */
export async function GET(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "VIEW_ADMIN");
    const { user, isSuperAdmin } = adminContext;

    const activeBusinessId = await getActiveAdminBusinessId();

    if (isSuperAdmin) {
      // Platform SUPERADMIN sees all active businesses
      const allBusinesses = await prisma.business.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              members: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        activeBusinessId,
        businesses: allBusinesses.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          type: b.type,
          role: "SUPERADMIN",
          status: b.status,
          defaultCurrency: b.currency,
          productCount: b._count.products,
          orderCount: b._count.orders,
          memberCount: b._count.members,
        })),
      });
    }

    // Business members query
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: user.id,
        business: { status: "ACTIVE" },
      },
      include: {
        business: {
          include: {
            _count: {
              select: {
                products: true,
                orders: true,
                members: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const businesses = memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      slug: m.business.slug,
      type: m.business.type,
      role: m.role,
      status: m.business.status,
      defaultCurrency: m.business.currency,
      productCount: m.business._count.products,
      orderCount: m.business._count.orders,
      memberCount: m.business._count.members,
    }));

    return NextResponse.json({
      success: true,
      activeBusinessId,
      businesses,
    });
  } catch (error) {
    console.error("[API Businesses GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load businesses." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/businesses
 * Creates and onboards a new independent business.
 * The creator is automatically assigned as the initial OWNER.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "VIEW_ADMIN");
    const { user } = adminContext;

    const body = await request.json();
    const {
      name,
      slug: rawSlug,
      type = "Retail & Commerce",
      defaultCurrency = "USD",
      contactEmail,
      contactPhone,
      themeId = "modern-minimal",
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Business name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const slug = (rawSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { success: false, error: "A valid alphanumeric slug is required." },
        { status: 400 }
      );
    }

    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { success: false, error: `The store slug "${slug}" is reserved by the platform.` },
        { status: 400 }
      );
    }

    // Uniqueness check
    const existing = await prisma.business.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `The store slug "${slug}" is already registered. Please choose another.` },
        { status: 409 }
      );
    }

    // Transactionally create Business, Settings, ThemeConfig, BusinessMember, and AuditLog
    const business = await prisma.$transaction(async (tx) => {
      const newBusiness = await tx.business.create({
        data: {
          name: name.trim(),
          slug,
          type: type.trim(),
          currency: defaultCurrency.toUpperCase().trim(),
          contactEmail: contactEmail?.trim() || user.email,
          contactPhone: contactPhone?.trim() || null,
          status: "ACTIVE",
        },
      });

      // Business Settings
      await tx.businessSettings.create({
        data: {
          businessId: newBusiness.id,
          allowMockPayment: true,
          inventoryTracking: true,
          orderPrefix: slug.slice(0, 3).toUpperCase(),
        },
      });

      // Store Theme Config
      await tx.storeThemeConfig.create({
        data: {
          businessId: newBusiness.id,
          activeThemeId: themeId,
          storeName: newBusiness.name,
          storeTagline: `${newBusiness.name} Atelier`,
          contactEmail: newBusiness.contactEmail,
          contactPhone: newBusiness.contactPhone,
        },
      });

      // Creator is OWNER
      await tx.businessMember.create({
        data: {
          businessId: newBusiness.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Audit Log
      await tx.businessAuditLog.create({
        data: {
          businessId: newBusiness.id,
          userId: user.id,
          action: "BUSINESS_CREATED",
          details: {
            name: newBusiness.name,
            slug: newBusiness.slug,
            type: newBusiness.type,
            creatorEmail: user.email,
          },
        },
      });

      return newBusiness;
    });

    // Create response and set active business cookie to the new business
    const response = NextResponse.json({
      success: true,
      business,
      message: `Business "${business.name}" onboarded successfully.`,
    });

    response.cookies.set({
      name: ADMIN_BUSINESS_COOKIE,
      value: business.id,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[API Businesses POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create business." },
      { status: 500 }
    );
  }
}
