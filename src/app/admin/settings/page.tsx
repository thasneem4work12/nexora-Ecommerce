import React from "react";
import { Shield, Store, CreditCard, Bell, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const sections = [
    {
      title: "Storefront & Brand Identity",
      description: "Manage atelier business name, brand logo, typography scales, and regional currency settings.",
      icon: Store,
      badge: "Configured (Phase 1-2)",
      status: "Active",
    },
    {
      title: "Multi-Tenancy & Business Memberships",
      description: "Architecture foundation prepared. Multi-business store isolation, team memberships, and sub-accounts will be fully provisioned in upcoming SaaS phases.",
      icon: Users,
      badge: "Planned (Phase 5+)",
      status: "Staged",
    },
    {
      title: "Payment Processing & Gateways",
      description: "Production payment gateway integrations (Stripe, global credit card networks, Apple Pay) scheduled for Phase 4 Order & Checkout Processing.",
      icon: CreditCard,
      badge: "Scheduled (Phase 4)",
      status: "Upcoming",
    },
    {
      title: "Security & Administrative RBAC",
      description: "Multi-tier role-based access control (CUSTOMER, STAFF, MANAGER, OWNER, SUPERADMIN) with server-side authorization enforcement.",
      icon: Shield,
      badge: "Active (Phase 3)",
      status: "Active",
    },
    {
      title: "Notification Dispatch & Alerts",
      description: "Automated inventory depletion warnings, low-stock threshold notifications, and order confirmation email routing.",
      icon: Bell,
      badge: "Planned",
      status: "Staged",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          Platform Configuration
        </span>
        <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
          Store Settings
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 font-light">
          Administration preferences, security controls, and future multi-business SaaS provisioning.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div
              key={idx}
              className="bg-canvas-surface border border-border-default p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2.5 bg-canvas-secondary border border-border-subtle text-bronze mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-sm font-serif text-charcoal-900 font-medium">
                      {section.title}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold bg-canvas-secondary border border-border-default text-charcoal-700">
                      {section.badge}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-500 font-light mt-1 max-w-xl leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </div>

              <div>
                <Button variant="outline" size="sm" disabled>
                  {section.status === "Active" ? "Configured" : "Staged"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
