import React from "react";
import Link from "next/link";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminCustomers } from "@/services/admin-customer.service";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Users, Search, ShoppingBag, DollarSign, Calendar, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Clients & Patrons — NEXORA Admin",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    sortBy?: "newest" | "oldest" | "spend" | "orders";
    page?: string;
  }>;
}) {
  await requireAdminPageSession("VIEW_CUSTOMERS");
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || undefined;
  const sortBy = params.sortBy || "newest";

  const { customers, pagination } = await getAdminCustomers({
    search,
    sortBy,
    page: isNaN(page) ? 1 : page,
    limit: 15,
  });

  const totalSpendSum = customers.reduce((acc, c) => acc + c.totalSpendInCents, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
          Clientele & Private Patrons
        </h1>
        <p className="text-xs tracking-wider uppercase text-charcoal-700 mt-1">
          PostgreSQL Aggregated Client Profiles, Historical Acquisitions & Lifetime Spend
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Registered Patrons</span>
            <Users className="w-4 h-4 text-charcoal-700" />
          </div>
          <div className="text-2xl font-serif font-medium text-charcoal-900">
            {pagination.total}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Page Acquired Value</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-serif font-medium text-emerald-800">
            {formatPrice(totalSpendSum)}
          </div>
        </div>

        <div className="bg-white p-5 border border-cream-200 rounded-sm shadow-luxury">
          <div className="flex items-center justify-between text-charcoal-700 mb-2">
            <span className="text-[11px] uppercase tracking-wider">Directory Scope</span>
            <ShoppingBag className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-serif font-medium text-charcoal-900">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="bg-white p-4 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] uppercase tracking-wider text-charcoal-700 mr-1">Sort:</span>
          <Link
            href={`/admin/customers?sortBy=newest${search ? `&search=${search}` : ""}`}
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              sortBy === "newest"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Newest Members
          </Link>
          <Link
            href={`/admin/customers?sortBy=spend${search ? `&search=${search}` : ""}`}
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              sortBy === "spend"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Highest Spend
          </Link>
          <Link
            href={`/admin/customers?sortBy=orders${search ? `&search=${search}` : ""}`}
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              sortBy === "orders"
                ? "bg-charcoal-900 text-white font-medium"
                : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Most Orders
          </Link>
        </div>

        <form method="GET" action="/admin/customers" className="flex items-center gap-2">
          {sortBy && <input type="hidden" name="sortBy" value={sortBy} />}
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search patron by name or email..."
              className="pl-9 pr-3 py-1.5 text-xs bg-cream-50 border border-cream-300 rounded-sm focus:outline-none focus:border-charcoal-900 w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-xs uppercase">
            Search
          </Button>
          {search && (
            <Link
              href="/admin/customers"
              className="text-xs text-charcoal-700 hover:text-charcoal-900 underline ml-1"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-charcoal-700">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40 text-charcoal-700" />
            <h3 className="text-base font-serif text-charcoal-900">No Patrons Found</h3>
            <p className="text-xs text-charcoal-700 mt-1">
              No customer records matched your query criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 border-b border-cream-200 uppercase tracking-wider text-charcoal-700 text-[10px]">
                <tr>
                  <th className="px-6 py-4">Patron Name & Email</th>
                  <th className="px-6 py-4">Total Orders</th>
                  <th className="px-6 py-4">Completed Spend</th>
                  <th className="px-6 py-4">Open Inquiries</th>
                  <th className="px-6 py-4">Member Since</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-charcoal-900">{c.name}</div>
                      <div className="text-[11px] text-charcoal-700 font-mono mt-0.5">{c.email}</div>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-charcoal-900 font-medium">
                      {c.orderCount}
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-emerald-800 font-medium">
                      {formatPrice(c.totalSpendInCents)}
                    </td>
                    <td className="px-6 py-4 text-charcoal-700">
                      {c.ticketCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {c.ticketCount} tickets
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-charcoal-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="inline-flex items-center text-xs text-charcoal-900 hover:text-charcoal-900 font-medium uppercase tracking-wider"
                      >
                        Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-cream-200 bg-cream-50 flex items-center justify-between text-xs text-charcoal-700">
            <div>
              Showing {customers.length} of {pagination.total} patrons
            </div>
            <div className="flex items-center gap-2">
              {pagination.page > 1 && (
                <Link
                  href={`/admin/customers?page=${pagination.page - 1}${search ? `&search=${search}` : ""}${sortBy ? `&sortBy=${sortBy}` : ""}`}
                  className="px-3 py-1 bg-white border border-cream-300 rounded-sm hover:bg-cream-100"
                >
                  Previous
                </Link>
              )}
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/admin/customers?page=${pagination.page + 1}${search ? `&search=${search}` : ""}${sortBy ? `&sortBy=${sortBy}` : ""}`}
                  className="px-3 py-1 bg-white border border-cream-300 rounded-sm hover:bg-cream-100"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
