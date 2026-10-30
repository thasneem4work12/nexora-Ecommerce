"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Eye, Info, Layers, Check } from "lucide-react";
import type { ThemeId } from "@/types/theme";

interface ProductLiveCardPreviewProps {
  title: string;
  categoryName: string;
  basePrice: number; // in dollars
  primaryImageUrl?: string;
  featured: boolean;
  totalStock: number;
  hasVariants: boolean;
}

export function ProductLiveCardPreview({
  title,
  categoryName,
  basePrice,
  primaryImageUrl,
  featured,
  totalStock,
  hasVariants,
}: ProductLiveCardPreviewProps) {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("editorial-luxury");

  const displayTitle = title.trim() || "Untitled Atelier Creation";
  const displayCategory = categoryName || "Curated Discipline";
  const displayPrice = basePrice > 0 ? basePrice * 100 : 0;
  const displayImage =
    primaryImageUrl?.trim() ||
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800";

  // Palette theme styling for the preview container
  const getThemeStyles = () => {
    switch (activeTheme) {
      case "midnight-noir":
        return {
          wrapper: "bg-[#09090B] text-[#FAFAFA] border-[#27272A]",
          card: "bg-[#18181B] border-[#27272A] text-white",
          accent: "text-[#D4AF37]",
          badge: "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30",
        };
      case "modern-minimal":
        return {
          wrapper: "bg-[#FFFFFF] text-[#18181B] border-[#E4E4E7]",
          card: "bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B]",
          accent: "text-[#18181B]",
          badge: "bg-[#18181B] text-white",
        };
      case "orange-energy":
        return {
          wrapper: "bg-[#0A0A0A] text-white border-[#FF5500]/30",
          card: "bg-[#171717] border-[#262626] text-white",
          accent: "text-[#FF5500]",
          badge: "bg-[#FF5500] text-black font-bold",
        };
      case "editorial-luxury":
      default:
        return {
          wrapper: "bg-[#FDFBF7] text-[#1A1817] border-[#E8E2D6]",
          card: "bg-white border-[#E8E2D6] text-[#1A1817]",
          accent: "text-[#B38E5D]",
          badge: "bg-[#B38E5D]/15 text-[#B38E5D] border border-[#B38E5D]/30",
        };
    }
  };

  const themeStyle = getThemeStyles();

  return (
    <div
      data-tour="product-card-preview"
      className="sticky top-6 rounded-card border border-border-default bg-canvas-surface p-5 space-y-4 shadow-sm"
    >
      {/* Header and Theme Selector */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-bronze" />
          <h3 className="text-xs uppercase tracking-luxury font-bold text-charcoal-900">
            Live Storefront Card Preview
          </h3>
        </div>

        {/* Theme Preview Switcher */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-charcoal-400 uppercase tracking-wider font-mono mr-1">
            Theme:
          </span>
          {(
            [
              { id: "editorial-luxury", label: "Edit" },
              { id: "midnight-noir", label: "Noir" },
              { id: "modern-minimal", label: "Mini" },
              { id: "orange-energy", label: "Apex" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTheme(t.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono transition-colors ${
                activeTheme === t.id
                  ? "bg-bronze text-white font-bold"
                  : "text-charcoal-500 hover:bg-canvas-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Storefront Card */}
      <div className={`p-4 rounded-card border transition-all ${themeStyle.wrapper}`}>
        <div
          className={`group rounded-card border overflow-hidden shadow-sm transition-all flex flex-col ${themeStyle.card}`}
        >
          {/* Product Image Mock */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-200">
            <Image
              src={displayImage}
              alt={displayTitle}
              fill
              className="object-cover object-center"
              sizes="320px"
            />

            {/* Badges Overlay */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
              {featured && (
                <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-xs shadow-xs ${themeStyle.badge}`}>
                  Curated
                </span>
              )}
              {totalStock <= 3 && totalStock > 0 && (
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-xs bg-amber-500 text-white shadow-xs">
                  Few Pieces Left
                </span>
              )}
              {totalStock === 0 && (
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-xs bg-rose-600 text-white shadow-xs">
                  Sold Out
                </span>
              )}
            </div>

            {/* Quick Add Overlay Hint */}
            <div className="absolute inset-x-0 bottom-0 py-2 px-3 bg-black/40 backdrop-blur-xs text-white text-[10px] uppercase tracking-wider text-center font-medium opacity-80">
              Customer Hover: Quick Add
            </div>
          </div>

          {/* Product Details */}
          <div className="p-3.5 space-y-2">
            <div>
              <span className="text-[9px] uppercase tracking-luxury text-charcoal-400 font-medium block">
                {displayCategory}
              </span>
              <h4 className="text-xs font-serif font-semibold mt-0.5 line-clamp-1">
                {displayTitle}
              </h4>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
              <span className={`text-sm font-semibold font-mono ${themeStyle.accent}`}>
                {displayPrice > 0 ? formatPrice(displayPrice) : "Price on Request"}
              </span>

              <span className="text-[10px] text-charcoal-400 font-mono">
                {hasVariants ? `${totalStock} in stock` : `${totalStock} units`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Crop & Image Guidance Note */}
      <div className="p-3 rounded-card bg-canvas-secondary/50 border border-border-subtle text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-charcoal-700 font-medium">
          <Info className="w-3.5 h-3.5 text-bronze" />
          <span>Optimal Image Guidance</span>
        </div>
        <p className="text-[11px] text-charcoal-500 font-light leading-relaxed">
          Storefront catalog grids use a <strong>3:4 vertical portrait ratio</strong> (e.g. 1200 x 1600 px). Center the subject to avoid cropping on mobile screens.
        </p>
      </div>
    </div>
  );
}
