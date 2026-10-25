import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createSupportTicket, getCustomerTickets } from "@/services/support-ticket.service";
import type { TicketPriority } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view support tickets." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10;

    const result = await getCustomerTickets(
      authSession.user.id,
      isNaN(page) ? 1 : page,
      isNaN(limit) ? 10 : limit
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch support tickets",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({ headers: reqHeaders });

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to create a support ticket." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, subject, description, priority } = body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject and description are required." },
        { status: 400 }
      );
    }

    const ticket = await createSupportTicket({
      userId: authSession.user.id,
      orderId: orderId || undefined,
      subject: subject.trim(),
      description: description.trim(),
      priority: (priority as TicketPriority) || "NORMAL",
    });

    return NextResponse.json({
      success: true,
      message: `Support inquiry ${ticket.ticketNumber} opened. Concierge desk notified.`,
      ticket,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create support ticket",
      },
      { status: 400 }
    );
  }
}
