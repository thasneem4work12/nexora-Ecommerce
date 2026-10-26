import React from "react";
import { getPlatformBusinessesList } from "@/services/saas/platform-admin.service";
import {
  PlatformBusinessesClient,
  type PlatformBusinessItem,
} from "./PlatformBusinessesClient";

export const dynamic = "force-dynamic";

export default async function PlatformBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string; planId?: string }>;
}) {
  const params = await searchParams;
  const data = await getPlatformBusinessesList({
    query: params.query,
    status: params.status,
    planId: params.planId,
    page: 1,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-900 tracking-tight">Tenants & Businesses</h1>
        <p className="text-sm text-charcoal-600 mt-1">
          Monitor multi-tenant store operations, catalog capacities, and enforce platform-level compliance.
        </p>
      </div>

      <PlatformBusinessesClient
        initialBusinesses={data.businesses as unknown as PlatformBusinessItem[]}
      />
    </div>
  );
}
