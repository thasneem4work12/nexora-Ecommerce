"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  History,
  ShoppingBag,
  Users,
  LifeBuoy,
  Palette,
  Settings,
  Building2,
  UserCheck,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { HelpGuideModal } from "@/components/guidance/HelpGuideModal";

interface AdminSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: "/admin",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/orders",
      label: "Orders & Fulfillment",
      icon: ShoppingBag,
    },
    {
      href: "/admin/customers",
      label: "Clients & Patrons",
      icon: Users,
    },
    {
      href: "/admin/support",
      label: "Concierge & Support",
      icon: LifeBuoy,
    },
    {
      href: "/admin/products",
      label: "Creations & Products",
      icon: Package,
    },
    {
      href: "/admin/categories",
      label: "Disciplines & Categories",
      icon: Layers,
    },
    {
      href: "/admin/inventory",
      label: "Inventory & Stock",
      icon: Boxes,
    },
    {
      href: "/admin/inventory/movements",
      label: "Stock Audit Ledger",
      icon: History,
    },
    {
      href: "/admin/appearance",
      label: "Theme & Appearance",
      icon: Palette,
    },
    {
      href: "/admin/businesses",
      label: "Stores & Businesses",
      icon: Building2,
    },
    {
      href: "/admin/members",
      label: "Team & Permissions",
      icon: UserCheck,
    },
    {
      href: "/admin/billing",
      label: "Subscription & Billing",
      icon: CreditCard,
    },
    {
      href: "/admin/settings",
      label: "Store Settings",
      icon: Settings,
    },
    ...(user.role === "SUPERADMIN"
      ? [
          {
            href: "/platform",
            label: "Platform Superadmin",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between bg-charcoal-900 text-canvas-primary border-r border-charcoal-800 w-72">
      {/* Brand & Workspace Header */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="p-6 border-b border-charcoal-800 shrink-0">
          <Link href="/admin" className="block group">
            <span className="text-xl font-serif tracking-[0.25em] text-canvas-primary uppercase transition-colors group-hover:text-bronze">
              NEXORA
            </span>
            <span className="block text-[9px] tracking-[0.35em] text-bronze uppercase font-medium mt-0.5">
              Atelier Administration
            </span>
          </Link>
        </div>

        {/* Multi-Tenant Business Switcher */}
        <div data-tour="business-switcher" className="shrink-0">
          <BusinessSwitcher />
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;
            const tourAttr = item.href === "/admin/appearance" ? "appearance-link" : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={tourAttr}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-3.5 py-2.5 text-xs tracking-wider uppercase transition-all duration-200 select-none",
                  isActive
                    ? "bg-charcoal-800 text-bronze border-l-2 border-bronze font-semibold"
                    : "text-canvas-secondary/70 hover:text-canvas-primary hover:bg-charcoal-800/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-bronze" : "text-canvas-secondary/60")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & User Role */}
      <div className="p-4 border-t border-charcoal-800 space-y-3 shrink-0">
        {/* Help & Interactive Guided Tours */}
        <HelpGuideModal
          role={user.role}
          triggerClassName="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-secondary hover:text-bronze bg-charcoal-800/60 hover:bg-charcoal-800 border border-charcoal-700/50 rounded-btn transition-colors"
        />

        {/* User Card */}
        <div className="p-3 bg-charcoal-800/60 border border-charcoal-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif text-canvas-surface truncate max-w-[130px]">
              {user.name}
            </span>
            <span className="px-2 py-0.5 text-[10px] tracking-widest uppercase font-semibold bg-bronze/20 text-bronze border border-bronze/40">
              {user.role}
            </span>
          </div>
          <span className="block text-[11px] text-canvas-secondary/60 truncate mt-1">
            {user.email}
          </span>
        </div>

        {/* Action Links */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center text-canvas-secondary/70 hover:text-bronze transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Live Storefront
          </Link>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center text-rose-400 hover:text-rose-300 transition-colors"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-72 h-screen sticky top-0">{navContent}</div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-charcoal-900 border-b border-charcoal-800 px-4 py-3 flex items-center justify-between text-canvas-primary">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-canvas-primary hover:text-bronze"
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-serif tracking-widest text-sm uppercase">NEXORA Admin</span>
        </div>
        <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-bronze/20 text-bronze border border-bronze/40">
          {user.role}
        </span>
      </div>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-charcoal-900/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 max-w-xs w-full bg-charcoal-900 shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
