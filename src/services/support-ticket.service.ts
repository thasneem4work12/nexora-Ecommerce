import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";
import type { TicketStatus, TicketPriority, Role, Prisma } from "@prisma/client";
import { notifySupportTicketReply } from "./notification.service";

export interface CreateTicketInput {
  userId: string;
  orderId?: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  businessId?: string;
}

export interface AddTicketMessageInput {
  ticketId: string;
  senderId: string;
  senderRole: Role;
  message: string;
  isInternalNote?: boolean;
  businessId?: string;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  adminUserId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedStaffId?: string | null;
  businessId?: string;
}

/**
 * Creates a new support ticket for a customer, optionally linked to an order.
 */
export async function createSupportTicket(input: CreateTicketInput) {
  const { userId, orderId, subject, description, priority = "NORMAL", businessId } = input;

  if (!subject.trim() || !description.trim()) {
    throw new Error("Subject and description are required.");
  }

  let resolvedBusinessId = businessId || DEFAULT_BUSINESS_ID;

  // If orderId is provided, verify it belongs to the customer and get its businessId
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, businessId: true },
    });
    if (!order || order.userId !== userId) {
      throw new Error("Specified order does not exist or does not belong to your account.");
    }
    resolvedBusinessId = order.businessId;
  }

  const ticketNumber = `TCK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        businessId: resolvedBusinessId,
        ticketNumber,
        userId,
        orderId: orderId || null,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: "OPEN",
      },
    });

    // Create initial message
    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        senderRole: "CUSTOMER",
        message: description.trim(),
        isInternalNote: false,
      },
    });

    return ticket;
  });
}

/**
 * Adds a message to an existing support ticket.
 * Enforces customer isolation: customers cannot post to or view other customers' tickets.
 * Handles internal staff-only notes.
 */
export async function addTicketMessage(input: AddTicketMessageInput) {
  const { ticketId, senderId, senderRole, message, isInternalNote = false, businessId } = input;

  if (!message.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      throw new Error(`Support ticket not found: ${ticketId}`);
    }

    if (businessId && ticket.businessId !== businessId) {
      throw new Error("Access denied: Support ticket does not belong to the active business.");
    }

    // Customer security guard
    if (senderRole === "CUSTOMER") {
      if (ticket.userId !== senderId) {
        throw new Error("Unauthorized: You can only message your own support tickets.");
      }
      if (isInternalNote) {
        throw new Error("Unauthorized: Customers cannot create internal notes.");
      }
    }

    const ticketMessage = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId,
        senderRole,
        message: message.trim(),
        isInternalNote: senderRole !== "CUSTOMER" ? isInternalNote : false,
      },
    });

    // Update ticket status
    let nextStatus = ticket.status;
    if (senderRole === "CUSTOMER" && ticket.status === "WAITING_FOR_CUSTOMER") {
      nextStatus = "IN_PROGRESS";
    } else if (senderRole !== "CUSTOMER" && !isInternalNote && ticket.status === "OPEN") {
      nextStatus = "WAITING_FOR_CUSTOMER";
    }

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        updatedAt: new Date(),
      },
    });

    // Send transactional notification if staff responded publicly to customer
    if (senderRole !== "CUSTOMER" && !isInternalNote && ticket.userId) {
      await notifySupportTicketReply(
        ticket.id,
        ticket.userId,
        ticket.ticketNumber,
        senderRole,
        message.trim().slice(0, 100)
      );
    }

    return ticketMessage;
  });
}

/**
 * Updates support ticket administrative attributes (status, priority, assigned staff).
 */
export async function updateTicketAttributes(input: UpdateTicketStatusInput) {
  const { ticketId, status, priority, assignedStaffId, businessId } = input;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error(`Support ticket not found: ${ticketId}`);
  }

  if (businessId && ticket.businessId !== businessId) {
    throw new Error("Access denied: Support ticket does not belong to the active business.");
  }

  return await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: status !== undefined ? status : ticket.status,
      priority: priority !== undefined ? priority : ticket.priority,
      assignedStaffId: assignedStaffId !== undefined ? assignedStaffId : ticket.assignedStaffId,
    },
  });
}

/**
 * Retrieves a single support ticket by ID with message history.
 * Masks internal notes if the requesting user is a customer.
 */
export async function getSupportTicketById(
  ticketId: string,
  requestingUserIdOrBusinessId?: string,
  requestingRole?: Role,
  businessIdArg?: string
) {
  let requestingUserId = requestingUserIdOrBusinessId;
  let businessId = businessIdArg;

  // Support direct tenant lookup overload: getSupportTicketById(ticketId, businessId)
  if (!businessId && requestingRole === undefined && requestingUserIdOrBusinessId) {
    businessId = requestingUserIdOrBusinessId;
    requestingUserId = undefined;
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      order: { select: { id: true, orderNumber: true, status: true, totalInCents: true } },
      user: { select: { id: true, name: true, email: true } },
      assignedStaff: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!ticket) {
    return null;
  }

  if (businessId && ticket.businessId !== businessId) {
    return null;
  }

  // Customer authorization check
  if (requestingRole === "CUSTOMER" && ticket.userId !== requestingUserId) {
    throw new Error("Unauthorized: You do not have access to this support ticket.");
  }

  // Filter out internal notes for customer view
  const visibleMessages = requestingRole === "CUSTOMER"
    ? ticket.messages.filter((m) => !m.isInternalNote)
    : ticket.messages;

  return {
    ...ticket,
    messages: visibleMessages,
  };
}

/**
 * Lists tickets with filtering and pagination.
 */
export async function getCustomerTickets(userId: string, page = 1, limit = 10, businessId?: string) {
  const skip = (Math.max(1, page) - 1) * limit;

  const where = {
    userId,
    ...(businessId ? { businessId } : {}),
  };

  const [total, tickets] = await prisma.$transaction([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        order: { select: { id: true, orderNumber: true } },
        _count: { select: { messages: { where: { isInternalNote: false } } } },
      },
    }),
  ]);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lists tickets for admin staff with filters.
 */
export async function getAdminTickets(params: {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedStaffId?: string;
  search?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.SupportTicketWhereInput = {};
  if (params.businessId) where.businessId = params.businessId;
  if (params.status) where.status = params.status;
  if (params.priority) where.priority = params.priority;
  if (params.assignedStaffId) where.assignedStaffId = params.assignedStaffId;
  if (params.search) {
    where.OR = [
      { ticketNumber: { contains: params.search, mode: "insensitive" } },
      { subject: { contains: params.search, mode: "insensitive" } },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
      { user: { email: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [total, tickets] = await prisma.$transaction([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
