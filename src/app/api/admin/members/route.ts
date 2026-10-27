import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-auth";
import { checkStaffLimit } from "@/services/saas/usage.service";
import type { BusinessRole } from "@prisma/client";

/**
 * GET /api/admin/members
 * Retrieves all members and pending invitations for the active business.
 */
export async function GET(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "VIEW_ADMIN");
    const { businessId } = adminContext;

    const [members, invitations] = await prisma.$transaction([
      prisma.businessMember.findMany({
        where: { businessId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.businessInvitation.findMany({
        where: { businessId, status: "PENDING" },
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      businessId,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        businessRole: m.role,
        platformRole: m.user.role,
        joinedAt: m.createdAt,
      })),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        status: inv.status,
        expiresAt: inv.expiresAt,
        invitedBy: inv.invitedBy.name || inv.invitedBy.email,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error("[API Members GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load team members." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/members
 * Invites a new team member to the active business with a scoped business role.
 */
export async function POST(request: NextRequest) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_MEMBERS");
    const { user, businessId, businessRole, isSuperAdmin } = adminContext;

    const body = await request.json();
    const { email: rawEmail, role = "STAFF" } = body;

    if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase().trim();
    const targetRole = role.toUpperCase() as BusinessRole;

    if (!["OWNER", "MANAGER", "STAFF"].includes(targetRole)) {
      return NextResponse.json(
        { success: false, error: "Invalid role specified. Must be OWNER, MANAGER, or STAFF." },
        { status: 400 }
      );
    }

    // Role hierarchy permission enforcement:
    // Only OWNER or SUPERADMIN can invite an OWNER or MANAGER.
    if ((targetRole === "OWNER" || targetRole === "MANAGER") && businessRole !== "OWNER" && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only store Owners can invite other Owners or Managers." },
        { status: 403 }
      );
    }

    // Enforce SaaS plan staff limit
    const staffLimitCheck = await checkStaffLimit(businessId);
    if (!staffLimitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: staffLimitCheck.reason || "Staff limit reached for your subscription plan." },
        { status: 403 }
      );
    }

    // Check if the user is already an active member of this business
    const existingMember = await prisma.businessMember.findFirst({
      where: {
        businessId,
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: `User with email "${email}" is already a member of this business.` },
        { status: 409 }
      );
    }

    // Check existing pending invitation
    const existingInvite = await prisma.businessInvitation.findFirst({
      where: {
        businessId,
        email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        {
          success: true,
          invitation: existingInvite,
          message: `Active invitation already exists for "${email}".`,
        },
        { status: 200 }
      );
    }

    // Generate secure cryptographically random token
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiration

    const invitation = await prisma.$transaction(async (tx) => {
      // Concurrency safety: acquire exclusive row-level lock on the business's subscription
      await tx.$queryRaw`SELECT id FROM "saas_subscriptions" WHERE "businessId" = ${businessId} FOR UPDATE`;

      const activeSub = await tx.saaSSubscription.findUnique({
        where: { businessId },
        include: { plan: true },
      });
      if (activeSub && activeSub.plan) {
        const memberCount = await tx.businessMember.count({ where: { businessId } });
        if (memberCount >= activeSub.plan.maxStaff) {
          throw new Error(`Plan team limit reached (${memberCount}/${activeSub.plan.maxStaff}).`);
        }
      }

      const inv = await tx.businessInvitation.create({
        data: {
          businessId,
          email,
          role: targetRole,
          token,
          expiresAt,
          invitedById: user.id,
          status: "PENDING",
        },
      });

      await tx.businessAuditLog.create({
        data: {
          businessId,
          userId: user.id,
          action: "MEMBER_INVITED",
          details: {
            invitedEmail: email,
            role: targetRole,
            invitedBy: user.email,
          },
        },
      });

      return inv;
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
      message: `Invitation successfully created for ${email}.`,
    });
  } catch (error) {
    console.error("[API Members POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to invite member." },
      { status: 500 }
    );
  }
}
