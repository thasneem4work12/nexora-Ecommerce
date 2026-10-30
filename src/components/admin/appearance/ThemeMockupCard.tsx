"use client";

import React from "react";
import type { ThemeId } from "@/types/theme";

interface ThemeMockupCardProps {
  themeId: ThemeId;
}

export function ThemeMockupCard({ themeId }: ThemeMockupCardProps) {
  switch (themeId) {
    case "editorial-luxury":
      return (
        <div className="w-full h-40 bg-[#FDFBF7] border border-[#E8E2D6] rounded-t-card overflow-hidden flex flex-col justify-between p-3 select-none transition-transform group-hover:scale-[1.01]">
          {/* Mock Nav */}
          <div className="flex items-center justify-between border-b border-[#E8E2D6]/80 pb-2">
            <span className="font-serif text-[11px] tracking-[0.2em] text-[#1A1817] uppercase font-bold">
              NEXORA
            </span>
            <div className="flex gap-2">
              <span className="h-1.5 w-6 bg-[#B38E5D]/60 rounded-full"></span>
              <span className="h-1.5 w-4 bg-[#7A7571]/40 rounded-full"></span>
            </div>
          </div>

          {/* Mock Hero Split */}
          <div className="grid grid-cols-12 gap-2 my-auto items-center">
            <div className="col-span-7 space-y-1">
              <span className="text-[8px] tracking-widest text-[#B38E5D] uppercase font-semibold">
                Haute Horlogerie
              </span>
              <div className="h-2 w-28 bg-[#1A1817] rounded-sm"></div>
              <div className="h-1.5 w-20 bg-[#7A7571]/60 rounded-sm"></div>
              <div className="pt-1 flex gap-1">
                <span className="inline-block px-1.5 py-0.5 text-[7px] uppercase tracking-wider bg-[#B38E5D] text-white font-medium rounded-xs">
                  Discover
                </span>
              </div>
            </div>
            <div className="col-span-5 h-16 bg-[#F4F0E6] border border-[#E8E2D6] rounded-xs flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#B38E5D]/20 to-transparent"></div>
              <span className="text-[9px] font-serif text-[#B38E5D] italic">Maison</span>
            </div>
          </div>

          {/* Mock Catalog Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#E8E2D6]/60">
            <div className="h-9 bg-[#F4F0E6] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#1A1817]/40 rounded-xs"></div>
              <span className="text-[7px] text-[#B38E5D] font-mono">$1,850</span>
            </div>
            <div className="h-9 bg-[#F4F0E6] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#1A1817]/40 rounded-xs"></div>
              <span className="text-[7px] text-[#B38E5D] font-mono">$2,400</span>
            </div>
            <div className="h-9 bg-[#F4F0E6] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#1A1817]/40 rounded-xs"></div>
              <span className="text-[7px] text-[#B38E5D] font-mono">$3,100</span>
            </div>
          </div>
        </div>
      );

    case "midnight-noir":
      return (
        <div className="w-full h-40 bg-[#09090B] border border-[#27272A] rounded-t-card overflow-hidden flex flex-col justify-between p-3 select-none transition-transform group-hover:scale-[1.01]">
          {/* Mock Nav */}
          <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
            <span className="font-sans font-bold text-[10px] tracking-[0.25em] text-[#FAFAFA] uppercase">
              NOIR • ATELIER
            </span>
            <div className="flex gap-1.5 items-center">
              <span className="h-1.5 w-1.5 bg-[#D4AF37] rounded-full"></span>
              <span className="h-1.5 w-5 bg-[#3F3F46] rounded-full"></span>
            </div>
          </div>

          {/* Mock Hero Split */}
          <div className="grid grid-cols-12 gap-2 my-auto items-center">
            <div className="col-span-7 space-y-1">
              <span className="text-[8px] tracking-widest text-[#D4AF37] uppercase font-bold">
                Limited Archive
              </span>
              <div className="h-2 w-24 bg-[#FAFAFA] rounded-sm"></div>
              <div className="h-1.5 w-16 bg-[#71717A] rounded-sm"></div>
              <div className="pt-1">
                <span className="inline-block px-1.5 py-0.5 text-[7px] uppercase tracking-wider bg-[#D4AF37] text-black font-bold rounded-xs shadow-xs">
                  Exclusive
                </span>
              </div>
            </div>
            <div className="col-span-5 h-16 bg-[#18181B] border border-[#27272A] rounded-xs flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-radial from-[#D4AF37]/15 to-transparent"></div>
              <span className="text-[9px] font-mono text-[#D4AF37] font-semibold">01 / ARCHIVE</span>
            </div>
          </div>

          {/* Mock Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#27272A]">
            <div className="h-9 bg-[#18181B] border border-[#27272A] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#A1A1AA]/30 rounded-xs"></div>
              <span className="text-[7px] text-[#D4AF37] font-mono font-bold">$980</span>
            </div>
            <div className="h-9 bg-[#18181B] border border-[#27272A] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#A1A1AA]/30 rounded-xs"></div>
              <span className="text-[7px] text-[#D4AF37] font-mono font-bold">$1,450</span>
            </div>
            <div className="h-9 bg-[#18181B] border border-[#27272A] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-[#A1A1AA]/30 rounded-xs"></div>
              <span className="text-[7px] text-[#D4AF37] font-mono font-bold">$2,200</span>
            </div>
          </div>
        </div>
      );

    case "modern-minimal":
      return (
        <div className="w-full h-40 bg-[#FFFFFF] border border-[#E4E4E7] rounded-t-card overflow-hidden flex flex-col justify-between p-3 select-none transition-transform group-hover:scale-[1.01]">
          {/* Mock Nav */}
          <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2">
            <span className="font-mono text-[10px] tracking-tight text-[#18181B] uppercase font-semibold">
              minimal.haus
            </span>
            <div className="flex gap-2">
              <span className="h-1.5 w-4 bg-[#18181B] rounded-full"></span>
              <span className="h-1.5 w-4 bg-[#E4E4E7] rounded-full"></span>
            </div>
          </div>

          {/* Mock Hero */}
          <div className="grid grid-cols-12 gap-2 my-auto items-center">
            <div className="col-span-7 space-y-1.5">
              <span className="text-[8px] font-mono text-[#71717A] uppercase">
                FORM & FUNCTION
              </span>
              <div className="h-2.5 w-24 bg-[#18181B] rounded-xs"></div>
              <div className="h-1.5 w-16 bg-[#A1A1AA] rounded-xs"></div>
            </div>
            <div className="col-span-5 h-16 bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center">
              <span className="text-[8px] font-mono text-[#71717A]">STUDIO 01</span>
            </div>
          </div>

          {/* Mock Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#F4F4F5]">
            <div className="h-9 bg-[#FAFAFA] border border-[#E4E4E7] p-1 flex flex-col justify-between">
              <div className="h-1 w-3/4 bg-[#18181B]/40"></div>
              <span className="text-[7px] text-[#18181B] font-mono">$420</span>
            </div>
            <div className="h-9 bg-[#FAFAFA] border border-[#E4E4E7] p-1 flex flex-col justify-between">
              <div className="h-1 w-3/4 bg-[#18181B]/40"></div>
              <span className="text-[7px] text-[#18181B] font-mono">$680</span>
            </div>
            <div className="h-9 bg-[#FAFAFA] border border-[#E4E4E7] p-1 flex flex-col justify-between">
              <div className="h-1 w-3/4 bg-[#18181B]/40"></div>
              <span className="text-[7px] text-[#18181B] font-mono">$890</span>
            </div>
          </div>
        </div>
      );

    case "orange-energy":
      return (
        <div className="w-full h-40 bg-[#0A0A0A] border border-[#FF5500]/30 rounded-t-card overflow-hidden flex flex-col justify-between p-3 select-none transition-transform group-hover:scale-[1.01] relative">
          {/* Diagonal Energy Accent Stripe */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#FF5500]/15 rotate-45 pointer-events-none"></div>

          {/* Mock Nav */}
          <div className="flex items-center justify-between border-b border-[#262626] pb-2 relative z-10">
            <span className="font-black text-[11px] tracking-tight text-[#FFFFFF] italic uppercase">
              APEX<span className="text-[#FF5500]">.</span>ENERGY
            </span>
            <span className="px-1.5 py-0.2 bg-[#FF5500] text-black font-black text-[7px] uppercase tracking-wider rounded-xs">
              DROP 04
            </span>
          </div>

          {/* Mock Hero */}
          <div className="grid grid-cols-12 gap-2 my-auto items-center relative z-10">
            <div className="col-span-7 space-y-1">
              <span className="text-[8px] font-black tracking-wider text-[#FF5500] uppercase">
                STREET ARCHIVE
              </span>
              <div className="h-2.5 w-24 bg-white rounded-xs"></div>
              <div className="h-1.5 w-14 bg-[#737373] rounded-xs"></div>
              <div className="pt-0.5">
                <span className="inline-block px-1.5 py-0.5 text-[7px] font-black uppercase bg-[#FF5500] text-black rounded-xs">
                  SNKRS SHOP
                </span>
              </div>
            </div>
            <div className="col-span-5 h-16 bg-[#171717] border border-[#FF5500]/40 rounded-xs flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF5500]/25 to-transparent"></div>
              <span className="text-[9px] font-black italic text-[#FF5500]">APEX-X</span>
            </div>
          </div>

          {/* Mock Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#262626] relative z-10">
            <div className="h-9 bg-[#171717] border border-[#262626] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-white/40 rounded-xs"></div>
              <span className="text-[7px] text-[#FF5500] font-black font-mono">$240</span>
            </div>
            <div className="h-9 bg-[#171717] border border-[#262626] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-white/40 rounded-xs"></div>
              <span className="text-[7px] text-[#FF5500] font-black font-mono">$320</span>
            </div>
            <div className="h-9 bg-[#171717] border border-[#262626] rounded-xs p-1 flex flex-col justify-between">
              <div className="h-1 w-full bg-white/40 rounded-xs"></div>
              <span className="text-[7px] text-[#FF5500] font-black font-mono">$410</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
