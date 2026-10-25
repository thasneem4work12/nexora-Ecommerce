import React from "react";
import Link from "next/link";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminOrders, getAdminOrderMetrics } from "@/services/admin-order.service";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
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
  await requireAdminPageSession("VIEW_ORDERS");
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || undefined;
  const status = params.status || undefined;
  const paymentStatus = params.paymentStatus || undefined;

  const [result, metrics] = await Promise.all([
    getAdminOrders({
      search,
      status,
      paymentStatus,
      page: isNaN(page) ? 1 : page,
      limit: 15,
    }),
    getAdminOrderMetrics(),
  ]);

  const { orders, pagination } = result;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
          Orders & Client Commissions
        </h1>
        <p className="text-xs tracking-wider uppercase text-charcoal-700 mt-1">
          PostgreSQL Transactional Order Processing, Payment Verification & Logistics
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-serif font-medium text-charcoal-900">
            {formatPrice(metrics.totalRevenueInCents)}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-charcoal-700" />
          </div>
          <div className="text-xl font-serif font-medium text-charcoal-900">
            {metrics.totalOrders}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Settled & Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-serif font-medium text-emerald-800">
            {metrics.paidOrders}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Pending Fulfillment</span>
            <Package className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl font-serif font-medium text-amber-800">
            {metrics.pendingFulfillment}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Dispatched / Shipped</span>
            <Truck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-xl font-serif font-medium text-blue-800">
            {metrics.shippedOrders}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            href="/admin/orders"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              !status && !paymentStatus
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            All Orders
          </Link>
          <Link
            href="/admin/orders?paymentStatus=PAID"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              paymentStatus === "PAID"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Paid ({metrics.paidOrders})
          </Link>
          <Link
            href="/admin/orders?status=PROCESSING"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "PROCESSING"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Processing
          </Link>
          <Link
            href="/admin/orders?status=SHIPPED"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "SHIPPED"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Shipped
          </Link>
          <Link
            href="/admin/orders?status=PENDING"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "PENDING"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Pending
          </Link>
          <Link
            href="/admin/orders?status=CANCELLED"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "CANCELLED"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
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
              className="pl-9 pr-3 py-1.5 text-xs bg-cream-50 border border-cream-300 rounded-sm focus:outline-none focus:border-charcoal-900 w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-xs uppercase">
            Filter
          </Button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-charcoal-700 text-sm">
            No orders match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/60 border-b border-cream-200 uppercase tracking-wider text-charcoal-700 font-medium">
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
