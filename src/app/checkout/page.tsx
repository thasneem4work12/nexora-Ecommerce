"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSession } from "@/lib/auth-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: session?.user?.email || "",
    address: "",
    apartment: "",
    city: "",
    country: "United States",
    postalCode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mock order placement for Phase 1 (server transaction and payments integrated in Phase 4)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCompleted(true);
      clearCart();
    }, 1200);
  };

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900">
          Order Commission Confirmed
        </h1>
        <p className="text-sm text-charcoal-700 max-w-md mx-auto leading-relaxed">
          Thank you for choosing NEXORA Haute Couture. A confirmation dispatch has been sent to{" "}
          <strong className="text-charcoal-900">{formData.email || "your email"}</strong>.
          Our atelier will begin preparing your garments.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link href="/account">
            <Button variant="primary" size="md">
              View Private Account
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" size="md">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-serif text-charcoal-900">
          No Items to Checkout
        </h1>
        <p className="text-xs text-charcoal-500">
          Please add items to your shopping bag before proceeding to checkout.
        </p>
        <Link href="/products">
          <Button variant="primary" size="sm">
            Discover Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="mb-8">
        <Link
          href="/cart"
          className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-500 hover:text-bronze transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Return to Bag
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Shipping Form (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handlePlaceOrder} className="space-y-8">
            {/* Contact Information */}
            <div className="bg-canvas-surface border border-border-default p-6 sm:p-8 space-y-4">
              <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle">
                1. Client Contact
              </h2>
              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Email Address for Dispatch Updates
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="client@domain.com"
                  className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-canvas-surface border border-border-default p-6 sm:p-8 space-y-4">
              <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle">
                2. Delivery Destination
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 740 Park Avenue"
                  className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full bg-canvas-primary border border-border-default px-4 py-2 text-sm text-charcoal-900 focus:outline-none focus:border-bronze rounded-none"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="France">France</option>
                    <option value="Italy">Italy</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Japan">Japan</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Verification / Phase 1 Notice */}
            <div className="bg-canvas-surface border border-border-default p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-2 text-sm uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle">
                <Lock className="w-4 h-4 text-bronze" />
                <span>3. Payment Guarantee</span>
              </div>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                Phase 1 Development Mode: Orders are verified and registered in staging mode. Live credit card processing (Stripe / approved gateway) will be activated in Phase 4.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full mt-4"
              >
                Confirm Commission ({formatPrice(cart.totalInCents)})
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-canvas-surface border border-border-default p-6 sm:p-8 space-y-6">
            <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold pb-3 border-b border-border-subtle">
              Bag Summary ({cart.itemCount})
            </h2>

            <div className="divide-y divide-border-subtle max-h-96 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.variantId} className="py-4 flex gap-4 items-center">
                  <div className="relative w-16 h-20 bg-canvas-secondary border border-border-subtle flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-serif text-charcoal-900 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-charcoal-500">
                      {item.variantTitle} × {item.quantity}
                    </p>
                    <p className="text-xs font-medium text-bronze mt-0.5">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-700">
                <span>Subtotal</span>
                <span className="font-medium text-charcoal-900">{formatPrice(cart.subtotalInCents)}</span>
              </div>
              <div className="flex justify-between text-charcoal-700">
                <span>Shipping</span>
                <span>{cart.shippingInCents === 0 ? "Complimentary" : formatPrice(cart.shippingInCents)}</span>
              </div>
              <div className="flex justify-between text-charcoal-700">
                <span>Estimated Tax (8%)</span>
                <span>{formatPrice(cart.estimatedTaxInCents)}</span>
              </div>
              <div className="flex justify-between text-charcoal-900 text-sm font-serif font-bold pt-2 border-t border-border-subtle">
                <span>Total Due</span>
                <span className="text-bronze">{formatPrice(cart.totalInCents)}</span>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4 flex items-center space-x-2 text-[11px] text-charcoal-500">
              <ShieldCheck className="w-4 h-4 text-bronze flex-shrink-0" />
              <span>256-Bit SSL Encrypted & Verified Private Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
