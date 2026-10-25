import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { addTicketMessage } from "@/services/support-ticket.service";
import type { Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to reply to ticket." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const role = (authSession.user.role as Role) || "CUSTOMER";

    const ticketMessage = await addTicketMessage({
      ticketId: id,
      senderId: authSession.user.id,
      senderRole: role,
      message: message.trim(),
      isInternalNote: false,
    });

    return NextResponse.json({
      success: true,
      message: "Reply dispatched to ticket.",
      ticketMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post message",
      },
      { status: 400 }
    );
  }
}
