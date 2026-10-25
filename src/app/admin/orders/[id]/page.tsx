import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminOrderById } from "@/services/admin-order.service";
import { formatPrice } from "@/lib/utils";
import { OrderManagementControls } from "@/components/admin/OrderManagementControls";
import {
  ArrowLeft,
  MapPin,
  Layers,
  History,
} from "lucide-react";

export const metadata = {
  title: "Order Command Details — NEXORA Admin",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageSession("VIEW_ORDERS");
  const { id } = await params;

  const order = await getAdminOrderById(id);
  if (!order) {
    notFound();
  }

  const clientName =
    order.user?.name ||
    order.guestName ||
    order.shippingAddress?.firstName + " " + order.shippingAddress?.lastName;
  const clientEmail = order.user?.email || order.guestEmail;

  return (
    <div className="space-y-8">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-700 hover:text-charcoal-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
        </Link>
      </div>

      {/* Overview Header */}
      <div className="bg-white p-6 sm:p-8 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-charcoal-700">
            Order Reference
          </div>
          <h1 className="text-3xl font-serif text-charcoal-900 font-medium">
            {order.orderNumber}
          </h1>
          <div className="text-xs text-charcoal-700 mt-1">
            Registered on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-xs uppercase tracking-wider text-charcoal-700">Total Settled</div>
            <div className="text-xl font-serif font-medium text-charcoal-900">
              {formatPrice(order.totalInCents)}
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-medium ${
              order.paymentStatus === "PAID"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            Payment: {order.paymentStatus}
          </span>

          <span
            className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-medium ${
              order.status === "PAID"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : order.status === "SHIPPED"
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : order.status === "CANCELLED"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            Fulfillment: {order.status}
          </span>
        </div>
      </div>

      {/* Interactive Controls (Status update + Shipment dispatch) */}
      <OrderManagementControls order={order} />

      {/* Customer & Addresses Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Profile */}
        <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2">
            Client Profile
          </h2>
          <div className="text-xs space-y-1.5 text-charcoal-700">
            <div>
              <span className="text-charcoal-500">Name:</span>{" "}
              <strong className="text-charcoal-900">{clientName}</strong>
            </div>
            <div>
              <span className="text-charcoal-500">Email:</span> {clientEmail}
            </div>
            <div>
              <span className="text-charcoal-500">Account Type:</span>{" "}
              {order.userId ? (
                <span className="text-emerald-700 font-medium">Registered Patron</span>
              ) : (
                <span className="text-charcoal-600">Guest Checkout</span>
              )}
            </div>
            {order.shippingAddress?.phone && (
              <div>
                <span className="text-charcoal-500">Phone:</span> {order.shippingAddress.phone}
              </div>
            )}
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-charcoal-700" /> Shipping Destination
          </h2>
          {order.shippingAddress ? (
            <div className="text-xs text-charcoal-700 space-y-0.5">
              <div className="font-medium text-charcoal-900">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </div>
              {order.shippingAddress.company && <div>{order.shippingAddress.company}</div>}
              <div>{order.shippingAddress.addressLine1}</div>
              {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.stateOrProvince}{" "}
                {order.shippingAddress.postalCode}
              </div>
              <div className="font-medium text-charcoal-900">{order.shippingAddress.country}</div>
              <div className="text-charcoal-500 pt-1">
                Tier: <strong className="text-charcoal-800">{order.shippingMethod}</strong>
              </div>
            </div>
          ) : (
            <div className="text-xs text-charcoal-400">No destination record available.</div>
          )}
        </div>

        {/* Billing Address */}
        <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2">
            Billing Address
          </h2>
          {order.billingAddress ? (
            <div className="text-xs text-charcoal-700 space-y-0.5">
              <div className="font-medium text-charcoal-900">
                {order.billingAddress.firstName} {order.billingAddress.lastName}
              </div>
              <div>{order.billingAddress.addressLine1}</div>
              <div>
                {order.billingAddress.city}, {order.billingAddress.postalCode}
              </div>
              <div>{order.billingAddress.country}</div>
            </div>
          ) : (
            <div className="text-xs text-charcoal-400 italic">Identical to shipping address.</div>
          )}
        </div>
      </div>

      {/* Item Snapshots Table */}
      <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900">
            Immutable Purchased Line Items ({order.items.length})
          </h2>
          <span className="text-[11px] text-charcoal-700 italic">
            Snapshots recorded at time of checkout
          </span>
        </div>

        <div className="divide-y divide-cream-100">
          {order.items.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="relative w-14 h-18 bg-cream-100 flex-shrink-0 border border-cream-200 rounded-xs overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-charcoal-400 font-serif">
                      NXR
                    </div>
                  )}
                </div>

                <div className="min-w-0 text-xs">
                  <h3 className="font-medium text-charcoal-900 text-sm">{item.productTitle}</h3>
                  <div className="text-charcoal-700 mt-0.5">{item.variantTitle}</div>
                  <div className="font-mono text-charcoal-700 mt-1">SKU: {item.sku}</div>
                  <div className="text-charcoal-700 mt-0.5">Quantity: {item.quantity}</div>
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="font-medium text-charcoal-900 text-sm">
                  {formatPrice(item.subtotalInCents)}
                </div>
                <div className="text-charcoal-700">{formatPrice(item.priceInCents)} each</div>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="bg-cream-50 p-6 border-t border-cream-200 space-y-2 text-xs">
          <div className="flex justify-between text-charcoal-700">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalInCents)}</span>
          </div>
          <div className="flex justify-between text-charcoal-700">
            <span>Shipping ({order.shippingMethod})</span>
            <span>
              {order.shippingInCents === 0 ? "Complimentary" : formatPrice(order.shippingInCents)}
            </span>
          </div>
          <div className="flex justify-between text-charcoal-700">
            <span>Tax & Import Excise</span>
            <span>{formatPrice(order.taxInCents)}</span>
          </div>
          <div className="flex justify-between text-sm font-serif text-charcoal-900 pt-3 border-t border-cream-200 font-medium">
            <span>Total Value</span>
            <span className="font-sans">{formatPrice(order.totalInCents)}</span>
          </div>
        </div>
      </div>

      {/* Stock Reservations & Payments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Reservations */}
        <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-charcoal-700" /> Stock Reservation Records
          </h2>

          <div className="space-y-3">
            {order.stockReservations.map((res) => (
              <div key={res.id} className="p-3 bg-cream-50 border border-cream-200 rounded-xs text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-charcoal-900">
                    SKU: {res.variant?.sku || res.variantId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${
                      res.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800"
                        : res.status === "RELEASED"
                        ? "bg-charcoal-100 text-charcoal-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {res.status}
                  </span>
                </div>
                <div className="text-charcoal-700">
                  Reserved Qty: <strong className="text-charcoal-900">{res.quantity}</strong>
                </div>
                <div className="text-charcoal-500 text-[11px] mt-0.5">
                  Expires: {new Date(res.expiresAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payments & Events Audit */}
        <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
          <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
            <History className="w-4 h-4 text-charcoal-700" /> Payment & Webhook Audit Log
          </h2>

          <div className="space-y-3">
            {order.payments.length === 0 ? (
              <div className="text-xs text-charcoal-400">No payment transaction records.</div>
            ) : (
              order.payments.map((p) => (
                <div key={p.id} className="p-3 bg-cream-50 border border-cream-200 rounded-xs text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-charcoal-900">{p.provider} Gateway</span>
                    <span className="font-semibold text-charcoal-900">{p.status}</span>
                  </div>
                  <div className="text-charcoal-700">
                    Amount: {formatPrice(p.amountInCents)} {p.currency}
                  </div>
                  {p.providerPaymentId && (
                    <div className="font-mono text-[11px] text-charcoal-600">
                      ID: {p.providerPaymentId}
                    </div>
                  )}

                  {/* Webhook Events */}
                  {p.events && p.events.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-cream-200 text-[11px] space-y-1">
                      <div className="text-charcoal-500 uppercase tracking-wider text-[10px]">
                        Webhook Events ({p.events.length}):
                      </div>
                      {p.events.map((evt: { id: string; eventType: string; createdAt: Date }) => (
                        <div key={evt.id} className="flex justify-between text-charcoal-700">
                          <span className="font-mono">{evt.eventType}</span>
                          <span className="text-charcoal-500">
                            {new Date(evt.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
