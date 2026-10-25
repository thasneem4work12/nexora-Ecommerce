import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface GetAdminCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "newest" | "oldest" | "spend" | "orders";
}

/**
 * Retrieves paginated customer accounts with authoritatively computed PostgreSQL statistics.
 * Aggregates order count and total confirmed spend without mock figures.
 */
export async function getAdminCustomers(params: GetAdminCustomersParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
  };

  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: params.sortBy === "oldest" ? "asc" : "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalInCents: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            supportTickets: true,
          },
        },
      },
    }),
  ]);

  const customers = users.map((u) => {
    // Authoritative revenue calculation: only PAID orders that are not CANCELLED
    const completedOrders = u.orders.filter(
      (o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED"
    );

    const totalSpendInCents = completedOrders.reduce((sum, o) => sum + o.totalInCents, 0);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      ticketCount: u._count.supportTickets,
      totalSpendInCents,
      recentOrders: u.orders.slice(0, 3),
    };
  });

  // Sort in-memory if requested by spend or orders count
  if (params.sortBy === "spend") {
    customers.sort((a, b) => b.totalSpendInCents - a.totalSpendInCents);
  } else if (params.sortBy === "orders") {
    customers.sort((a, b) => b.orderCount - a.orderCount);
  }

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves a detailed customer profile for authorized store administrators.
 */
export async function getAdminCustomerById(customerId: string) {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    include: {
      addresses: {
        orderBy: { createdAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: true,
          shipments: true,
        },
      },
      supportTickets: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      returnRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!customer) {
    return null;
  }

  const completedOrders = customer.orders.filter(
    (o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED"
  );
  const totalSpendInCents = completedOrders.reduce((sum, o) => sum + o.totalInCents, 0);

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    role: customer.role,
    createdAt: customer.createdAt,
    totalSpendInCents,
    orderCount: customer.orders.length,
    addresses: customer.addresses,
    orders: customer.orders,
    supportTickets: customer.supportTickets,
    returnRequests: customer.returnRequests,
  };
}
