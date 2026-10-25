"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Printer,
  Truck,
  ExternalLink,
  LifeBuoy,
  RotateCcw,
  CheckCircle2,
  Clock,
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

  // Return request state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

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
      setActionMessage("Cancellation processed successfully.");
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Error encountered while cancelling."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReturn(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/orders/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: returnItemId || undefined,
          requestedQuantity: returnQuantity,
          reason: returnReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit return request.");
      }

      setShowReturnModal(false);
      setActionMessage(
        `Return request ${data.returnRequest.returnNumber} submitted for atelier review.`
      );
      // Reload order
      const reload = await fetch(`/api/orders/${id}`);
      const d = await reload.json();
      if (d.success) setOrder(d.order);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Error submitting return.");
    } finally {
      setIsSubmittingReturn(false);
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

  const isEligibleForCancellation =
    (order.status === "PENDING" || order.status === "AWAITING_PAYMENT" || order.status === "PAID") &&
    order.fulfillmentStatus !== "SHIPPED" &&
    order.fulfillmentStatus !== "DELIVERED" &&
    !order.cancellationRequested;

  const isEligibleForReturn =
    order.status === "DELIVERED" || order.fulfillmentStatus === "DELIVERED";

  const shipment = order.shipments[0];

  return (
    <div className="min-h-screen bg-cream-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/account/orders"
            className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-700 hover:text-charcoal-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
          </Link>

          <div className="flex items-center gap-3">
            <Link href={`/account/support?orderId=${order.id}`}>
              <Button variant="outline" size="sm" className="text-xs uppercase flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" /> Concierge Help
              </Button>
            </Link>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-1.5 border border-cream-300 rounded-sm text-xs uppercase tracking-wider text-charcoal-700 hover:bg-white"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Receipt
            </button>
          </div>
        </div>

        {/* Action alert message */}
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm">
            {actionMessage}
          </div>
        )}

        {/* Order Overview Header Card */}
        <div className="bg-white p-6 sm:p-8 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream-200 pb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-charcoal-700">Commission Record</span>
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

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  order.paymentStatus === "PAID"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {order.paymentStatus}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  order.status === "DELIVERED"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : order.status === "SHIPPED"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : order.status === "CANCELLED"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-charcoal-100 text-charcoal-800 border border-cream-300"
                }`}
              >
                {order.status.replace(/_/g, " ")}
              </span>

              {isEligibleForCancellation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs uppercase text-rose-700 border-rose-300 hover:bg-rose-50 ml-2"
                >
                  Cancel Order
                </Button>
              )}

              {isEligibleForReturn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReturnModal(true)}
                  className="text-xs uppercase text-charcoal-900 border-charcoal-300 hover:bg-cream-100 ml-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Request Return
                </Button>
              )}
            </div>
          </div>

          {/* Delivery & Fulfillment Progress Timeline */}
          <div className="pt-8">
            <h3 className="text-xs uppercase tracking-wider text-charcoal-700 font-medium mb-6">
              Fulfillment & Delivery Progress
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                className={`p-4 border rounded-sm ${
                  order.status !== "PENDING"
                    ? "bg-cream-100 border-charcoal-900 text-charcoal-900"
                    : "bg-white border-cream-200 text-charcoal-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-semibold uppercase tracking-wider">1. Registered</span>
                </div>
                <p className="text-[11px] text-charcoal-700">Order recorded in atelier</p>
              </div>

              <div
                className={`p-4 border rounded-sm ${
                  order.paymentStatus === "PAID"
                    ? "bg-cream-100 border-charcoal-900 text-charcoal-900"
                    : "bg-white border-cream-200 text-charcoal-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {order.paymentStatus === "PAID" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-700" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider">2. Workshop</span>
                </div>
                <p className="text-[11px] text-charcoal-700">Payment verified & tailored</p>
              </div>

              <div
                className={`p-4 border rounded-sm ${
                  order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED"
                    ? "bg-cream-100 border-charcoal-900 text-charcoal-900"
                    : "bg-white border-cream-200 text-charcoal-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED" ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  ) : (
                    <Truck className="w-4 h-4 text-charcoal-400" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider">3. Dispatched</span>
                </div>
                <p className="text-[11px] text-charcoal-700">En route with courier</p>
              </div>

              <div
                className={`p-4 border rounded-sm ${
                  order.status === "DELIVERED"
                    ? "bg-cream-100 border-charcoal-900 text-charcoal-900"
                    : "bg-white border-cream-200 text-charcoal-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {order.status === "DELIVERED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <MapPin className="w-4 h-4 text-charcoal-400" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider">4. Delivered</span>
                </div>
                <p className="text-[11px] text-charcoal-700">Safely arrived at destination</p>
              </div>
            </div>

            {/* Courier Tracking Link Banner */}
            {shipment && shipment.trackingNumber && (
              <div className="mt-6 p-4 bg-cream-100 border border-cream-300 rounded-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-charcoal-700" />
                  <div>
                    <div className="text-xs font-medium text-charcoal-900">
                      Dispatched via {shipment.carrier}
                    </div>
                    <div className="text-[11px] text-charcoal-700 font-mono">
                      Tracking / Waybill: {shipment.trackingNumber}
                    </div>
                  </div>
                </div>

                {shipment.trackingUrl ? (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-charcoal-900 text-white rounded-sm text-xs uppercase tracking-wider hover:bg-black"
                  >
                    Track Consignment <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                ) : (
                  <span className="text-xs text-charcoal-700 italic">
                    Contact courier directly with waybill code
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 max-w-md w-full rounded-sm shadow-luxury space-y-4">
              <h3 className="text-lg font-serif text-charcoal-900">Cancel Reservation</h3>
              <p className="text-xs text-charcoal-700 leading-relaxed">
                Cancelling will release the allocated creations back to the atelier inventory. If
                already paid, a refund reconciliation will be registered.
              </p>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs"
              >
                <option value="">Select a reason...</option>
                <option value="Changed mind on size or styling">Changed mind on size or styling</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Delivery timeframe does not fit schedule">Delivery timeframe does not fit schedule</option>
                <option value="Other client circumstance">Other client circumstance</option>
              </select>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
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

        {/* Return Request Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleReturnSubmit}
              className="bg-white p-6 max-w-md w-full rounded-sm shadow-luxury space-y-4"
            >
              <h3 className="text-lg font-serif text-charcoal-900">Request Atelier Return</h3>
              <p className="text-xs text-charcoal-700">
                Please specify the piece you wish to return and the reason for our quality inspection team.
              </p>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                  Select Item
                </label>
                <select
                  value={returnItemId}
                  onChange={(e) => setReturnItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs"
                >
                  <option value="">All items in commission</option>
                  {order.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.productTitle} — {item.variantTitle} (Qty: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                  Return Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                  Reason for Return *
                </label>
                <textarea
                  required
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Sizing requires adjustment, slight color variation under gallery lighting..."
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmittingReturn || !returnReason.trim()}
                >
                  {isSubmittingReturn ? "Submitting..." : "Submit Return Request"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Two-Column Cards: Delivery Address & Settlement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {order.shippingAddress.city}, {order.shippingAddress.stateOrProvince}{" "}
                  {order.shippingAddress.postalCode}
                </div>
                <div className="font-medium text-charcoal-900">{order.shippingAddress.country}</div>
              </div>
            ) : (
              <div className="text-xs text-charcoal-400">No address recorded.</div>
            )}
          </div>

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

        {/* Items List */}
        <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-200">
            <h2 className="text-xs uppercase tracking-wider font-medium text-charcoal-900">
              Purchased Creations ({order.items.length})
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="relative w-16 h-20 bg-cream-100 flex-shrink-0 border border-cream-200 rounded-xs overflow-hidden">
                    <Image
                      src={item.imageUrl || "/placeholder-luxury.jpg"}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-medium text-charcoal-900">
                      {item.productTitle}
                    </h4>
                    <p className="text-xs text-charcoal-700 mt-0.5">
                      {item.variantTitle} &bull; Qty: {item.quantity}
                    </p>
                    <p className="text-[11px] font-mono text-charcoal-400 mt-0.5">
                      SKU: {item.sku}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif text-sm font-medium text-charcoal-900">
                    {formatPrice(item.subtotalInCents)}
                  </div>
                  <div className="text-[11px] text-charcoal-700 mt-0.5">
                    {formatPrice(item.priceInCents)} each
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-cream-50 p-6 border-t border-cream-200 space-y-2">
            <div className="flex justify-between text-xs text-charcoal-700">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-charcoal-700">
              <span>Shipping ({order.shippingMethod})</span>
              <span>{order.shippingInCents === 0 ? "Complimentary" : formatPrice(order.shippingInCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-charcoal-700">
              <span>Estimated Tax</span>
              <span>{formatPrice(order.taxInCents)}</span>
            </div>
            <div className="flex justify-between text-base font-serif font-medium text-charcoal-900 pt-2 border-t border-cream-200">
              <span>Total Settled</span>
              <span>{formatPrice(order.totalInCents)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
