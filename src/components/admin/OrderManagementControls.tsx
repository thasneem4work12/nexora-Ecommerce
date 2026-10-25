"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Truck } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import type { OrderWithDetails } from "@/types/order";

interface OrderManagementControlsProps {
  order: OrderWithDetails;
}

export function OrderManagementControls({ order }: OrderManagementControlsProps) {
  const router = useRouter();

  // Status transition state
  const [targetStatus, setTargetStatus] = useState<OrderStatus>(order.status);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Shipment state
  const existingShipment = order.shipments[0];
  const [carrier, setCarrier] = useState(existingShipment?.carrier || "DHL Express");
  const [trackingNumber, setTrackingNumber] = useState(existingShipment?.trackingNumber || "");
  const [shipmentNotes, setShipmentNotes] = useState(existingShipment?.notes || "");
  const [isRecordingShipment, setIsRecordingShipment] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          notes: adminNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status.");
      }

      setStatusMessage(`Status transitioned to ${targetStatus}`);
      router.refresh();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Error updating status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecordShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecordingShipment(true);
    setShipmentMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier,
          trackingNumber,
          notes: shipmentNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record shipment.");
      }

      setShipmentMessage(`Shipment recorded: ${trackingNumber}`);
      router.refresh();
    } catch (err) {
      setShipmentMessage(err instanceof Error ? err.message : "Error saving shipment.");
    } finally {
      setIsRecordingShipment(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Status Transition Box */}
      <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
        <h3 className="text-sm font-serif text-charcoal-900 border-b border-cream-200 pb-2">
          Update Order Fulfillment State
        </h3>

        {statusMessage && (
          <div
            className={`p-3 rounded-sm text-xs ${
              statusMessage.includes("Error") || statusMessage.includes("Unauthorized")
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleUpdateStatus} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-charcoal-700 mb-1">
              Fulfillment Status
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
            >
              <option value="PENDING">PENDING (Awaiting Checkout)</option>
              <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
              <option value="PAID">PAID (Settled)</option>
              <option value="PROCESSING">PROCESSING (In Atelier Workshop)</option>
              <option value="SHIPPED">SHIPPED (With Courier)</option>
              <option value="DELIVERED">DELIVERED (Client Received)</option>
              <option value="CANCELLED">CANCELLED (Release Stock)</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-charcoal-700 mb-1">
              Director Audit Note
            </label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Inspected in workshop, ready for DHL collection..."
              className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isUpdatingStatus || targetStatus === order.status}
            className="w-full text-xs uppercase"
          >
            {isUpdatingStatus ? "Applying Transition..." : "Commit Status Change"}
          </Button>
        </form>
      </div>

      {/* 2. Dispatch / Shipment Box */}
      <div className="bg-white p-6 border border-cream-200 rounded-sm shadow-luxury space-y-4">
        <h3 className="text-sm font-serif text-charcoal-900 border-b border-cream-200 pb-2 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-charcoal-700" /> Dispatch & Carrier Logistics
        </h3>

        {shipmentMessage && (
          <div
            className={`p-3 rounded-sm text-xs ${
              shipmentMessage.includes("Error")
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {shipmentMessage}
          </div>
        )}

        <form onSubmit={handleRecordShipment} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-charcoal-700 mb-1">
              Logistics Carrier *
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
            >
              <option value="DHL Express">DHL Express</option>
              <option value="FedEx International Priority">FedEx International Priority</option>
              <option value="NEXORA Signature White Glove">NEXORA Signature White Glove</option>
              <option value="Sri Lanka Post EMS">Sri Lanka Post EMS (EMS International)</option>
              <option value="Boutique Courier Service">Boutique Courier Service</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-charcoal-700 mb-1">
              Tracking / Waybill Number *
            </label>
            <input
              type="text"
              required
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. DHL-9842109412"
              className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs font-mono focus:outline-none focus:border-charcoal-900"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-charcoal-700 mb-1">
              Courier Dispatch Notes
            </label>
            <input
              type="text"
              value={shipmentNotes}
              onChange={(e) => setShipmentNotes(e.target.value)}
              placeholder="e.g. Signature required upon physical delivery"
              className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isRecordingShipment || !trackingNumber}
            className="w-full text-xs uppercase"
          >
            {isRecordingShipment ? "Recording..." : "Save Tracking & Mark Shipped"}
          </Button>
        </form>
      </div>
    </div>
  );
}
