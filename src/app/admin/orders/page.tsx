import React from "react";
import Link from "next/link";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminOrders, getAdminOrderMetrics } from "@/services/admin-order.service";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { GuidedTourTrigger } from "@/components/guidance/GuidedTourTrigger";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  ShoppingBag,
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Search,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Orders & Fulfillment — NEXORA Admin Command Center",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    page?: string;
  }>;
}) {
  const { businessId } = await requireAdminPageSession("VIEW_ORDERS");
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || undefined;
  const status = params.status || undefined;
  const paymentStatus = params.paymentStatus || undefined;

  const [result, metrics] = await Promise.all([
    getAdminOrders({
      businessId,
      search,
      status,
      paymentStatus,
      page: isNaN(page) ? 1 : page,
      limit: 15,
    }),
    getAdminOrderMetrics(businessId),
  ]);

  const { orders, pagination } = result;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Transactional Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900 mt-1">
            Orders & Client Commissions
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Real-time fulfillment pipeline, automated reservations, and financial settlements.
          </p>
        </div>

        <div>
          <GuidedTourTrigger tourId="order-management" label="Tour Orders" />
        </div>
      </div>

      {/* Metrics Row */}
      <div data-tour="orders-metrics" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-canvas-surface p-5 border border-border-default rounded-card shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-serif font-bold text-charcoal-900">
            {formatPrice(metrics.totalRevenueInCents)}
          </div>
        </div>

        <div className="bg-canvas-surface p-5 border border-border-default rounded-card shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-charcoal-500" />
          </div>
          <div className="text-xl font-serif font-bold text-charcoal-900">
            {metrics.totalOrders}
          </div>
        </div>

        <div className="bg-canvas-surface p-5 border border-border-default rounded-card shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Settled & Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-serif font-bold text-emerald-700">
            {metrics.paidOrders}
          </div>
        </div>

        <div className="bg-canvas-surface p-5 border border-border-default rounded-card shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Pending Fulfillment</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-serif font-bold text-amber-700">
            {metrics.pendingFulfillment}
          </div>
        </div>

        <div className="bg-canvas-surface p-5 border border-border-default rounded-card shadow-xs">
          <div className="flex items-center justify-between text-charcoal-500 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Dispatched</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-serif font-bold text-blue-700">
            {metrics.shippedOrders}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div data-tour="orders-filters" className="bg-canvas-surface p-4 border border-border-default rounded-card shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            href="/admin/orders"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              !status && !paymentStatus
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            All Orders
          </Link>
          <Link
            href="/admin/orders?paymentStatus=PAID"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              paymentStatus === "PAID"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            Paid ({metrics.paidOrders})
          </Link>
          <Link
            href="/admin/orders?status=PROCESSING"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              status === "PROCESSING"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            Processing
          </Link>
          <Link
            href="/admin/orders?status=SHIPPED"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              status === "SHIPPED"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            Shipped
          </Link>
          <Link
            href="/admin/orders?status=PENDING"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              status === "PENDING"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            Pending
          </Link>
          <Link
            href="/admin/orders?status=CANCELLED"
            className={`px-3 py-1.5 rounded-btn uppercase tracking-wider transition-colors ${
              status === "CANCELLED"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-canvas-secondary text-charcoal-600 hover:bg-canvas-secondary/80"
            }`}
          >
            Cancelled
          </Link>
        </div>

        {/* Search input form */}
        <form method="GET" action="/admin/orders" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {paymentStatus && <input type="hidden" name="paymentStatus" value={paymentStatus} />}
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search reference, email, client..."
              className="pl-9 pr-3 py-1.5 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze w-64 text-charcoal-900"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-xs uppercase">
            Filter
          </Button>
        </form>
      </div>

      {/* Orders Table */}
      <div data-tour="orders-table" className="bg-canvas-surface border border-border-default rounded-card shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-charcoal-500 text-sm font-light">
            No orders match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-secondary/50 border-b border-border-subtle uppercase tracking-wider text-charcoal-500 font-medium text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Delivery Tier</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {orders.map((order) => {
                  const clientName =
                    order.user?.name ||
                    order.guestName ||
                    order.shippingAddress?.firstName + " " + order.shippingAddress?.lastName;
                  const clientEmail = order.user?.email || order.guestEmail;

                  return (
                    <tr key={order.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-charcoal-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-700">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-charcoal-900">{clientName}</div>
                        <div className="text-[11px] text-charcoal-700">{clientEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-700">{order.shippingMethod}</td>
                      <td className="py-3.5 px-4 font-medium text-charcoal-900">
                        {formatPrice(order.totalInCents)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                            order.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : order.paymentStatus === "FAILED"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                            order.status === "PAID"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : order.status === "SHIPPED"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : order.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="text-[11px] py-1 px-2.5">
                            Manage <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-cream-200 flex items-center justify-between text-xs text-charcoal-700">
            <div>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} Total Orders)
            </div>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link
                  href={`/admin/orders?page=${pagination.page - 1}${
                    status ? `&status=${status}` : ""
                  }${search ? `&search=${search}` : ""}`}
                >
                  <Button variant="outline" size="sm" className="text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/admin/orders?page=${pagination.page + 1}${
                    status ? `&status=${status}` : ""
                  }${search ? `&search=${search}` : ""}`}
                >
                  <Button variant="outline" size="sm" className="text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
