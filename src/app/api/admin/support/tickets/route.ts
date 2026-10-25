import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getAdminTickets } from "@/services/support-ticket.service";
import type { TicketStatus, TicketPriority } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi("VIEW_ORDERS");

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") as TicketStatus) || undefined;
    const priority = (searchParams.get("priority") as TicketPriority) || undefined;
    const assignedStaffId = searchParams.get("assignedStaffId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getAdminTickets({
      status,
      priority,
      assignedStaffId,
      search,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin support tickets" },
      { status: 500 }
    );
  }
}
