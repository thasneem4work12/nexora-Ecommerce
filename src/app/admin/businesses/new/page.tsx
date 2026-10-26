"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const THEMES = [
  {
    id: "editorial-luxury",
    name: "Editorial Luxury",
    tagline: "Serif typography, bronze accents, warm parchment tones.",
    vibe: "Haute couture, horology, fine leathercraft.",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    tagline: "Ultra-clean sans-serif, cool slate canvas, precision layout.",
    vibe: "Consumer tech, audio, architectural design.",
  },
  {
    id: "midnight-noir",
    name: "Midnight Noir",
    tagline: "Deep charcoal obsidian canvas with luminous amber touches.",
    vibe: "High jewelry, luxury horology, bespoke evening wear.",
  },
  {
    id: "orange-energy",
    name: "Orange Energy",
    tagline: "Punchy vibrant vermilion, high-contrast streetwear aesthetic.",
    vibe: "Sneakers, athletic lifestyle, hype merchandise.",
  },
];

const CURRENCIES = ["USD", "EUR", "GBP", "LKR", "JPY", "CAD", "AUD"];

export default function NewBusinessPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [type, setType] = useState("Consumer Electronics & Audio");
  const [currency, setCurrency] = useState("USD");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("modern-minimal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a business name.");
      return;
    }

    if (!slug.trim()) {
      setError("Please provide a valid URL slug.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          type: type.trim(),
          defaultCurrency: currency,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          themeId: selectedTheme,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to onboard business.");
      }

      // Success: redirect to admin overview
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during onboarding.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/businesses"
          className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-600 hover:text-bronze transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to Stores
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-border-default pb-6">
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          Tenant Onboarding
        </span>
        <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
          Launch a New Storefront
        </h1>
        <p className="text-sm text-charcoal-500 mt-1">
          Each store operates with strict data isolation, an independent product catalog, custom inventory ledger, and unique branding.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8 bg-canvas-surface p-8 rounded-card border border-border-default shadow-sm">
        {/* Core Identity */}
        <div className="space-y-5">
          <h2 className="text-base font-serif text-charcoal-900 border-b border-border-subtle pb-2">
            1. Store Identity & Domain
          </h2>

          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
              Store Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Lumina Audio, Apex Streetwear"
              required
              className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
              Public Storefront URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 bg-canvas-secondary border border-r-0 border-border-default text-xs font-mono text-charcoal-500 rounded-l">
                /store/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSlugManuallyEdited(true);
                }}
                placeholder="lumina-audio"
                required
                className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-r text-sm font-mono text-charcoal-900 focus:outline-none focus:border-bronze"
              />
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              This slug identifies your store publicly and routes visitors to your dedicated storefront.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
                Discipline / Category Type
              </label>
              <input
                id="type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. Luxury Footwear, High Audio"
                className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
                Default Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-5 pt-4 border-t border-border-subtle">
          <h2 className="text-base font-serif text-charcoal-900 border-b border-border-subtle pb-2">
            2. Contact & Concierge
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactEmail" className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
                Concierge Contact Email
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="concierge@mystore.com"
                className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-700 font-semibold mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (800) 123-4567"
                className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded text-sm text-charcoal-900 focus:outline-none focus:border-bronze"
              />
            </div>
          </div>
        </div>

        {/* Theme Engine Selection */}
        <div className="space-y-5 pt-4 border-t border-border-subtle">
          <div>
            <h2 className="text-base font-serif text-charcoal-900">
              3. Visual Theme & Brand DNA
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Select an initial aesthetic. You can further customize colors, typography, and sections in the Appearance Studio anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-4 rounded-card border cursor-pointer transition-all ${
                    isSelected
                      ? "border-bronze bg-bronze/5 ring-1 ring-bronze shadow-sm"
                      : "border-border-default hover:border-charcoal-400 bg-canvas-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-medium text-charcoal-900 text-sm">
                      {theme.name}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-bronze" />}
                  </div>
                  <p className="text-xs text-charcoal-600 mt-1">{theme.tagline}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-charcoal-400 bg-canvas-secondary px-2 py-0.5 rounded">
                    Best for: {theme.vibe}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Ownership Notice */}
        <div className="p-4 bg-canvas-secondary/60 rounded border border-border-subtle text-xs text-charcoal-600 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-bronze flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            By creating this store, your account will be designated as the authoritative <strong>OWNER</strong>. You can grant Manager or Staff privileges to additional team members at any time in Team & Permissions.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border-subtle">
          <Link href="/admin/businesses">
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              "Initializing Atelier..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Launch Storefront
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
