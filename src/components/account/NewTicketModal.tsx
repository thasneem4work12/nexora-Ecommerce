"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { X, HelpCircle, AlertCircle, CheckCircle2 } from "lucide-react";

interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  totalInCents: number;
}

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CustomerOrderSummary[];
  preselectedOrderId?: string;
}

export function NewTicketModal({
  isOpen,
  onClose,
  orders,
  preselectedOrderId,
}: NewTicketModalProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string>(preselectedOrderId || "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Please provide both an inquiry subject and detailed description.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId || undefined,
          subject: subject.trim(),
          description: description.trim(),
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit inquiry");
      }

      setSuccessMessage("Your concierge inquiry has been registered. Redirecting...");
      setTimeout(() => {
        onClose();
        router.push(`/account/support/${data.ticket.id}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white border border-cream-200 rounded-sm shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-charcoal-400 hover:text-charcoal-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-luxury text-bronze font-medium">
          <HelpCircle className="w-4 h-4" />
          <span>Atelier Concierge Service</span>
        </div>
        <h2 className="text-2xl font-serif text-charcoal-900 mb-2">
          Submit Private Inquiry
        </h2>
        <p className="text-xs text-charcoal-600 mb-6 leading-relaxed">
          Our dedicated client liaisons are here to assist with garment fittings, bespoke sizing,
          courier inquiries, and post-purchase adjustments.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xs flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xs flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-charcoal-700 font-medium mb-1">
              Associated Order (Optional)
            </label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 text-charcoal-900 rounded-xs focus:outline-hidden focus:border-bronze"
            >
              <option value="">General Inquiry / No Specific Order</option>
              {orders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.orderNumber} (Placed{" "}
                  {new Date(ord.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-charcoal-700 font-medium mb-1">
              Inquiry Priority
            </label>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "LOW" | "NORMAL" | "HIGH" | "URGENT")
              }
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 text-charcoal-900 rounded-xs focus:outline-hidden focus:border-bronze"
            >
              <option value="LOW">Routine / General Assistance</option>
              <option value="NORMAL">Standard Concierge Inquiry</option>
              <option value="HIGH">High Priority (Urgent Dispatch or Modification)</option>
              <option value="URGENT">Critical (Immediate Atelier Attention)</option>
            </select>
          </div>

          <div>
            <label className="block text-charcoal-700 font-medium mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Courier transit clarification for bespoke coat"
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 text-charcoal-900 rounded-xs focus:outline-hidden focus:border-bronze"
            />
          </div>

          <div>
            <label className="block text-charcoal-700 font-medium mb-1">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details regarding your commission, schedule requirements, or question..."
              className="w-full px-3 py-2 bg-cream-50 border border-cream-200 text-charcoal-900 rounded-xs focus:outline-hidden focus:border-bronze resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-cream-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting Inquiry..." : "Submit to Concierge"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
