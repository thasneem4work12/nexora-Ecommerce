import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-auth";
import { ADMIN_BUSINESS_COOKIE } from "@/lib/tenant-context";

/**
 * POST /api/admin/businesses/switch
 * Switches the active administrator business context.
 * Strictly verifies server-side that the user is a member of the requested business or a platform SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "VIEW_ADMIN");
    const { user, isSuperAdmin } = adminContext;

    const body = await request.json();
    const { businessId } = body;

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { success: false, error: "Business ID is required." },
        { status: 400 }
      );
    }

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Requested business is invalid or inactive." },
        { status: 404 }
      );
    }

    // Authorization verification
    if (!isSuperAdmin) {
      const membership = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { success: false, error: "Access denied: You are not a member of this business." },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      activeBusinessId: business.id,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
      },
      message: `Active business switched to "${business.name}".`,
    });

    response.cookies.set({
      name: ADMIN_BUSINESS_COOKIE,
      value: business.id,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[API Businesses Switch] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to switch business." },
      { status: 500 }
    );
  }
}
