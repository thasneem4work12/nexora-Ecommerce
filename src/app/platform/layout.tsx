import React from "react";
import Link from "next/link";
import { requirePlatformPageSession } from "@/lib/admin-auth";
import {
  ShieldCheck,
  Building2,
  LayoutDashboard,
  ArrowLeft,
  Sliders,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verified = await requirePlatformPageSession();
  const { user } = verified;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-charcoal-900 flex flex-col">
      {/* Top Platform Bar */}
      <header className="bg-charcoal-950 text-white border-b border-charcoal-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/platform" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-bronze flex items-center justify-center text-white shadow">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg tracking-wider font-semibold">NEXORA</span>
                <span className="text-[10px] tracking-widest text-bronze uppercase -mt-1 font-mono">
                  Platform Superadmin
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-charcoal-800">
              <Link
                href="/platform"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Overview</span>
              </Link>
              <Link
                href="/platform/businesses"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Tenants & Businesses</span>
              </Link>
              <Link
                href="/platform/plans"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Plans & Pricing</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-medium text-white/70 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store Admin</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-charcoal-800">
              <div className="w-7 h-7 rounded-full bg-bronze/20 text-bronze flex items-center justify-center text-xs font-bold font-mono">
                {user.name?.charAt(0) || "S"}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-medium text-white/90">{user.name}</span>
                <span className="text-[10px] font-mono text-emerald-400">SUPERADMIN</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
