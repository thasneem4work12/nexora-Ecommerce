import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCustomerTickets } from "@/services/support-ticket.service";
import { SupportInquiriesHeader } from "@/components/account/SupportInquiriesHeader";
import { Button } from "@/components/ui/Button";
import {
  MessageSquare,
  ArrowRight,
  Clock,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Concierge & Support — NEXORA Haute Couture",
  description: "Private client communication and after-sales support inquiries.",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3" /> Awaiting Review
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" /> In Atelier Review
        </span>
      );
    case "WAITING_FOR_CUSTOMER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <AlertCircle className="w-3 h-3" /> Response Requested
        </span>
      );
    case "RESOLVED":
    case "CLOSED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-charcoal-100 text-charcoal-700 border border-charcoal-200">
          <CheckCircle2 className="w-3 h-3" /> Concluded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cream-100 text-charcoal-700 border border-cream-200">
          {status}
        </span>
      );
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded-xs">
          Urgent
        </span>
      );
    case "HIGH":
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-xs">
          High
        </span>
      );
    default:
      return null;
  }
}

export default async function CustomerSupportPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    redirect("/login?callbackUrl=/account/support");
  }

  // Fetch customer support tickets
  const { tickets, pagination } = await getCustomerTickets(session.user.id, 1, 50);
  const total = pagination.total;

  // Fetch lightweight orders summary for linking
  const customerOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      totalInCents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-cream-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/account"
            className="text-charcoal-600 hover:text-charcoal-900 transition-colors flex items-center gap-1"
          >
            ← Return to Client Portal
          </Link>
          <span className="text-charcoal-500 font-mono">
            {total} Registered {total === 1 ? "Inquiry" : "Inquiries"}
          </span>
        </div>

        <SupportInquiriesHeader orders={customerOrders} />

        {tickets.length === 0 ? (
          <div className="bg-white p-12 border border-cream-200 rounded-sm shadow-luxury text-center space-y-4">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto text-charcoal-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-serif text-charcoal-900">
              No Concierge Inquiries on File
            </h2>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
              Whenever you require assistance regarding sizing adjustments, dispatch coordinates, or custom atelier commissions, our client liaisons are at your service.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-cream-200 rounded-sm shadow-luxury hover:border-bronze/40 transition-colors p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cream-100 pb-4 mb-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-charcoal-900">
                      {ticket.ticketNumber}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>

                  <span className="text-charcoal-500 text-[11px]">
                    Last updated{" "}
                    {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-serif text-lg text-charcoal-900">
                      {ticket.subject}
                    </h3>
                    <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>

                    {ticket.order && (
                      <div className="pt-2 flex items-center gap-2 text-xs text-charcoal-500">
                        <Package className="w-3.5 h-3.5 text-bronze" />
                        <span>Commission: </span>
                        <Link
                          href={`/account/orders/${ticket.order.id}`}
                          className="font-mono font-medium text-charcoal-900 hover:text-bronze underline underline-offset-2"
                        >
                          {ticket.order.orderNumber}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2 md:pt-0">
                    <Link href={`/account/support/${ticket.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Open Conversation <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
