"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, MessageSquare } from "lucide-react";
import { NewTicketModal } from "./NewTicketModal";

interface SupportInquiriesHeaderProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: Date | string;
    totalInCents: number;
  }>;
}

export function SupportInquiriesHeader({ orders }: SupportInquiriesHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cream-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-luxury text-bronze font-medium mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Private Client Relations</span>
          </div>
          <h1 className="text-3xl font-serif text-charcoal-900">
            Concierge & Support Desk
          </h1>
          <p className="text-sm text-charcoal-700 mt-1">
            Direct communication with NEXORA craftspeople, dispatch specialists, and client liaisons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Open New Inquiry
          </Button>
        </div>
      </div>

      <NewTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orders={orders}
      />
    </>
  );
}
