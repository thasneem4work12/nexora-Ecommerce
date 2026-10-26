"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Store, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessEntry {
  id: string;
  name: string;
  slug: string;
  type: string;
  role: string;
  status: string;
}

export function BusinessSwitcher() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessEntry[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>("default-store");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await fetch("/api/admin/businesses");
        if (res.ok) {
          const data = await res.json();
          if (data.businesses) {
            setBusinesses(data.businesses);
            setActiveBusinessId(data.activeBusinessId || "default-store");
          }
        }
      } catch (err) {
        console.error("Failed to load businesses:", err);
      }
    }

    loadBusinesses();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) ||
    businesses[0] || {
      id: "default-store",
      name: "NEXORA Flagship",
      slug: "nexora",
      type: "Luxury Haute Couture",
      role: "OWNER",
      status: "ACTIVE",
    };

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId) {
      setIsOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/businesses/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      if (res.ok) {
        setIsOpen(false);
        setActiveBusinessId(businessId);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch business:", err);
    }
  };

  return (
    <div className="relative px-4 pt-3 pb-2" ref={dropdownRef}>
      <button
        type="button"
        data-testid="business-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-btn text-left transition-all duration-200 group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-sm bg-bronze/15 border border-bronze/30 flex items-center justify-center flex-shrink-0 text-bronze">
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-serif font-medium text-white truncate group-hover:text-bronze transition-colors">
              {activeBusiness.name}
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-neutral-400 truncate">
              {activeBusiness.role} • {activeBusiness.slug}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 transition-transform duration-200 flex-shrink-0 ml-1.5",
            isOpen && "rotate-180 text-bronze"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-4 right-4 mt-1.5 bg-[#18181b] border border-[#27272a] shadow-2xl rounded-btn z-50 overflow-hidden text-white py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold border-b border-[#27272a]">
            Switch Store Context
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-[#27272a]/60">
            {businesses.map((biz) => {
              const isCurrent = biz.id === activeBusinessId;
              return (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => handleSwitch(biz.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors",
                    isCurrent
                      ? "bg-bronze/20 text-bronze font-medium"
                      : "hover:bg-[#27272a] text-neutral-300 hover:text-white"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <span className="block truncate font-serif">{biz.name}</span>
                    <span className="block text-[10px] text-neutral-400 uppercase tracking-wider">
                      {biz.role}
                    </span>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-bronze flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#27272a] pt-1 mt-1 px-1">
            <Link
              href="/admin/businesses/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 px-2.5 py-1.5 text-[11px] text-bronze hover:bg-[#27272a] rounded transition-colors uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Store</span>
            </Link>
            <Link
              href="/admin/businesses"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 px-2.5 py-1.5 text-[11px] text-neutral-300 hover:text-white hover:bg-[#27272a] rounded transition-colors uppercase tracking-wider"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Stores</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
