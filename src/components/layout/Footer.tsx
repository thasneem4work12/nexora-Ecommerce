"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, RefreshCw } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-canvas-secondary border-t border-border-default pt-16 pb-12 text-charcoal-700">
      {/* Guarantees Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-border-subtle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="p-3 bg-canvas-primary border border-border-default text-bronze">
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
            <div className="p-3 bg-canvas-primary border border-border-default text-bronze">
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
            <div className="p-3 bg-canvas-primary border border-border-default text-bronze">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-2xl font-serif tracking-[0.25em] text-charcoal-900 uppercase">
                NEXORA
              </span>
              <span className="text-[9px] tracking-[0.35em] text-charcoal-500 uppercase -mt-0.5 font-light">
                Haute Couture
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Founded on the belief that true luxury resides in timeless proportions,
              impeccable textiles, and peerless execution.
            </p>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
              The Collections
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/products?category=apparel" className="hover:text-bronze transition-colors">
                  Tailored Apparel
                </Link>
              </li>
              <li>
                <Link href="/products?category=footwear" className="hover:text-bronze transition-colors">
                  Hand-Welted Footwear
                </Link>
              </li>
              <li>
                <Link href="/products?category=accessories" className="hover:text-bronze transition-colors">
                  Fine Leather & Accoutrements
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-bronze transition-colors">
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
                <Link href="/account" className="hover:text-bronze transition-colors">
                  My Private Account
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-bronze transition-colors">
                  Order Tracking & History
                </Link>
              </li>
              <li>
                <span className="text-charcoal-500">concierge@nexoracommerce.com</span>
              </li>
              <li>
                <span className="text-charcoal-500">+1 (800) 948-2041</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
              Private Dispatch
            </h4>
            <p className="text-xs text-charcoal-500">
              Receive private invitations to seasonal private viewings and new limited editions.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center">
              <input
                type="email"
                placeholder="Enter email address"
                className="bg-canvas-primary border border-border-default px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus:border-bronze flex-1 rounded-none placeholder:text-charcoal-300"
              />
              <button
                type="submit"
                className="bg-charcoal-900 text-canvas-primary px-4 py-2 hover:bg-bronze transition-colors text-xs uppercase tracking-wider"
                aria-label="Subscribe"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-charcoal-500 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} NEXORA Commerce Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="hover:text-charcoal-900 cursor-pointer">Privacy Charter</span>
            <span className="hover:text-charcoal-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-charcoal-900 cursor-pointer">Security Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
