"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useStoreTenant } from "@/context/StoreTenantContext";
import type { OrderWithDetails } from "@/types/order";

function CheckoutSuccessContent() {
  const { basePath } = useStoreTenant();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const mockSuccess = searchParams.get("mock_success") === "true";

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order reference provided.");
      setLoading(false);
      return;
    }

    async function loadAndProcessOrder() {
      try {
        // If mock payment test success flag is present, trigger test webhook simulation
        if (mockSuccess) {
          await fetch("/api/webhooks/payment/mock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-mock-signature": "simulate_dev_client", // In dev mock handler
            },
            body: JSON.stringify({
              orderId,
              status: "PAID",
              amountInCents: 0, // Server cross-references order.totalInCents
              eventType: "payment.succeeded",
            }),
          }).catch(() => {});
        }

        // Fetch authoritative order details
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (res.ok && data.success && data.order) {
          setOrder(data.order);
        } else {
          setError(data.error || "Failed to load order details.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error retrieving order.");
      } finally {
        setLoading(false);
      }
    }

    loadAndProcessOrder();
  }, [orderId, mockSuccess]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-cream-50">
        <div className="w-12 h-12 border-2 border-charcoal-300 border-t-charcoal-900 rounded-full animate-spin mb-4" />
        <p className="text-sm font-serif text-charcoal-700 tracking-wider">
          Retrieving Atelier Commission Records...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 text-rose-700 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif text-charcoal-900">Order Record Inaccessible</h1>
        <p className="text-sm text-charcoal-700 leading-relaxed">{error}</p>
        <div className="pt-4">
          <Link href="/products">
            <Button variant="primary" size="md">
              Return to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";

  return (
    <div className="bg-cream-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header confirmation card */}
        <div className="bg-white p-8 sm:p-12 border border-cream-200 rounded-sm shadow-luxury text-center space-y-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              isPaid
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8" />
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900">
            {isPaid ? "Commission Confirmed & Authenticated" : "Order Placed — Awaiting Settlement"}
          </h1>

          <p className="text-sm text-charcoal-700 max-w-lg mx-auto leading-relaxed">
            Thank you for patronizing NEXORA Commerce. An official archival invoice and dispatch notification
            have been recorded for reference.
          </p>

          <div className="inline-flex items-center gap-3 bg-cream-50 border border-cream-200 px-4 py-2 rounded-sm text-sm">
            <span className="text-xs uppercase tracking-wider text-charcoal-700">Order Reference:</span>
            <span className="font-mono font-medium text-charcoal-900">{order.orderNumber}</span>
          </div>
        </div>

        {/* Two-column details: Status & Shipping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Panel */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-sm uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2">
              Fulfillment Status
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-charcoal-700">Order Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium ${
                    order.status === "PAID"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : order.status === "SHIPPED"
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-charcoal-700">Payment Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium ${
                    order.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-charcoal-700">Delivery Tier:</span>
                <span className="font-medium text-charcoal-900">{order.shippingMethod}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-charcoal-700">Order Date:</span>
                <span className="text-charcoal-900">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Destination Panel */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-sm uppercase tracking-wider font-medium text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-charcoal-700" /> Shipping Destination
            </h2>

            {order.shippingAddress ? (
              <div className="text-sm text-charcoal-700 leading-relaxed space-y-1">
                <div className="font-medium text-charcoal-900">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </div>
                {order.shippingAddress.company && <div>{order.shippingAddress.company}</div>}
                <div>{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                <div>
                  {order.shippingAddress.city}
                  {order.shippingAddress.stateOrProvince && `, ${order.shippingAddress.stateOrProvince}`}{" "}
                  {order.shippingAddress.postalCode}
                </div>
                <div className="font-medium text-charcoal-900">{order.shippingAddress.country}</div>
                {order.shippingAddress.phone && (
                  <div className="text-xs text-charcoal-700 pt-1">Tel: {order.shippingAddress.phone}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-charcoal-500 italic">No destination record available.</div>
            )}
          </div>
        </div>

        {/* Item Snapshots Table */}
        <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-200">
            <h2 className="text-sm uppercase tracking-wider font-medium text-charcoal-900">
              Purchased Creations ({order.items.length})
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
                      <div className="w-full h-full flex items-center justify-center text-charcoal-400 text-xs font-serif">
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

          {/* Financial Totals */}
          <div className="bg-cream-50 p-6 border-t border-cream-200 space-y-2 text-sm">
            <div className="flex justify-between text-charcoal-700">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between text-charcoal-700">
              <span>Shipping & Insured Courier</span>
              <span>
                {order.shippingInCents === 0 ? "Complimentary" : formatPrice(order.shippingInCents)}
              </span>
            </div>
            <div className="flex justify-between text-charcoal-700">
              <span>Duties & Taxes</span>
              <span>{formatPrice(order.taxInCents)}</span>
            </div>
            <div className="flex justify-between text-base font-serif text-charcoal-900 pt-3 border-t border-cream-200">
              <span>Total Settled</span>
              <span className="font-sans font-medium">{formatPrice(order.totalInCents)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex gap-4">
            <Link href="/account/orders">
              <Button variant="primary" size="md">
                View Account Orders <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href={`${basePath || ""}/products`}>
              <Button variant="outline" size="md">
                Continue Browsing
              </Button>
            </Link>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-charcoal-700"
          >
            <Printer className="w-4 h-4" /> Print Archival Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-charcoal-300 border-t-charcoal-900 rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
