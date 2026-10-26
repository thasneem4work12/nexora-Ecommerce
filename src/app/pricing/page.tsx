"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

interface PlanPrice {
  id: string;
  interval: "MONTHLY" | "YEARLY";
  amountInCents: number;
  currency: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  maxProducts: number;
  maxStaff: number;
  maxStorageMb: number;
  allowCustomThemes: boolean;
  allowAdvancedAnalytics: boolean;
  allowPrioritySupport: boolean;
  trialDays: number;
  sortOrder: number;
  features: string[];
  prices: PlanPrice[];
}

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/saas/plans");
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const getPrice = (plan: Plan) => {
    return plan.prices.find((p) => p.interval === billingInterval) || plan.prices[0];
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-charcoal-900 selection:bg-bronze selection:text-white">
      {/* Hero Header */}
      <div className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#EAE5D9]/60">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bronze/10 text-bronze text-xs font-semibold tracking-wider uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            NEXORA SaaS Platform Billing
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight text-charcoal-900 mb-6">
            Architectural Commerce for Modern Ateliers
          </h1>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
            Choose the scale designed for your luxury brand. All plans include secure multi-tenant isolation,
            editorial storefront themes, and automated inventory management.
          </p>

          {/* Billing Interval Toggle */}
          <div className="mt-10 inline-flex items-center p-1.5 rounded-full bg-[#EFECE6] border border-[#DDD7CD]">
            <button
              onClick={() => setBillingInterval("MONTHLY")}
              className={`px-6 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                billingInterval === "MONTHLY"
                  ? "bg-white text-charcoal-900 shadow-sm"
                  : "text-charcoal-600 hover:text-charcoal-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval("YEARLY")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                billingInterval === "YEARLY"
                  ? "bg-white text-charcoal-900 shadow-sm"
                  : "text-charcoal-600 hover:text-charcoal-900"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bronze text-white uppercase tracking-normal">
                2 Months Free
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="text-center py-20 text-charcoal-500 font-serif">
            Loading luxury commerce plans...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const price = getPrice(plan);
              const isGrowth = plan.code === "growth";
              const monthlyEquivalent =
                billingInterval === "YEARLY" && price
                  ? Math.round(price.amountInCents / 12)
                  : price?.amountInCents || 0;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-8 transition-all duration-300 ${
                    isGrowth
                      ? "bg-[#18181B] text-white shadow-2xl ring-2 ring-bronze md:-translate-y-2"
                      : "bg-white text-charcoal-900 border border-[#EAE5D9] shadow-sm hover:shadow-md"
                  }`}
                >
                  {isGrowth && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-bronze text-white text-[11px] font-bold tracking-widest uppercase shadow">
                      Most Popular Tier
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-2xl tracking-wide">{plan.name}</h2>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          isGrowth
                            ? "bg-white/10 text-white/90"
                            : "bg-[#F3EFE6] text-charcoal-700"
                        }`}
                      >
                        {plan.trialDays > 0 ? `${plan.trialDays}-Day Free Trial` : "Instant Access"}
                      </span>
                    </div>

                    <p
                      className={`text-sm mb-6 min-h-[40px] ${
                        isGrowth ? "text-white/70" : "text-charcoal-600"
                      }`}
                    >
                      {plan.description}
                    </p>

                    <div className="mb-6 pb-6 border-b border-inherit/20">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs uppercase tracking-wider font-semibold">USD</span>
                        <span className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">
                          ${((price?.amountInCents ?? 0) / 100).toFixed(0)}
                        </span>
                        <span
                          className={`text-xs ${
                            isGrowth ? "text-white/60" : "text-charcoal-500"
                          }`}
                        >
                          /{billingInterval === "YEARLY" ? "year" : "month"}
                        </span>
                      </div>
                      {billingInterval === "YEARLY" && price && price.amountInCents > 0 && (
                        <p
                          className={`text-xs mt-1.5 ${
                            isGrowth ? "text-white/60" : "text-charcoal-500"
                          }`}
                        >
                          Effective ${(monthlyEquivalent / 100).toFixed(0)}/mo billed annually
                        </p>
                      )}
                    </div>

                    {/* Feature List */}
                    <ul className="space-y-3.5 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              isGrowth ? "text-bronze" : "text-bronze"
                            }`}
                          />
                          <span className={isGrowth ? "text-white/90" : "text-charcoal-700"}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Link
                      href={`/register?plan=${plan.code}&interval=${billingInterval.toLowerCase()}`}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-xs tracking-wider uppercase transition-all duration-200 ${
                        isGrowth
                          ? "bg-bronze hover:bg-bronze-dark text-white shadow-lg"
                          : "bg-charcoal-900 hover:bg-black text-white"
                      }`}
                    >
                      <span>Start with {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <p
                      className={`text-center text-[11px] mt-3 ${
                        isGrowth ? "text-white/50" : "text-charcoal-500"
                      }`}
                    >
                      No contracts • Cancel anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EAE5D9]">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-charcoal-900 mb-3">Compare Platform Capabilities</h2>
          <p className="text-sm text-charcoal-600">
            Transparent enterprise infrastructure without hidden fees or surprise overages.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#EAE5D9] bg-white shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#EAE5D9] bg-[#FAF8F5]">
                <th className="py-4 px-6 font-serif text-charcoal-900 font-semibold">Capability</th>
                <th className="py-4 px-6 text-center text-charcoal-900 font-semibold">Starter</th>
                <th className="py-4 px-6 text-center text-charcoal-900 font-semibold bg-bronze/5">Growth</th>
                <th className="py-4 px-6 text-center text-charcoal-900 font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5D9]">
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Active Catalog Products</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">50</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">500</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">2,500</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Staff Accounts & Roles</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">2</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">10</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">25</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Media & Asset Storage</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">1 GB</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">5 GB</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">25 GB</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Themes & Appearance Studio</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">2 Built-in Themes</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">All 4 Premium Themes</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">Custom CSS Engine</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Analytics & Sales Reporting</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">Standard</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">Advanced Insights</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">Real-Time & Export</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Support Level</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">Email</td>
                <td className="py-3.5 px-6 text-center text-charcoal-900 font-medium bg-bronze/5">Priority Email</td>
                <td className="py-3.5 px-6 text-center text-charcoal-600">24/7 Dedicated Concierge</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-charcoal-800">Storefront Transaction Fee</td>
                <td className="py-3.5 px-6 text-center text-emerald-700 font-semibold">0%</td>
                <td className="py-3.5 px-6 text-center text-emerald-700 font-semibold bg-bronze/5">0%</td>
                <td className="py-3.5 px-6 text-center text-emerald-700 font-semibold">0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EAE5D9]">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-charcoal-900 mb-3">Frequently Asked Questions</h2>
          <p className="text-sm text-charcoal-600">Everything you need to know about NEXORA SaaS billing.</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white border border-[#EAE5D9]">
            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
              Are customer storefront payments separated from my SaaS subscription?
            </h3>
            <p className="text-sm text-charcoal-600 leading-relaxed">
              Yes, absolutely. Storefront customer transactions flow directly into your merchant accounts with isolated order records. NEXORA SaaS billing is an independent subscription system with dedicated invoices, payments, and accounting records.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#EAE5D9]">
            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
              What happens if my business exceeds its product or staff limits?
            </h3>
            <p className="text-sm text-charcoal-600 leading-relaxed">
              We never interrupt active storefront operations or delete existing data. If your business reaches its product or staff limit, the admin dashboard will notify you to upgrade your plan before publishing additional items or inviting more collaborators.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#EAE5D9]">
            <h3 className="font-serif text-lg font-semibold text-charcoal-900 mb-2">
              Can I upgrade or downgrade my plan at any time?
            </h3>
            <p className="text-sm text-charcoal-600 leading-relaxed">
              Yes. Upgrades take effect immediately with full access to new capacity. Downgrades are verified against your current catalog so you never accidentally delete active products or staff accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
