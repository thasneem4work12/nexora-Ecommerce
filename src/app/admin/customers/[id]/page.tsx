import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminCustomerById } from "@/services/admin-customer.service";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft, ShoppingBag, MapPin, LifeBuoy, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Patron Dossier — NEXORA Admin",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageSession("VIEW_CUSTOMERS");
  const { id } = await params;

  const customer = await getAdminCustomerById(id);
  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-700 hover:text-charcoal-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patron Directory
        </Link>
      </div>

      {/* Header Profile Box */}
      <div className="bg-white p-6 sm:p-8 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-charcoal-700">Patron Dossier</div>
          <h1 className="text-3xl font-serif text-charcoal-900 font-medium">
            {customer.name}
          </h1>
          <div className="text-xs text-charcoal-700 mt-1 font-mono">
            {customer.email} &bull; Member since{" "}
            {new Date(customer.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-charcoal-700">Lifetime Spend</div>
            <div className="text-2xl font-serif font-medium text-emerald-800">
              {formatPrice(customer.totalSpendInCents)}
            </div>
          </div>
          <div className="text-right border-l border-cream-200 pl-6">
            <div className="text-xs uppercase tracking-wider text-charcoal-700">Acquisitions</div>
            <div className="text-2xl font-serif font-medium text-charcoal-900">
              {customer.orderCount} Orders
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Order History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-base font-serif text-charcoal-900 border-b border-cream-200 pb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-charcoal-700" /> Historical Commissions & Orders
            </h2>

            {customer.orders.length === 0 ? (
              <p className="text-xs text-charcoal-700 py-4 text-center">
                No orders registered for this patron.
              </p>
            ) : (
              <div className="divide-y divide-cream-200">
                {customer.orders.map((order) => (
                  <div key={order.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-charcoal-900">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium ${
                            order.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-charcoal-700">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-charcoal-700 mt-1">
                        {order.items.length} item(s) &bull;{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-serif text-sm font-medium text-charcoal-900">
                        {formatPrice(order.totalInCents)}
                      </span>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs uppercase tracking-wider text-charcoal-900 hover:text-charcoal-900 flex items-center font-medium"
                      >
                        Inspect <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support Tickets */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-base font-serif text-charcoal-900 border-b border-cream-200 pb-3 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-charcoal-700" /> Concierge & Inquiries
            </h2>

            {customer.supportTickets.length === 0 ? (
              <p className="text-xs text-charcoal-700 py-4 text-center">
                No concierge support tickets recorded.
              </p>
            ) : (
              <div className="divide-y divide-cream-200">
                {customer.supportTickets.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-charcoal-900">
                          {t.ticketNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-medium bg-cream-100 text-charcoal-700">
                          {t.status}
                        </span>
                        <span className="text-[10px] uppercase text-charcoal-700">
                          {t.priority}
                        </span>
                      </div>
                      <div className="text-xs text-charcoal-700 mt-1 font-medium">{t.subject}</div>
                    </div>
                    <Link
                      href={`/admin/support?search=${t.ticketNumber}`}
                      className="text-xs uppercase tracking-wider text-charcoal-900 hover:text-charcoal-900 flex items-center font-medium"
                    >
                      View Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column: Addresses & Return Requests */}
        <div className="space-y-8">
          {/* Saved Addresses */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-base font-serif text-charcoal-900 border-b border-cream-200 pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-charcoal-700" /> Delivery Addresses
            </h2>

            {customer.addresses.length === 0 ? (
              <p className="text-xs text-charcoal-700 py-2">No saved addresses.</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((addr) => (
                  <div key={addr.id} className="p-3 bg-cream-50 rounded-sm text-xs space-y-0.5 text-charcoal-700">
                    <div className="font-medium text-charcoal-900">
                      {addr.firstName} {addr.lastName}
                    </div>
                    {addr.company && <div>{addr.company}</div>}
                    <div>{addr.addressLine1}</div>
                    {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                    <div>
                      {addr.city}, {addr.stateOrProvince || ""} {addr.postalCode}
                    </div>
                    <div>{addr.country}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Requests */}
          <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
            <h2 className="text-base font-serif text-charcoal-900 border-b border-cream-200 pb-3">
              Returns & Claims
            </h2>

            {customer.returnRequests.length === 0 ? (
              <p className="text-xs text-charcoal-700 py-2">No return requests on record.</p>
            ) : (
              <div className="space-y-3">
                {customer.returnRequests.map((ret) => (
                  <div key={ret.id} className="p-3 bg-cream-50 rounded-sm text-xs space-y-1 text-charcoal-700">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium text-charcoal-900">
                        {ret.returnNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-cream-200 text-charcoal-800">
                        {ret.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-charcoal-700 italic">
                      &ldquo;{ret.reason}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
