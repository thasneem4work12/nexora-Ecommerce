import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_BUSINESS_COOKIE } from "@/lib/tenant-context";
import { checkStaffLimit } from "@/services/saas/usage.service";

/**
 * POST /api/admin/members/accept
 * Accepts an invitation token to join a business team.
 */
export async function POST(request: NextRequest) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in or register to accept your invitation." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Invitation token is required." },
        { status: 400 }
      );
    }

    const invitation = await prisma.businessInvitation.findUnique({
      where: { token },
      include: { business: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found or invalid." },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: `This invitation has already been ${invitation.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This invitation has expired. Please request a new invite." },
        { status: 410 }
      );
    }

    // Verify if user is already a member
    const existing = await prisma.businessMember.findUnique({
      where: {
        businessId_userId: {
          businessId: invitation.businessId,
          userId: session.user.id,
        },
      },
    });

    if (existing) {
      // Mark invitation accepted if not already
      await prisma.businessInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        businessId: invitation.businessId,
        businessName: invitation.business.name,
        role: existing.role,
        message: "You are already a member of this business.",
      });
    }

    // Verify staff limit before adding member
    const staffLimitCheck = await checkStaffLimit(invitation.businessId);
    if (!staffLimitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: staffLimitCheck.reason || "Staff limit reached for this business's plan." },
        { status: 403 }
      );
    }

    // Add user as business member and mark invitation accepted
    await prisma.$transaction(async (tx) => {
      // Concurrency safety: acquire exclusive row-level lock on the business's subscription
      await tx.$queryRaw`SELECT id FROM "saas_subscriptions" WHERE "businessId" = ${invitation.businessId} FOR UPDATE`;

      const activeSub = await tx.saaSSubscription.findUnique({
        where: { businessId: invitation.businessId },
        include: { plan: true },
      });
      if (activeSub && activeSub.plan) {
        const memberCount = await tx.businessMember.count({ where: { businessId: invitation.businessId } });
        if (memberCount >= activeSub.plan.maxStaff) {
          throw new Error(`Plan team limit reached (${memberCount}/${activeSub.plan.maxStaff}).`);
        }
      }

      await tx.businessMember.create({
        data: {
          businessId: invitation.businessId,
          userId: session.user.id,
          role: invitation.role,
        },
      });

      await tx.businessInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      await tx.businessAuditLog.create({
        data: {
          businessId: invitation.businessId,
          userId: session.user.id,
          action: "MEMBER_JOINED",
          details: {
            userEmail: session.user.email,
            role: invitation.role,
            invitationId: invitation.id,
          },
        },
      });
    });

    const response = NextResponse.json({
      success: true,
      businessId: invitation.businessId,
      businessName: invitation.business.name,
      role: invitation.role,
      message: `Welcome to ${invitation.business.name}! You have joined as ${invitation.role}.`,
    });

    response.cookies.set({
      name: ADMIN_BUSINESS_COOKIE,
      value: invitation.businessId,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[API Members Accept POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to accept invitation." },
      { status: 500 }
    );
  }
}
