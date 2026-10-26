import React from "react";
import { getAllPlans } from "@/services/saas/plan.service";
import { PlatformPlansClient, type PlatformPlanItem } from "./PlatformPlansClient";

export const dynamic = "force-dynamic";

export default async function PlatformPlansPage() {
  const plans = await getAllPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-900 tracking-tight">SaaS Plans & Pricing</h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Configure subscription plan tiers, set product and staff quotas, and manage versioned pricing.
        </p>
      </div>

      <PlatformPlansClient initialPlans={plans as unknown as PlatformPlanItem[]} />
    </div>
  );
}
