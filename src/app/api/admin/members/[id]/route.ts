import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-auth";

/**
 * DELETE /api/admin/members/[id]
 * Removes a member from the active business or revokes a pending invitation.
 * Prevents removing the sole OWNER of a business.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await requireAdminApi(request, "MANAGE_MEMBERS");
    const { user, businessId, businessRole, isSuperAdmin } = adminContext;
    const { id } = await params;

    // Check if ID is a membership
    const member = await prisma.businessMember.findFirst({
      where: { id, businessId },
      include: { user: true },
    });

    if (member) {
      // Sole owner guard
      if (member.role === "OWNER") {
        const ownerCount = await prisma.businessMember.count({
          where: { businessId, role: "OWNER" },
        });

        if (ownerCount <= 1) {
          return NextResponse.json(
            { success: false, error: "Cannot remove the sole Owner of a business. Transfer ownership first." },
            { status: 400 }
          );
        }

        // Only an OWNER or SUPERADMIN can remove another OWNER
        if (businessRole !== "OWNER" && !isSuperAdmin) {
          return NextResponse.json(
            { success: false, error: "Unauthorized: Only Owners can remove an Owner." },
            { status: 403 }
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.businessMember.delete({
          where: { id: member.id },
        });

        await tx.businessAuditLog.create({
          data: {
            businessId,
            userId: user.id,
            action: "MEMBER_REMOVED",
            details: {
              removedUserId: member.userId,
              removedUserEmail: member.user.email,
              removedUserRole: member.role,
              removerEmail: user.email,
            },
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Member ${member.user.name || member.user.email} removed from store.`,
      });
    }

    // Check if ID is an invitation
    const invitation = await prisma.businessInvitation.findFirst({
      where: { id, businessId },
    });

    if (invitation) {
      await prisma.$transaction(async (tx) => {
        await tx.businessInvitation.delete({
          where: { id: invitation.id },
        });

        await tx.businessAuditLog.create({
          data: {
            businessId,
            userId: user.id,
            action: "INVITATION_REVOKED",
            details: {
              revokedEmail: invitation.email,
              revokedRole: invitation.role,
              revokerEmail: user.email,
            },
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Invitation for ${invitation.email} has been revoked.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Member or invitation not found." },
      { status: 404 }
    );
  } catch (error) {
    console.error("[API Member DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to remove member." },
      { status: 500 }
    );
  }
}
