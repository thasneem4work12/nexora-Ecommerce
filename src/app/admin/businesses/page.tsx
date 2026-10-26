"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Store,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BusinessCardData {
  id: string;
  name: string;
  slug: string;
  type: string;
  role: string;
  status: string;
  defaultCurrency: string;
  productCount: number;
  orderCount: number;
  memberCount: number;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>("default-store");
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/businesses");
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data.businesses || []);
          setActiveBusinessId(data.activeBusinessId || "default-store");
        }
      } catch (err) {
        console.error("Error loading businesses:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId) return;
    setSwitchingId(businessId);
    try {
      const res = await fetch("/api/admin/businesses/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (res.ok) {
        window.location.href = "/admin";
      }
    } catch (err) {
      console.error("Error switching:", err);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Multi-Tenant Administration
          </span>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Storefronts & Businesses
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            Manage your independent stores with dedicated catalogs, branding, inventory ledgers, and team members.
          </p>
        </div>

        <Link href="/admin/businesses/new">
          <Button variant="primary" size="md" className="flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Onboard New Store
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-canvas-secondary/50 animate-pulse rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((biz) => {
            const isActive = biz.id === activeBusinessId;
            return (
              <div
                key={biz.id}
                className={`bg-canvas-surface rounded-card border transition-all duration-200 p-6 flex flex-col justify-between ${
                  isActive
                    ? "border-bronze shadow-md ring-1 ring-bronze/30"
                    : "border-border-default hover:border-charcoal-400"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-sm bg-canvas-secondary flex items-center justify-center text-bronze border border-border-subtle">
                      <Store className="w-5 h-5" />
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center text-[11px] uppercase tracking-wider px-2 py-0.5 bg-bronze/15 text-bronze font-semibold rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active Store
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-canvas-secondary text-charcoal-600 font-medium rounded">
                        {biz.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-serif font-medium text-charcoal-900">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-charcoal-500 mt-0.5">{biz.type}</p>
                    <div className="mt-2 flex items-center space-x-2 text-[11px] text-charcoal-600">
                      <span className="font-mono bg-canvas-secondary px-1.5 py-0.5 rounded">
                        /store/{biz.slug}
                      </span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-bronze">{biz.role}</span>
                    </div>
                  </div>

                  {/* Metrics snapshot */}
                  <div className="mt-6 pt-4 border-t border-border-subtle grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-canvas-secondary/40 rounded">
                      <span className="block text-xs font-semibold text-charcoal-900">
                        {biz.productCount}
                      </span>
                      <span className="text-[10px] uppercase text-charcoal-500">Products</span>
                    </div>
                    <div className="p-2 bg-canvas-secondary/40 rounded">
                      <span className="block text-xs font-semibold text-charcoal-900">
                        {biz.orderCount}
                      </span>
                      <span className="text-[10px] uppercase text-charcoal-500">Orders</span>
                    </div>
                    <div className="p-2 bg-canvas-secondary/40 rounded">
                      <span className="block text-xs font-semibold text-charcoal-900">
                        {biz.memberCount}
                      </span>
                      <span className="text-[10px] uppercase text-charcoal-500">Team</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
                  <Link
                    href={`/store/${biz.slug}`}
                    target="_blank"
                    className="text-xs text-charcoal-600 hover:text-bronze transition-colors flex items-center"
                  >
                    View Storefront <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>

                  {!isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitch(biz.id)}
                      disabled={switchingId === biz.id}
                      className="text-xs"
                    >
                      {switchingId === biz.id ? "Switching..." : "Switch to Store"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
