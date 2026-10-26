import React from "react";
import Link from "next/link";
import { Shield, Store, CreditCard, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const { businessId, businessRole } = await requireAdminPageSession("VIEW_ADMIN");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      settings: true,
      themeConfig: true,
      _count: {
        select: {
          products: true,
          orders: true,
          members: true,
        },
      },
    },
  });

  const settings = business?.settings;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="border-b border-border-default pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Store Governance
          </span>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Store Configuration
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Settings for <strong>{business?.name || "Active Store"}</strong> ({business?.slug}).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href={`/store/${business?.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center">
              View Public Storefront <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Storefront & Brand */}
        <div className="bg-canvas-surface border border-border-default p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 bg-canvas-secondary border border-border-subtle text-bronze mt-0.5 rounded">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-sm font-serif text-charcoal-900 font-medium">
                  Storefront Brand & Theme
                </h2>
                <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-emerald-100 border border-emerald-300 text-emerald-800 rounded">
                  Active
                </span>
              </div>
              <p className="text-xs text-charcoal-500 font-light mt-1 max-w-xl leading-relaxed">
                Theme: <strong>{business?.themeConfig?.activeThemeId || "editorial-luxury"}</strong>. Public route: <code className="bg-canvas-secondary px-1 py-0.5 rounded font-mono">/store/{business?.slug}</code>.
              </p>
            </div>
          </div>

          <div>
            <Link href="/admin/appearance">
              <Button variant="outline" size="sm">
                Appearance Studio
              </Button>
            </Link>
          </div>
        </div>

        {/* Multi-Tenancy & Team */}
        <div className="bg-canvas-surface border border-border-default p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 bg-canvas-secondary border border-border-subtle text-bronze mt-0.5 rounded">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-sm font-serif text-charcoal-900 font-medium">
                  Team Members & Permissions
                </h2>
                <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-emerald-100 border border-emerald-300 text-emerald-800 rounded">
                  Active
                </span>
              </div>
              <p className="text-xs text-charcoal-500 font-light mt-1 max-w-xl leading-relaxed">
                {business?._count.members || 1} personnel registered. Your authoritative role: <strong className="text-bronze uppercase">{businessRole}</strong>.
              </p>
            </div>
          </div>

          <div>
            <Link href="/admin/members">
              <Button variant="outline" size="sm">
                Manage Team
              </Button>
            </Link>
          </div>
        </div>

        {/* Payment Processing */}
        <div className="bg-canvas-surface border border-border-default p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 bg-canvas-secondary border border-border-subtle text-bronze mt-0.5 rounded">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-sm font-serif text-charcoal-900 font-medium">
                  Payment Processing & Currency
                </h2>
                <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-canvas-secondary border border-border-default text-charcoal-700 rounded">
                  {business?.currency || "USD"}
                </span>
              </div>
              <p className="text-xs text-charcoal-500 font-light mt-1 max-w-xl leading-relaxed">
                Currency: <strong>{business?.currency || "USD"}</strong>. Mock test payments: {settings?.allowMockPayment ? "Enabled" : "Disabled"}. Order prefix: <code className="bg-canvas-secondary px-1 py-0.5 rounded font-mono">{settings?.orderPrefix || "NXR"}</code>.
              </p>
            </div>
          </div>

          <div>
            <Button variant="outline" size="sm" disabled>
              Configured
            </Button>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-canvas-surface border border-border-default p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card">
          <div className="flex items-start space-x-4">
            <div className="p-2.5 bg-canvas-secondary border border-border-subtle text-bronze mt-0.5 rounded">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-sm font-serif text-charcoal-900 font-medium">
                  Multi-Tenant Tenant Isolation & RBAC
                </h2>
                <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-emerald-100 border border-emerald-300 text-emerald-800 rounded">
                  Enforced
                </span>
              </div>
              <p className="text-xs text-charcoal-500 font-light mt-1 max-w-xl leading-relaxed">
                PostgreSQL row-level isolation guarantees strict partitioning across catalogs, stock reservation queues, order snapshots, customer tickets, and financial audit logs.
              </p>
            </div>
          </div>

          <div>
            <Button variant="outline" size="sm" disabled>
              Secure
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
