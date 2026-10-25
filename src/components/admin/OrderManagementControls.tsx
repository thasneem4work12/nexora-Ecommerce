"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Truck, AlertTriangle, RefreshCw } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import type { OrderWithDetails } from "@/types/order";
import { formatPrice } from "@/lib/utils";

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
  const [trackingUrl, setTrackingUrl] = useState(existingShipment?.trackingUrl || "");
  const [shipmentNotes, setShipmentNotes] = useState(existingShipment?.notes || "");
  const [isRecordingShipment, setIsRecordingShipment] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);

  // Cancellation review state
  const [isReviewingCancel, setIsReviewingCancel] = useState(false);
  const [cancelReviewNotes, setCancelReviewNotes] = useState("");
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Refund reconciliation state
  const [isRefunding, setIsRefunding] = useState(false);
  const [reconciliationRef, setReconciliationRef] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundMessage, setRefundMessage] = useState<string | null>(null);

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
          trackingUrl: trackingUrl || undefined,
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

  const handleReviewCancellation = async (decision: "APPROVED" | "REJECTED") => {
    setIsReviewingCancel(true);
    setCancelMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          adminNotes: cancelReviewNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process cancellation review.");
      }

      setCancelMessage(`Cancellation request ${decision.toLowerCase()} successfully.`);
      router.refresh();
    } catch (err) {
      setCancelMessage(err instanceof Error ? err.message : "Error reviewing cancellation.");
    } finally {
      setIsReviewingCancel(false);
    }
  };

  const handleManualRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRefunding(true);
    setRefundMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundAmountInCents: order.refundAmountInCents || order.totalInCents,
          reconciliationReference: reconciliationRef,
          notes: refundNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record refund.");
      }

      setRefundMessage("Manual refund reconciled and marked completed.");
      router.refresh();
    } catch (err) {
      setRefundMessage(err instanceof Error ? err.message : "Error recording refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Cancellation Review Banner */}
      {order.cancellationRequested && (
        <div className="bg-amber-50 border border-amber-300 p-5 rounded-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-medium text-amber-900 uppercase tracking-wider">
                  Action Required: Client Cancellation Request
                </h4>
                <p className="text-xs text-amber-800 mt-1">
                  The client has requested cancellation. Reason:{" "}
                  <span className="italic font-medium">
                    &ldquo;{order.cancellationReason || "No details provided"}&rdquo;
                  </span>
                </p>
              </div>

              {cancelMessage && (
                <div className="p-2 text-xs bg-white rounded border border-amber-300 text-amber-900">
                  {cancelMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={cancelReviewNotes}
                  onChange={(e) => setCancelReviewNotes(e.target.value)}
                  placeholder="Review notes for client notification..."
                  className="w-full sm:w-80 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-sm focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isReviewingCancel}
                    onClick={() => handleReviewCancellation("APPROVED")}
                    className="text-xs uppercase bg-rose-700 hover:bg-rose-800"
                  >
                    {isReviewingCancel ? "Processing..." : "Approve & Restock"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isReviewingCancel}
                    onClick={() => handleReviewCancellation("REJECTED")}
                    className="text-xs uppercase"
                  >
                    Decline Request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Required Workflow Banner */}
      {order.refundRequired && order.paymentStatus !== "REFUNDED" && (
        <div className="bg-blue-50 border border-blue-300 p-5 rounded-sm">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-medium text-blue-900 uppercase tracking-wider">
                  Treasury Reconciliation: Refund Required ({formatPrice(order.refundAmountInCents || order.totalInCents)})
                </h4>
                <p className="text-xs text-blue-800 mt-1">
                  This order was cancelled or returned after payment settled. Please reconcile the refund via your merchant bank or manual gateway reversal and record the reference below.
                </p>
              </div>

              {refundMessage && (
                <div className="p-2 text-xs bg-white rounded border border-blue-300 text-blue-900">
                  {refundMessage}
                </div>
              )}

              <form onSubmit={handleManualRefund} className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  required
                  value={reconciliationRef}
                  onChange={(e) => setReconciliationRef(e.target.value)}
                  placeholder="Bank wire / Gateway reversal Ref #"
                  className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-sm focus:outline-none w-64"
                />
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Notes (optional)..."
                  className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-sm focus:outline-none w-64"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isRefunding || !reconciliationRef}
                  className="text-xs uppercase bg-blue-800 hover:bg-blue-900"
                >
                  {isRefunding ? "Recording..." : "Reconcile Refund"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Status Transition & Dispatch */}
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
                <option value="PACKED">PACKED (Inspected & Prepared)</option>
                <option value="SHIPPED">SHIPPED (With Logistics Partner)</option>
                <option value="DELIVERED">DELIVERED (Client Received)</option>
                <option value="RETURN_REQUESTED">RETURN_REQUESTED (Under Review)</option>
                <option value="RETURNED">RETURNED (Goods Received Back)</option>
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
            <Truck className="w-4 h-4 text-charcoal-700" /> Dispatch & Courier Logistics
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
                Secure Courier Tracking URL (Optional)
              </label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://www.dhl.com/track/..."
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-sm text-xs focus:outline-none focus:border-charcoal-900"
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
    </div>
  );
}
