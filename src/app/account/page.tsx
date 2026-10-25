"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Package,
  MapPin,
  LogOut,
  Shield,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-bronze border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-luxury text-charcoal-500">
            Verifying Private Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-canvas-surface border border-border-default p-8 sm:p-10 text-center space-y-6 shadow-editorial">
          <div className="w-16 h-16 bg-canvas-secondary rounded-full flex items-center justify-center mx-auto text-bronze">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-charcoal-900">
              Private Area Protected
            </h1>
            <p className="text-xs text-charcoal-500 font-light mt-2 leading-relaxed">
              You must authenticate with your client credentials to view your order history and bespoke measurements.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/login">
              <Button variant="primary" size="md" className="w-full">
                Sign In to Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" size="md" className="w-full">
                Create New Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Account Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border-default pb-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              Client Portal
            </span>
            <Badge variant="bronze">
              {(user as { role?: string }).role || "Private Client"}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-charcoal-500 font-mono">
            {user.email} • ID: {user.id.substring(0, 12)}...
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {(user as { role?: string }).role &&
            (user as { role?: string }).role !== "CUSTOMER" && (
              <Link href="/admin">
                <Button variant="primary" size="sm" className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" /> Atelier Admin
                </Button>
              </Link>
            )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center text-charcoal-700 hover:text-rose-700 hover:border-rose-300"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Quick Profile Info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-canvas-surface border border-border-default p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle flex items-center">
              <User className="w-4 h-4 mr-2 text-bronze" /> Client Details
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-charcoal-500 block">Name</span>
                <span className="font-medium text-charcoal-900">{user.name}</span>
              </div>
              <div>
                <span className="text-charcoal-500 block">Email Address</span>
                <span className="font-medium text-charcoal-900">{user.email}</span>
              </div>
              <div>
                <span className="text-charcoal-500 block">Membership Privilege</span>
                <span className="font-medium text-bronze">Private Member (Phase 1 Validated)</span>
              </div>
            </div>
          </div>

          <div className="bg-canvas-surface border border-border-default p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-bronze" /> Saved Shipping Concierge
            </h2>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              No private delivery addresses on file yet. Your primary address will be saved securely upon your first checkout.
            </p>
          </div>
        </div>

        {/* Right Column: Order History & Activities (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-canvas-surface border border-border-default p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h2 className="text-base font-serif text-charcoal-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-bronze" /> Order History & Dispatches
              </h2>
              <span className="text-xs text-charcoal-500">0 Total Orders</span>
            </div>

            {/* Empty Orders State */}
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 bg-canvas-secondary rounded-full flex items-center justify-center mx-auto text-charcoal-300">
                <Clock className="w-6 h-6 text-bronze/60" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-charcoal-900">
                  No previous orders placed
                </h3>
                <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                  When you place an order, your tracking details, provenance certificate, and courier updates will appear here.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/account/orders">
                  <Button variant="primary" size="sm" className="mt-2">
                    View Orders Portal
                  </Button>
                </Link>
                <Link href="/products">
                  <Button variant="outline" size="sm" className="mt-2">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
