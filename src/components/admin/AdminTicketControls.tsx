"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Send, Lock } from "lucide-react";
import type { TicketStatus, TicketPriority } from "@prisma/client";

interface TicketMessageData {
  id: string;
  senderRole: string;
  isInternalNote: boolean;
  message: string;
  createdAt: string | Date;
  sender?: {
    name: string | null;
    email: string;
    role: string;
  } | null;
}

interface TicketDetailData {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  order?: {
    id: string;
    orderNumber: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  messages: TicketMessageData[];
}

interface AdminTicketControlsProps {
  ticketId: string;
}

export function AdminTicketControls({ ticketId }: AdminTicketControlsProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [message, setMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>("OPEN");
  const [targetPriority, setTargetPriority] = useState<TicketPriority>("NORMAL");
  const [updatingAttrs, setUpdatingAttrs] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load ticket.");
      }
      setTicket(data.ticket);
      setTargetStatus(data.ticket.status);
      setTargetPriority(data.ticket.priority);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setSending(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          isInternalNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post message.");
      }

      setMessage("");
      setIsInternalNote(false);
      await fetchTicket();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateAttributes = async () => {
    try {
      setUpdatingAttrs(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          priority: targetPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update attributes.");
      }
      await fetchTicket();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update attributes");
    } finally {
      setUpdatingAttrs(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 border border-cream-200 rounded-sm shadow-luxury text-center text-xs text-charcoal-700">
        Loading concierge ticket conversation...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-sm text-xs text-rose-800">
        {error || "Ticket not found."}
      </div>
    );
  }

  return (
    <div className="bg-white border border-cream-200 rounded-sm shadow-luxury flex flex-col h-[750px]">
      {/* Header */}
      <div className="p-5 border-b border-cream-200 bg-cream-50 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-charcoal-900">
              {ticket.ticketNumber}
            </span>
            {ticket.order && (
              <span className="text-[11px] text-charcoal-700 font-mono">
                &bull; Order #{ticket.order.orderNumber}
              </span>
            )}
          </div>
          <h3 className="text-base font-serif font-medium text-charcoal-900 mt-1">
            {ticket.subject}
          </h3>
          <div className="text-xs text-charcoal-700 mt-0.5">
            Client: {ticket.user.name} ({ticket.user.email})
          </div>
        </div>

        {/* Status / Priority update dropdowns */}
        <div className="flex items-center gap-2">
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
            className="px-2.5 py-1 text-xs bg-white border border-cream-300 rounded-sm"
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CLIENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={targetPriority}
            onChange={(e) => setTargetPriority(e.target.value as TicketPriority)}
            className="px-2.5 py-1 text-xs bg-white border border-cream-300 rounded-sm"
          >
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updatingAttrs}
            onClick={handleUpdateAttributes}
            className="text-xs uppercase"
          >
            Update
          </Button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {ticket.messages.map((m: TicketMessageData) => {
          const isStaff = m.senderRole !== "CUSTOMER";

          return (
            <div
              key={m.id}
              className={`p-4 rounded-sm text-xs space-y-2 border ${
                m.isInternalNote
                  ? "bg-amber-50/70 border-amber-300 text-amber-950"
                  : isStaff
                  ? "bg-charcoal-900 text-cream-50 border-charcoal-800 ml-8"
                  : "bg-cream-100 text-charcoal-900 border-cream-200 mr-8"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <div className="flex items-center gap-1.5 font-medium">
                  {m.isInternalNote && (
                    <span className="flex items-center gap-1 text-amber-800 font-semibold uppercase tracking-wider text-[10px]">
                      <Lock className="w-3 h-3" /> Internal Staff Note
                    </span>
                  )}
                  <span>{m.sender?.name || m.sender?.email || "Atelier Specialist"}</span>
                  <span className="uppercase text-[9px] tracking-wider font-mono">
                    ({m.senderRole})
                  </span>
                </div>
                <span>
                  {new Date(m.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed">{m.message}</div>
            </div>
          );
        })}
      </div>

      {/* Reply Box */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-cream-200 bg-cream-50 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase tracking-wider text-charcoal-700 font-medium">
            Post Response to Ticket
          </label>
          <label className="flex items-center gap-1.5 text-xs text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              className="rounded text-amber-700 focus:ring-0"
            />
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-[11px] font-medium">Internal Note Only (Hidden from client)</span>
          </label>
        </div>

        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            isInternalNote
              ? "Record internal notes regarding this patron or order..."
              : "Compose response to patron. A notification will be dispatched..."
          }
          className="w-full p-3 bg-white border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={sending || !message.trim()}
            className={`text-xs uppercase flex items-center gap-1.5 ${
              isInternalNote ? "bg-amber-800 hover:bg-amber-900 text-white" : ""
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Dispatching..." : isInternalNote ? "Save Internal Note" : "Send Response"}
          </Button>
        </div>
      </form>
    </div>
  );
}
