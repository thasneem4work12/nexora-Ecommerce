"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { useStoreTenant } from "@/context/StoreTenantContext";
import type { StoreAppearanceConfig } from "@/types/theme";

interface FooterProps {
  appearance?: StoreAppearanceConfig | null;
}

export function Footer({ appearance: propAppearance }: FooterProps) {
  const { business, appearance: tenantAppearance, basePath } = useStoreTenant();
  const appearance = (basePath ? tenantAppearance : null) || propAppearance || tenantAppearance;
  const storeName = appearance?.storeName || business?.name || "NEXORA";
  const storeTagline = appearance?.storeTagline || "Haute Couture";
  const showGuarantees = appearance?.footer?.showGuarantees ?? true;
  const copyrightText =
    appearance?.footer?.copyrightText ||
    `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;
  const footerTagline =
    appearance?.footer?.tagline ||
    "Founded on the belief that true luxury resides in timeless proportions, impeccable textiles, and peerless execution.";
  const contactEmail = appearance?.contactEmail || "concierge@nexoracommerce.com";
  const contactPhone = appearance?.contactPhone || "+1 (800) 456-7890";
  const socialLinks = appearance?.footer?.socialLinks || [
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "pinterest", url: "https://pinterest.com" },
    { platform: "linkedin", url: "https://linkedin.com" },
  ];
  const catalogHref = `${basePath}/products`;

  return (
    <footer className="bg-canvas-secondary border-t border-border-default pt-16 pb-12 text-charcoal-700">
      {/* Guarantees Bar */}
      {showGuarantees && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-border-subtle">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="p-3 bg-canvas-primary rounded-card border border-border-default text-bronze">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
                  Complimentary Shipping
                </h4>
                <p className="text-xs text-charcoal-500 mt-1">
                  On all international orders over $150 with insured courier dispatch.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="p-3 bg-canvas-primary rounded-card border border-border-default text-bronze">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
                  Artisanal Provenance
                </h4>
                <p className="text-xs text-charcoal-500 mt-1">
                  Every creation comes with a verified digital certificate of authenticity.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="p-3 bg-canvas-primary rounded-card border border-border-default text-bronze">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
                  Discreet Returns
                </h4>
                <p className="text-xs text-charcoal-500 mt-1">
                  30-day effortless return privilege with door-to-door concierge pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-2xl font-serif tracking-[0.25em] text-charcoal-900 uppercase">
                {storeName}
              </span>
              {storeTagline && (
                <span className="text-[9px] tracking-[0.35em] text-charcoal-500 uppercase -mt-0.5 font-light">
                  {storeTagline}
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              {footerTagline}
            </p>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
              The Collections
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href={`${catalogHref}?category=apparel`} className="hover:text-bronze transition-colors">
                  Tailored Apparel
                </Link>
              </li>
              <li>
                <Link href={`${catalogHref}?category=footwear`} className="hover:text-bronze transition-colors">
                  Hand-Welted Footwear
                </Link>
              </li>
              <li>
                <Link href={`${catalogHref}?category=accessories`} className="hover:text-bronze transition-colors">
                  Fine Leather & Accoutrements
                </Link>
              </li>
              <li>
                <Link href={catalogHref} className="hover:text-bronze transition-colors">
                  Seasonal Lookbook
                </Link>
              </li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
              Client Concierge
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/account/orders" className="hover:text-bronze transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/account/support" className="hover:text-bronze transition-colors">
                  Concierge Support
                </Link>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className="hover:text-bronze transition-colors">
                  Email: {contactEmail}
                </a>
              </li>
              <li>
                <span className="text-charcoal-500">
                  Tel: {contactPhone}
                </span>
              </li>
            </ul>
          </div>

          {/* Maison & Social Links */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
              The Maison
            </h4>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Private appointments available at our London, Paris, and Tokyo ateliers.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs uppercase tracking-wider text-charcoal-500 hover:text-bronze transition-colors"
                >
                  {social.platform}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-charcoal-500 gap-4">
          <p>{copyrightText}</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="hover:text-charcoal-900 transition-colors">
              Privacy Protocol
            </Link>
            <Link href="/terms" className="hover:text-charcoal-900 transition-colors">
              Terms of Commission
            </Link>
            <Link href="/admin" className="hover:text-charcoal-900 transition-colors">
              Maison Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
