"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Send, User, ShieldCheck, AlertCircle, Clock, CheckCircle } from "lucide-react";

interface TicketMessageItem {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: Date | string;
  sender?: {
    name: string | null;
    email: string;
  } | null;
}

interface CustomerTicketConversationProps {
  ticketId: string;
  ticketStatus: string;
  currentUserId: string;
  initialMessages: TicketMessageItem[];
}

export function CustomerTicketConversation({
  ticketId,
  ticketStatus,
  currentUserId,
  initialMessages,
}: CustomerTicketConversationProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<TicketMessageItem[]>(initialMessages);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = ticketStatus === "CLOSED";

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post message");
      }

      setReplyText("");
      // Add optimistic message or trigger full router refresh
      router.refresh();
      // Also update local state
      setMessages((prev) => [
        ...prev,
        {
          id: data.ticketMessage.id || `temp-${Date.now()}`,
          senderId: currentUserId,
          senderRole: "CUSTOMER",
          message: replyText.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message Timeline */}
      <div className="space-y-4">
        {messages.map((msg) => {
          const isCustomer = msg.senderRole === "CUSTOMER";

          return (
            <div
              key={msg.id}
              className={`p-5 rounded-xs border text-xs leading-relaxed ${
                isCustomer
                  ? "bg-white border-cream-200 ml-0 sm:mr-12"
                  : "bg-charcoal-900 text-cream-100 border-charcoal-800 ml-0 sm:ml-12"
              }`}
            >
              <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-inherit/20 text-[11px]">
                <div className="flex items-center gap-2">
                  {isCustomer ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-cream-100 flex items-center justify-center text-charcoal-700">
                        <User className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-charcoal-900">
                        You (Client)
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-bronze/30 flex items-center justify-center text-bronze">
                        <ShieldCheck className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-bronze uppercase tracking-wider text-[10px]">
                        NEXORA Concierge Atelier
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-70">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(msg.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs font-light">
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Box or Closed Banner */}
      {isClosed ? (
        <div className="p-4 bg-cream-100 border border-cream-200 rounded-xs text-center text-xs text-charcoal-600 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>
            This concierge inquiry has been resolved and closed. For new inquiries, please open a fresh request.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-cream-200">
          <div className="flex items-center justify-between text-xs text-charcoal-600">
            <span className="font-medium text-charcoal-900">Respond to Concierge</span>
            <span className="text-[11px] text-charcoal-400">Encrypted Private Dispatch</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your message or follow-up question here..."
            className="w-full px-3 py-2 bg-white border border-cream-200 text-charcoal-900 rounded-xs text-xs focus:outline-hidden focus:border-bronze resize-none"
            disabled={isSubmitting}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !replyText.trim()}
              className="flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Dispatching..." : "Send Message"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
