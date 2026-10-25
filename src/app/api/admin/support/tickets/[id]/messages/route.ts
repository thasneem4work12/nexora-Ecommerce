import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { addTicketMessage } from "@/services/support-ticket.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminApi("MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { message, isInternalNote = false } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const ticketMessage = await addTicketMessage({
      ticketId: id,
      senderId: admin.user.id,
      senderRole: admin.user.role,
      message: message.trim(),
      isInternalNote: Boolean(isInternalNote),
    });

    return NextResponse.json({
      success: true,
      message: isInternalNote ? "Internal staff note recorded." : "Response dispatched to customer.",
      ticketMessage,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post message",
      },
      { status: 400 }
    );
  }
}
