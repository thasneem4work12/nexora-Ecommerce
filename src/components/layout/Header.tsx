"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User as UserIcon, Menu, X, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { cart, openCart } = useCart();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: "Catalog" },
    { href: "/products?category=apparel", label: "Apparel" },
    { href: "/products?category=footwear", label: "Footwear" },
    { href: "/products?category=accessories", label: "Accessories" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas-primary/95 backdrop-blur-md border-b border-border-subtle transition-all">
      {/* Top Luxury Announcement Bar */}
      <div className="bg-charcoal-900 text-canvas-primary text-[11px] tracking-luxury uppercase py-2 px-4 text-center font-medium">
        <span>Complimentary Worldwide Delivery on Orders Over $150</span>
      </div>

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

          {/* Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex flex-col items-center sm:items-start group">
              <span className="text-2xl sm:text-3xl font-serif tracking-[0.25em] text-charcoal-900 uppercase font-normal transition-colors group-hover:text-bronze">
                NEXORA
              </span>
              <span className="text-[9px] tracking-[0.35em] text-charcoal-500 uppercase -mt-1 font-light">
                Haute Couture
              </span>
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
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link
              href="/products"
              className="p-2 text-charcoal-700 hover:text-bronze transition-colors hidden sm:block"
              aria-label="Search Catalog"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* User Account / Auth */}
            {session?.user ? (
              <Link
                href="/account"
                className="flex items-center space-x-2 text-charcoal-700 hover:text-bronze transition-colors py-1 px-2 border border-transparent hover:border-border-default"
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
