import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getSupportTicketById, updateTicketAttributes } from "@/services/support-ticket.service";
import type { TicketStatus, TicketPriority } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, businessId } = await requireAdminApi(request, "VIEW_ORDERS");
    const { id } = await params;

    const ticket = await getSupportTicketById(id, user.id, user.role, businessId);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Support ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, businessId } = await requireAdminApi(request, "MANAGE_ORDERS");
    const { id } = await params;
    const body = await request.json();

    const { status, priority, assignedStaffId } = body;

    const updated = await updateTicketAttributes({
      ticketId: id,
      adminUserId: user.id,
      status: status as TicketStatus,
      priority: priority as TicketPriority,
      assignedStaffId,
      businessId,
    });

    return NextResponse.json({
      success: true,
      message: `Ticket ${updated.ticketNumber} attributes updated.`,
      ticket: updated,
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
        error: error instanceof Error ? error.message : "Failed to update ticket",
      },
      { status: 400 }
    );
  }
}
