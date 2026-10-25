import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSupportTicketById } from "@/services/support-ticket.service";
import type { Role } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const role = (authSession.user.role as Role) || "CUSTOMER";
    const ticket = await getSupportTicketById(id, authSession.user.id, role);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Support ticket not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch support ticket",
      },
      { status: 403 }
    );
  }
}
