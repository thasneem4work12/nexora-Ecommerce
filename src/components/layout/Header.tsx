"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User as UserIcon, Menu, X, Search, Eye, ExternalLink } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { StoreAppearanceConfig } from "@/types/theme";

import { useStoreTenant } from "@/context/StoreTenantContext";

interface HeaderProps {
  appearance?: (StoreAppearanceConfig & { isPreview?: boolean; hasDraft?: boolean }) | null;
}

export function Header({ appearance: propAppearance }: HeaderProps) {
  const pathname = usePathname();
  const { cart, openCart } = useCart();
  const { data: session } = useSession();
  const { business, appearance: tenantAppearance, basePath } = useStoreTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const appearance = (basePath ? tenantAppearance : null) || propAppearance || tenantAppearance;
  const storeName = appearance?.storeName || business?.name || "NEXORA";
  const storeTagline = appearance?.storeTagline || "Haute Couture";
  const showAnnouncement = appearance?.announcementEnabled ?? true;
  const announcementText =
    appearance?.announcementText || "Complimentary Worldwide Delivery on Orders Over $150";
  const announcementLink = appearance?.announcementLink || `${basePath}/products`;
  const isPreview = appearance?.isPreview || false;

  const homeHref = basePath || "/";
  const catalogHref = `${basePath}/products`;

  const navLinks = [
    { href: catalogHref, label: "Catalog" },
    { href: `${catalogHref}?category=apparel`, label: "Apparel" },
    { href: `${catalogHref}?category=footwear`, label: "Footwear" },
    { href: `${catalogHref}?category=accessories`, label: "Accessories" },
  ];

  const handleExitPreview = async () => {
    try {
      await fetch("/api/admin/appearance/preview", { method: "DELETE" });
      window.location.href = window.location.pathname;
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas-primary/95 backdrop-blur-md border-b border-border-subtle transition-all">
      {/* Admin Preview Mode Banner */}
      {isPreview && (
        <div className="bg-amber-500 text-black px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 animate-pulse" />
            <span>
              Preview Mode: <strong>{appearance?.activeThemeId}</strong>{" "}
              {appearance?.hasDraft ? "(Unpublished Draft Changes)" : "(Base Theme Preview)"}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/appearance"
              className="hover:underline flex items-center space-x-1"
            >
              <span>Appearance Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleExitPreview}
              className="bg-black/15 hover:bg-black/25 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Top Announcement Bar */}
      {showAnnouncement && announcementText && (
        <div className="bg-charcoal-900 text-canvas-primary text-[11px] tracking-luxury uppercase py-2 px-4 text-center font-medium">
          {announcementLink ? (
            <Link href={announcementLink} className="hover:text-bronze transition-colors">
              <span>{announcementText}</span>
            </Link>
          ) : (
            <span>{announcementText}</span>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-charcoal-900 hover:text-bronze transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo / Title */}
          <div className="flex items-center">
            <Link href={homeHref} className="flex flex-col items-center sm:items-start group">
              {appearance?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appearance.logoUrl}
                  alt={storeName}
                  className="h-8 max-h-8 object-contain"
                />
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-serif tracking-[0.25em] text-charcoal-900 uppercase font-normal transition-colors group-hover:text-bronze">
                    {storeName}
                  </span>
                  {storeTagline && (
                    <span className="text-[9px] tracking-[0.35em] text-charcoal-500 uppercase -mt-1 font-light">
                      {storeTagline}
                    </span>
                  )}
                </>
              )}
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-xs tracking-luxury uppercase transition-all duration-200 relative py-1",
                    isActive
                      ? "text-bronze font-semibold"
                      : "text-charcoal-700 hover:text-bronze"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bronze" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Search Toggle */}
            <div className="relative flex items-center">
              {searchOpen ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      window.location.href = `${catalogHref}?search=${encodeURIComponent(searchQuery.trim())}`;
                      setSearchOpen(false);
                    }
                  }}
                  className="flex items-center"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search catalog..."
                    autoFocus
                    className="w-36 sm:w-56 px-3 py-1.5 bg-canvas-surface border border-border-default text-xs tracking-wider text-charcoal-900 focus:outline-none focus:border-bronze rounded-btn"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="p-1.5 text-charcoal-400 hover:text-charcoal-900"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-charcoal-700 hover:text-bronze transition-colors"
                  aria-label="Search Catalog"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* User Account / Auth */}
            {session?.user ? (
              <Link
                href="/account"
                className="flex items-center space-x-2 text-charcoal-700 hover:text-bronze transition-colors py-1 px-2 border border-transparent hover:border-border-default rounded-btn"
                aria-label="My Account"
              >
                <div className="w-7 h-7 rounded-full bg-bronze/10 text-bronze flex items-center justify-center font-medium text-xs">
                  {session.user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs uppercase tracking-wider hidden lg:inline">
                  {session.user.name.split(" ")[0]}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="p-2 text-charcoal-700 hover:text-bronze transition-colors flex items-center space-x-1"
                aria-label="Sign In"
              >
                <UserIcon className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider hidden sm:inline ml-1">
                  Sign In
                </span>
              </Link>
            )}

            {/* Shopping Bag Button */}
            <button
              onClick={openCart}
              className="relative p-2 text-charcoal-900 hover:text-bronze transition-colors flex items-center"
              aria-label={`Open Cart (${cart.itemCount} items)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-bronze text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {cart.itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-canvas-primary border-b border-border-default px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm tracking-luxury uppercase text-charcoal-900 hover:text-bronze transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border-subtle flex flex-col space-y-3">
              {session?.user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm tracking-luxury uppercase text-bronze flex items-center"
                >
                  <UserIcon className="w-4 h-4 mr-2" /> My Account ({session.user.name})
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm tracking-luxury uppercase text-charcoal-900 hover:text-bronze flex items-center"
                >
                  <UserIcon className="w-4 h-4 mr-2" /> Sign In / Register
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
