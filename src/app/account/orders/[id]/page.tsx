"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  XCircle,
  Printer,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { OrderWithDetails } from "@/types/order";

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();

        if (res.ok && data.success && data.order) {
          setOrder(data.order);
        } else {
          setError(data.error || "Order not found.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order.");
      }

      setOrder(data.order);
      setShowCancelModal(false);
      setActionMessage("Order has been successfully cancelled and allocated stock released.");
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Error encountered while cancelling."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-cream-50">
        <div className="w-10 h-10 border-2 border-charcoal-300 border-t-charcoal-900 rounded-full animate-spin mb-4" />
        <p className="text-sm font-serif text-charcoal-700">Loading Order Details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4 bg-cream-50">
        <h1 className="text-2xl font-serif text-charcoal-900">Order Not Available</h1>
        <p className="text-sm text-charcoal-700">{error}</p>
        <div className="pt-4">
          <Link href="/account/orders">
            <Button variant="primary" size="md">
              Return to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEligibleForCancel = ["PENDING", "AWAITING_PAYMENT", "PAID"].includes(
    order.status
  );

  return (
    <div className="bg-cream-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/account/orders"
            className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-700 hover:text-charcoal-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> All Orders
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs uppercase tracking-wider text-charcoal-700"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Invoice
          </Button>
        </div>

        {actionMessage && (
          <div className="p-4 bg-cream-100 border border-cream-300 rounded-sm text-sm text-charcoal-900">
            {actionMessage}
          </div>
        )}

        {/* Overview Header */}
        <div className="bg-white p-6 sm:p-8 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-charcoal-700">
              Order Reference
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900 font-medium">
              {order.orderNumber}
            </h1>
            <div className="text-xs text-charcoal-700 mt-1">
              Placed on{" "}
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
              {order.status}
            </span>

            {isEligibleForCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50"
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full p-6 rounded-sm shadow-luxury space-y-4">
              <div className="flex items-center justify-between border-b border-cream-200 pb-3">
                <h3 className="font-serif text-lg text-charcoal-900">Cancel Commission</h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-charcoal-700 leading-relaxed">
                Cancelling will release the allocated creations back to the atelier inventory. If
                already paid, a refund will be registered to your payment account.
              </p>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs"
                >
                  <option value="">Select a reason...</option>
                  <option value="Changed mind on size or styling">
                    Changed mind on size or styling
                  </option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Delivery timeframe does not fit schedule">
                    Delivery timeframe does not fit schedule
                  </option>
                  <option value="Other client circumstance">Other client circumstance</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                >
                  Keep Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="bg-rose-700 hover:bg-rose-800 text-white"
                >
                  {isCancelling ? "Processing..." : "Confirm Cancellation"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping & Shipment */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-charcoal-700" /> Delivery Address
            </h2>

            {order.shippingAddress ? (
              <div className="text-sm text-charcoal-700 space-y-1">
                <div className="font-medium text-charcoal-900">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </div>
                {order.shippingAddress.company && <div>{order.shippingAddress.company}</div>}
                <div>{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                <div>
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.stateOrProvince} {order.shippingAddress.postalCode}
                </div>
                <div className="font-medium text-charcoal-900">{order.shippingAddress.country}</div>
              </div>
            ) : (
              <div className="text-xs text-charcoal-400">No address recorded.</div>
            )}

            {order.shipments.length > 0 && (
              <div className="pt-3 border-t border-cream-200">
                <div className="text-xs uppercase tracking-wider text-charcoal-700 font-medium mb-1">
                  Tracking Details
                </div>
                <div className="text-xs text-charcoal-800">
                  Carrier: <span className="font-medium">{order.shipments[0].carrier}</span>
                </div>
                <div className="text-xs text-charcoal-800 font-mono mt-0.5">
                  Tracking #: {order.shipments[0].trackingNumber}
                </div>
              </div>
            )}
          </div>

          {/* Payment & Billing */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2">
              Payment & Settlement
            </h2>

            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-charcoal-700">Payment Status:</span>
                <span className="font-medium text-charcoal-900">{order.paymentStatus}</span>
              </div>

              {order.payments.length > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-charcoal-700">Gateway Provider:</span>
                    <span className="font-medium text-charcoal-900">{order.payments[0].provider}</span>
                  </div>
                  {order.payments[0].paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-charcoal-700">Method:</span>
                      <span className="font-medium text-charcoal-900">
                        {order.payments[0].cardBrand || order.payments[0].paymentMethod}{" "}
                        {order.payments[0].cardLast4 && `(•••• ${order.payments[0].cardLast4})`}
                      </span>
                    </div>
                  )}
                  {order.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-charcoal-700">Settled At:</span>
                      <span className="text-charcoal-900">
                        {new Date(order.paidAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Item Snapshots */}
        <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-200">
            <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900">
              Commission Items ({order.items.length})
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="relative w-16 h-20 bg-cream-100 flex-shrink-0 border border-cream-200 rounded-xs overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-charcoal-400 font-serif">
                        NXR
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-charcoal-900 truncate">
                      {item.productTitle}
                    </h3>
                    <div className="text-xs text-charcoal-700 mt-0.5">{item.variantTitle}</div>
                    <div className="text-xs font-mono text-charcoal-700 mt-1">SKU: {item.sku}</div>
                    <div className="text-xs text-charcoal-700 mt-0.5">Quantity: {item.quantity}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-charcoal-900">
                    {formatPrice(item.subtotalInCents)}
                  </div>
                  <div className="text-xs text-charcoal-700">
                    {formatPrice(item.priceInCents)} each
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-cream-50 p-6 border-t border-cream-200 space-y-2 text-sm">
            <div className="flex justify-between text-charcoal-700">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between text-charcoal-700">
              <span>Shipping Tier ({order.shippingMethod})</span>
              <span>
                {order.shippingInCents === 0 ? "Complimentary" : formatPrice(order.shippingInCents)}
              </span>
            </div>
            <div className="flex justify-between text-charcoal-700">
              <span>Estimated Tax & Duty</span>
              <span>{formatPrice(order.taxInCents)}</span>
            </div>
            <div className="flex justify-between text-base font-serif text-charcoal-900 pt-3 border-t border-cream-200 font-medium">
              <span>Total Paid</span>
              <span className="font-sans">{formatPrice(order.totalInCents)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
