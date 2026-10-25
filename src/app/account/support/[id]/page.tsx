import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSupportTicketById } from "@/services/support-ticket.service";
import { CustomerTicketConversation } from "@/components/account/CustomerTicketConversation";
import {
  MessageSquare,
  ArrowLeft,
  Package,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Concierge Inquiries — NEXORA Haute Couture",
  description: "Private conversation with NEXORA Concierge and Client Relations.",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3.5 h-3.5" /> Awaiting Review
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5" /> In Atelier Review
        </span>
      );
    case "WAITING_FOR_CUSTOMER":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <AlertCircle className="w-3.5 h-3.5" /> Response Requested
        </span>
      );
    case "RESOLVED":
    case "CLOSED":
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-charcoal-100 text-charcoal-700 border border-charcoal-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Concluded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-cream-100 text-charcoal-700 border border-cream-200">
          {status}
        </span>
      );
  }
}

export default async function CustomerSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    redirect(`/login?callbackUrl=/account/support/${id}`);
  }

  let ticket;
  try {
    ticket = await getSupportTicketById(id, session.user.id, "CUSTOMER");
  } catch {
    notFound();
  }

  if (!ticket) {
    notFound();
  }

  return (
    <div className="bg-cream-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/account/support"
            className="text-xs text-charcoal-600 hover:text-charcoal-900 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inquiries
          </Link>
          <span className="font-mono text-xs text-charcoal-500">
            {ticket.ticketNumber}
          </span>
        </div>

        {/* Ticket Header Card */}
        <div className="bg-white border border-cream-200 rounded-sm shadow-luxury p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-luxury text-bronze font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Concierge Dossier</span>
              </div>
              <h1 className="text-2xl font-serif text-charcoal-900">
                {ticket.subject}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(ticket.status)}
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-cream-100 text-charcoal-700 border border-cream-200 rounded-xs">
                {ticket.priority} Priority
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div>
              <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">
                Opened On
              </span>
              <span className="font-medium text-charcoal-900">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div>
              <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">
                Assigned Desk
              </span>
              <span className="font-medium text-charcoal-900">
                {ticket.assignedStaff
                  ? `${ticket.assignedStaff.name} (Atelier Specialist)`
                  : "NEXORA Concierge Service Desk"}
              </span>
            </div>

            <div>
              <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">
                Commission Link
              </span>
              {ticket.order ? (
                <Link
                  href={`/account/orders/${ticket.order.id}`}
                  className="font-mono font-medium text-charcoal-900 hover:text-bronze underline underline-offset-2 flex items-center gap-1 mt-0.5"
                >
                  <Package className="w-3.5 h-3.5 text-bronze" />
                  {ticket.order.orderNumber}
                </Link>
              ) : (
                <span className="text-charcoal-400">General Inquiry</span>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Desk */}
        <div className="bg-white border border-cream-200 rounded-sm shadow-luxury p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-cream-200">
            <h2 className="text-sm font-semibold uppercase tracking-luxury text-charcoal-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-bronze" /> Conversation Log
            </h2>
            <span className="text-xs text-charcoal-500">
              {ticket.messages.length} Dispatches Recorded
            </span>
          </div>

          <CustomerTicketConversation
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            currentUserId={session.user.id}
            initialMessages={ticket.messages}
          />
        </div>
      </div>
    </div>
  );
}
