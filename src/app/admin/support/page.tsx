import React from "react";
import Link from "next/link";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminTickets } from "@/services/support-ticket.service";
import { Button } from "@/components/ui/Button";
import { LifeBuoy, Search, MessageSquare } from "lucide-react";
import type { TicketStatus, TicketPriority } from "@prisma/client";
import { AdminTicketControls } from "@/components/admin/AdminTicketControls";

export const metadata = {
  title: "Concierge & Support Desk — NEXORA Admin",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
    page?: string;
    selectedTicketId?: string;
  }>;
}) {
  const { businessId } = await requireAdminPageSession("VIEW_ORDERS");
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const status = params.status || undefined;
  const priority = params.priority || undefined;
  const search = params.search || undefined;
  const selectedTicketId = params.selectedTicketId || undefined;

  const { tickets } = await getAdminTickets({
    businessId,
    status,
    priority,
    search,
    page: isNaN(page) ? 1 : page,
    limit: 15,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
          Concierge Inquiries & Client Support
        </h1>
        <p className="text-xs tracking-wider uppercase text-charcoal-700 mt-1">
          Bespoke Support Ticket Desk, Customer Conversations & Internal Staff Notes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 border border-cream-200 rounded-sm shadow-luxury flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            href="/admin/support"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              !status ? "bg-charcoal-900 text-white font-medium" : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            All Tickets
          </Link>
          <Link
            href="/admin/support?status=OPEN"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "OPEN" ? "bg-charcoal-900 text-white font-medium" : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Open
          </Link>
          <Link
            href="/admin/support?status=IN_PROGRESS"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "IN_PROGRESS" ? "bg-charcoal-900 text-white font-medium" : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            In Progress
          </Link>
          <Link
            href="/admin/support?status=WAITING_FOR_CUSTOMER"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "WAITING_FOR_CUSTOMER" ? "bg-charcoal-900 text-white font-medium" : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Awaiting Client
          </Link>
          <Link
            href="/admin/support?status=RESOLVED"
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${
              status === "RESOLVED" ? "bg-charcoal-900 text-white font-medium" : "bg-cream-100 text-charcoal-700 hover:bg-cream-200"
            }`}
          >
            Resolved
          </Link>
        </div>

        <form method="GET" action="/admin/support" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search ticket #, patron, subject..."
              className="pl-9 pr-3 py-1.5 text-xs bg-cream-50 border border-cream-300 rounded-sm focus:outline-none focus:border-charcoal-900 w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-xs uppercase">
            Filter
          </Button>
        </form>
      </div>

      {/* Main Grid: Ticket List + Conversation Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={selectedTicketId ? "lg:col-span-5 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-white border border-cream-200 rounded-sm shadow-luxury overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-charcoal-700">
                <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-40 text-charcoal-700" />
                <h3 className="text-base font-serif text-charcoal-900">No Support Tickets</h3>
                <p className="text-xs text-charcoal-700 mt-1">All patron inquiries have been addressed.</p>
              </div>
            ) : (
              <div className="divide-y divide-cream-200">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/support?selectedTicketId=${t.id}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                    className={`block p-5 transition-colors hover:bg-cream-50 ${
                      selectedTicketId === t.id ? "bg-cream-100 border-l-4 border-l-charcoal-900" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-charcoal-900">
                          {t.ticketNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium ${
                            t.status === "OPEN"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : t.status === "IN_PROGRESS"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : t.status === "WAITING_FOR_CUSTOMER"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {t.status.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            t.priority === "URGENT"
                              ? "bg-rose-800 text-white"
                              : t.priority === "HIGH"
                              ? "bg-amber-800 text-white"
                              : "bg-cream-200 text-charcoal-700"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <span className="text-[11px] text-charcoal-700 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {t._count.messages}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium text-charcoal-900 mt-2 line-clamp-1">
                      {t.subject}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-charcoal-700 mt-2">
                      <span>{t.user.name} ({t.user.email})</span>
                      <span className="text-[10px]">
                        {new Date(t.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Ticket Conversation & Action Panel */}
        {selectedTicketId && (
          <div className="lg:col-span-7">
            <AdminTicketControls ticketId={selectedTicketId} />
          </div>
        )}
      </div>
    </div>
  );
}
