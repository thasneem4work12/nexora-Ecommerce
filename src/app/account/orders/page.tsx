import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { getCustomerOrderHistory } from "@/services/order.service";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Package, ArrowRight, Clock, CheckCircle2, Truck, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Order History — NEXORA Haute Couture",
  description: "View and manage your atelier commissions and dispatched orders.",
};

export default async function CustomerOrdersPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const orders = await getCustomerOrderHistory(session.user.id);

  return (
    <div className="bg-cream-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cream-200 pb-6">
          <div>
            <h1 className="text-3xl font-serif text-charcoal-900">Your Atelier Commissions</h1>
            <p className="text-sm text-charcoal-700 mt-1">
              Historical purchase records, dispatch statuses, and certificate details.
            </p>
          </div>
          <Link href="/account">
            <Button variant="outline" size="sm">
              Account Overview
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-12 border border-cream-200 rounded-sm shadow-luxury text-center space-y-4">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto text-charcoal-500">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-serif text-charcoal-900">No Orders Placed Yet</h2>
            <p className="text-sm text-charcoal-700 max-w-md mx-auto leading-relaxed">
              When you purchase garments or complications from the NEXORA collection, your
              exclusive order records will appear here.
            </p>
            <div className="pt-2">
              <Link href="/products">
                <Button variant="primary" size="md">
                  Browse Catalog
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const isPaid = order.paymentStatus === "PAID";
              const isShipped = order.status === "SHIPPED";
              const isCancelled = order.status === "CANCELLED";

              return (
                <div
                  key={order.id}
                  className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden"
                >
                  {/* Order Card Header */}
                  <div className="p-6 bg-cream-50/60 border-b border-cream-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="uppercase tracking-wider text-charcoal-700 block text-[10px]">
                          Order Placed
                        </span>
                        <span className="font-medium text-charcoal-900 text-sm">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="uppercase tracking-wider text-charcoal-700 block text-[10px]">
                          Total
                        </span>
                        <span className="font-medium text-charcoal-900 text-sm">
                          {formatPrice(order.totalInCents)}
                        </span>
                      </div>

                      <div>
                        <span className="uppercase tracking-wider text-charcoal-700 block text-[10px]">
                          Ship To
                        </span>
                        <span className="font-medium text-charcoal-900 text-sm">
                          {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="uppercase tracking-wider text-charcoal-700 block text-[10px]">
                          Reference
                        </span>
                        <span className="font-mono font-medium text-charcoal-900 text-sm">
                          {order.orderNumber}
                        </span>
                      </div>

                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Status & Preview items */}
                  <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        {isPaid && !isShipped && !isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Order Confirmed — Preparing in Atelier
                          </span>
                        )}
                        {isShipped && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            <Truck className="w-3.5 h-3.5" /> Dispatched via {order.shipments[0]?.carrier || "Express Courier"}
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> Order Cancelled
                          </span>
                        )}
                        {!isPaid && !isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Payment Settlement
                          </span>
                        )}
                      </div>

                      {/* Items row */}
                      <div className="flex items-center gap-3 overflow-x-auto py-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center space-x-3 bg-cream-50 p-2 rounded-xs border border-cream-200 flex-shrink-0"
                          >
                            <div className="relative w-12 h-14 bg-cream-100 flex-shrink-0 rounded-xs overflow-hidden">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.productTitle}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-charcoal-400">
                                  NXR
                                </div>
                              )}
                            </div>
                            <div className="text-xs pr-2">
                              <div className="font-medium text-charcoal-900 truncate max-w-[160px]">
                                {item.productTitle}
                              </div>
                              <div className="text-charcoal-700 text-[11px]">{item.variantTitle}</div>
                              <div className="text-charcoal-700 text-[10px]">Qty: {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
