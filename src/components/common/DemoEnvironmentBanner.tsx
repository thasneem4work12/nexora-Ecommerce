"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

export function DemoEnvironmentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!isDemoMode || dismissed) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Demo Environment Notice"
      className="bg-amber-950/95 text-amber-200 border-b border-amber-800/60 px-4 py-2 text-xs tracking-wide transition-all z-50 flex items-center justify-between shadow-sm backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center p-1 rounded bg-amber-900/80 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <p className="font-medium text-amber-100 flex items-center gap-1.5 flex-wrap">
            <strong className="tracking-widest uppercase font-semibold text-amber-400 text-[11px] bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-700/50">
              DEMO ENVIRONMENT
            </strong>
            <span>
              All financial transactions, customer checkouts, and SaaS subscriptions are simulated. No real money is charged.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300/80 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Sandbox Mode
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded text-amber-400 hover:text-amber-200 hover:bg-amber-900/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
