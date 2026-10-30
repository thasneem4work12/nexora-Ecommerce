"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Truck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStoreTenant } from "@/context/StoreTenantContext";
import { useSession } from "@/lib/auth-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import type { ShippingMethodCode, ShippingMethodOption } from "@/types/order";
import { SHIPPING_METHODS } from "@/services/shipping-tax.service";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { business, basePath } = useStoreTenant();
  const { data: session } = useSession();

  // Contact & Shipping State
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateOrProvince, setStateOrProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");

  // Billing address state
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billFirstName, setBillFirstName] = useState("");
  const [billLastName, setBillLastName] = useState("");
  const [billAddressLine1, setBillAddressLine1] = useState("");
  const [billCity, setBillCity] = useState("");
  const [billPostalCode, setBillPostalCode] = useState("");
  const [billCountry, setBillCountry] = useState("United States");

  // Delivery & Payment
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodCode>("STANDARD");
  const [paymentProvider, setPaymentProvider] = useState<"MOCK" | "PAYHERE">("MOCK");
  const [notes, setNotes] = useState("");

  // Rate Calculation State
  const [availableMethods, setAvailableMethods] = useState<ShippingMethodOption[]>(
    Object.values(SHIPPING_METHODS)
  );
  const [shippingCostInCents, setShippingCostInCents] = useState(0);
  const [taxInCents, setTaxInCents] = useState(0);
  const [taxRegion, setTaxRegion] = useState("");

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate authenticated session data
  useEffect(() => {
    if (session?.user) {
      if (session.user.email) setEmail(session.user.email);
      if (session.user.name) {
        const parts = session.user.name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    }
  }, [session]);

  // Recalculate dynamic rates when cart or destination changes
  useEffect(() => {
    async function updateRates() {
      if (cart.items.length === 0) return;
      try {
        const res = await fetch("/api/checkout/shipping-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtotalInCents: cart.subtotalInCents,
            address: { country, city, postalCode },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAvailableMethods(data.shippingMethods);
            const activeMethod = data.shippingMethods.find(
              (m: ShippingMethodOption) => m.code === shippingMethod
            );
            if (activeMethod) {
              setShippingCostInCents(activeMethod.priceInCents);
            }
            if (data.tax) {
              setTaxInCents(data.tax.taxInCents);
              setTaxRegion(data.tax.region);
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    updateRates();
  }, [cart.subtotalInCents, country, city, postalCode, shippingMethod, cart.items.length]);

  const finalTotalInCents = cart.subtotalInCents + shippingCostInCents + taxInCents;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (cart.items.length === 0) {
      setErrorMessage("Your shopping bag is empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        businessId: business?.id || "default-store",
        items: cart.items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: {
          firstName,
          lastName,
          company: company || undefined,
          phone: phone || undefined,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          stateOrProvince: stateOrProvince || undefined,
          postalCode,
          country,
        },
        billingAddress: sameAsShipping
          ? undefined
          : {
              firstName: billFirstName || firstName,
              lastName: billLastName || lastName,
              addressLine1: billAddressLine1,
              city: billCity,
              postalCode: billPostalCode,
              country: billCountry,
            },
        shippingMethod,
        paymentProvider,
        guestEmail: !session?.user ? email : undefined,
        guestName: !session?.user ? `${firstName} ${lastName}`.trim() : undefined,
        notes: notes || undefined,
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Order submission failed.");
      }

      const order = data.order;
      const paymentSession = data.paymentSession;

      // Clear local bag
      clearCart();

      // Handle redirect
      if (paymentProvider === "MOCK") {
        router.push(
          `${basePath || ""}/checkout/success?order_id=${order.id}&payment_id=${paymentSession?.sessionId}&mock_success=true`
        );
      } else if (paymentSession?.formParameters) {
        // PayHere POST submission flow
        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentSession.redirectUrl || "https://sandbox.payhere.lk/pay/checkout";

        for (const [key, value] of Object.entries(paymentSession.formParameters)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      } else if (paymentSession?.redirectUrl) {
        window.location.href = paymentSession.redirectUrl;
      } else {
        router.push(`${basePath || ""}/checkout/success?order_id=${order.id}`);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during checkout."
      );
      setIsSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto text-charcoal-500">
          <Package className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif text-charcoal-900">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-charcoal-700 max-w-md mx-auto leading-relaxed">
          You have no creations selected for checkout. Explore the curated collections.
        </p>
        <div className="pt-4">
          <Link href={`${basePath || ""}/products`}>
            <Button variant="primary" size="md">
              Explore Collections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-canvas-primary min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-4">
          <Link
            href={`${basePath || ""}/cart`}
            className="inline-flex items-center text-xs tracking-wider uppercase text-charcoal-500 hover:text-bronze transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Bag
          </Link>
        </div>

        {/* Visual 4-Step Checkout Stepper */}
        <CheckoutStepper currentStep="shipping" />

        {/* Page Title */}
        <div className="mb-8">
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Haute Couture Commission
          </span>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Atelier Client Checkout
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Authoritative order processing with automated stock reservations and insured dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Checkout Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmitOrder} className="space-y-8">
              {/* Error Notice */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-card flex items-start space-x-3 text-rose-800 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-medium">Checkout Notice:</strong> {errorMessage}
                  </div>
                </div>
              )}

              {/* 1. Contact Info */}
              <div className="bg-canvas-surface p-6 sm:p-8 border border-border-default rounded-card shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-serif font-bold text-charcoal-900">1. Client Contact</h2>
                  {!session?.user && (
                    <Link
                      href="/login?callbackUrl=/checkout"
                      className="text-xs uppercase tracking-wider text-charcoal-500 hover:text-bronze underline"
                    >
                      Already registered? Sign In
                    </Link>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Email Address for Order Dispatch *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@luxuryhouse.com"
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Telephone (For Courier Notification)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000 or +94 77 000 0000"
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Shipping Address */}
              <div className="bg-canvas-surface p-6 sm:p-8 border border-border-default rounded-card shadow-xs">
                <h2 className="text-base font-serif font-bold text-charcoal-900 mb-4">
                  2. Shipping Destination
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="company" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Company / Estate (Optional)
                    </label>
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="addressLine1" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Street Address *
                    </label>
                    <input
                      id="addressLine1"
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="House/Apartment number, street name"
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="addressLine2" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Apartment, Suite, Unit (Optional)
                    </label>
                    <input
                      id="addressLine2"
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      City *
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div>
                    <label htmlFor="stateOrProvince" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      State / Province / County
                    </label>
                    <input
                      id="stateOrProvince"
                      type="text"
                      value={stateOrProvince}
                      onChange={(e) => setStateOrProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Postal Code / ZIP *
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                      Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                    >
                      <option value="United States">United States</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="France">France</option>
                      <option value="Germany">Germany</option>
                      <option value="Italy">Italy</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Singapore">Singapore</option>
                    </select>
                  </div>
                </div>

                {/* Same as billing toggle */}
                <div className="mt-6 pt-4 border-t border-cream-200">
                  <label className="flex items-center space-x-2 text-sm text-charcoal-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      className="rounded border-cream-300 text-charcoal-900 focus:ring-0"
                    />
                    <span>Billing address is identical to shipping address</span>
                  </label>
                </div>

                {!sameAsShipping && (
                  <div className="mt-4 pt-4 border-t border-cream-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <h3 className="sm:col-span-2 text-sm font-serif font-medium text-charcoal-900">
                      Billing Address Details
                    </h3>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={billFirstName}
                        onChange={(e) => setBillFirstName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={billLastName}
                        onChange={(e) => setBillLastName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={billAddressLine1}
                        onChange={(e) => setBillAddressLine1(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={billCity}
                        onChange={(e) => setBillCity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={billPostalCode}
                        onChange={(e) => setBillPostalCode(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-charcoal-700 mb-1">
                        Country *
                      </label>
                      <select
                        value={billCountry}
                        onChange={(e) => setBillCountry(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-50 border border-cream-300 rounded-sm text-sm focus:outline-none focus:border-charcoal-900"
                      >
                        <option value="United States">United States</option>
                        <option value="Sri Lanka">Sri Lanka</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="France">France</option>
                        <option value="Germany">Germany</option>
                        <option value="Italy">Italy</option>
                        <option value="Switzerland">Switzerland</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                        <option value="Singapore">Singapore</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Delivery Method */}
              <div className="bg-canvas-surface p-6 sm:p-8 border border-border-default rounded-card shadow-xs">
                <div className="flex items-center space-x-2 mb-4">
                  <Truck className="w-5 h-5 text-bronze" />
                  <h2 className="text-base font-serif font-bold text-charcoal-900">3. Delivery Method</h2>
                </div>

                <div className="space-y-3">
                  {availableMethods.map((method) => (
                    <label
                      key={method.code}
                      className={`flex items-start justify-between p-4 border rounded-card cursor-pointer transition-all ${
                        shippingMethod === method.code
                          ? "border-bronze bg-bronze/5 ring-1 ring-bronze/30"
                          : "border-border-default hover:border-border-strong bg-canvas-surface"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={method.code}
                          checked={shippingMethod === method.code}
                          onChange={() => setShippingMethod(method.code)}
                          className="mt-1 text-bronze focus:ring-0"
                        />
                        <div>
                          <div className="text-sm font-medium text-charcoal-900">
                            {method.title}
                          </div>
                          <div className="text-xs text-charcoal-600 font-light mt-0.5">
                            {method.description}
                          </div>
                          <div className="text-[11px] text-charcoal-500 mt-1 italic">
                            Est. {method.estimatedDays}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-charcoal-900 font-mono">
                        {method.priceInCents === 0 ? "Complimentary" : formatPrice(method.priceInCents)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Payment Provider */}
              <div className="bg-canvas-surface p-6 sm:p-8 border border-border-default rounded-card shadow-xs">
                <div className="flex items-center space-x-2 mb-4">
                  <CreditCard className="w-5 h-5 text-bronze" />
                  <h2 className="text-base font-serif font-bold text-charcoal-900">4. Payment Gateway</h2>
                </div>

                <div className="space-y-3">
                  <label
                    className={`flex items-start justify-between p-4 border rounded-card cursor-pointer transition-all ${
                      paymentProvider === "MOCK"
                        ? "border-bronze bg-bronze/5 ring-1 ring-bronze/30"
                        : "border-border-default hover:border-border-strong bg-canvas-surface"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="MOCK"
                        checked={paymentProvider === "MOCK"}
                        onChange={() => setPaymentProvider("MOCK")}
                        className="mt-1 text-bronze focus:ring-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-charcoal-900 flex items-center gap-2">
                          <span>NEXORA Atelier Sandbox</span>
                          <span className="text-[10px] bg-charcoal-100 text-charcoal-800 px-2 py-0.5 rounded tracking-wider uppercase font-semibold">
                            Test Mode
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-600 font-light mt-0.5">
                          Instant simulated authorization with zero live card charges.
                        </div>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start justify-between p-4 border rounded-card cursor-pointer transition-all ${
                      paymentProvider === "PAYHERE"
                        ? "border-bronze bg-bronze/5 ring-1 ring-bronze/30"
                        : "border-border-default hover:border-border-strong bg-canvas-surface"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="PAYHERE"
                        checked={paymentProvider === "PAYHERE"}
                        onChange={() => setPaymentProvider("PAYHERE")}
                        className="mt-1 text-bronze focus:ring-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-charcoal-900 flex items-center gap-2">
                          <span>PayHere Payment Gateway</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded tracking-wider uppercase font-semibold">
                            CBSL Licensed
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-600 font-light mt-0.5">
                          Visa, Mastercard, Amex, and Sri Lankan banking channels.
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Atelier Instructions */}
                <div className="mt-4">
                  <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                    Special Inscriptions or Atelier Requests (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Please include confidential gift packaging with engraved monogramming..."
                    className="w-full px-3.5 py-2.5 bg-canvas-primary border border-border-default rounded-btn text-xs text-charcoal-900 focus:outline-none focus:border-bronze leading-relaxed"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full py-4 text-sm tracking-luxury uppercase font-medium shadow-sm"
                >
                  {isSubmitting ? "Authorizing Order..." : `Complete Order — ${formatPrice(finalTotalInCents)}`}
                </Button>

                <div className="flex items-center justify-center space-x-6 text-xs text-charcoal-500 mt-4">
                  <span className="flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> 256-Bit SSL Encryption
                  </span>
                  <span className="flex items-center">
                    <Lock className="w-4 h-4 mr-1 text-emerald-600" /> Stock Reserved Instantly
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-canvas-surface p-6 sm:p-8 border border-border-default rounded-card shadow-xs sticky top-28 space-y-6">
              <h2 className="text-base font-serif font-bold text-charcoal-900 pb-4 border-b border-border-subtle">
                Order Summary ({cart.itemCount} {cart.itemCount === 1 ? "Piece" : "Pieces"})
              </h2>

              {/* Line items list */}
              <div className="divide-y divide-border-subtle max-h-96 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.variantId} className="py-3 flex space-x-4">
                    <div className="relative w-16 h-20 bg-canvas-secondary flex-shrink-0 border border-border-subtle overflow-hidden rounded-xs">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-400 text-xs">
                          NEXORA
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-charcoal-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-charcoal-500 mt-0.5">
                        {item.variantTitle}
                      </div>
                      <div className="text-xs text-charcoal-500 mt-1">
                        Qty: {item.quantity}
                      </div>
                    </div>

                    <div className="text-sm font-medium text-charcoal-900 font-mono">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-4 border-t border-border-subtle space-y-2.5 text-sm">
                <div className="flex justify-between text-charcoal-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-charcoal-900 font-medium">
                    {formatPrice(cart.subtotalInCents)}
                  </span>
                </div>

                <div className="flex justify-between text-charcoal-600">
                  <span>Shipping & Delivery</span>
                  <span className="font-mono">
                    {shippingCostInCents === 0 ? "Complimentary" : formatPrice(shippingCostInCents)}
                  </span>
                </div>

                <div className="flex justify-between text-charcoal-600">
                  <div>
                    <span>Estimated Tax & Duties</span>
                    {taxRegion && (
                      <span className="block text-[11px] text-charcoal-500 italic">{taxRegion}</span>
                    )}
                  </div>
                  <span className="font-mono">{formatPrice(taxInCents)}</span>
                </div>

                <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline font-serif">
                  <span className="text-base text-charcoal-900 font-bold">Total Payable</span>
                  <span className="text-xl text-bronze font-mono font-bold">
                    {formatPrice(finalTotalInCents)}
                  </span>
                </div>
              </div>

              {/* Atelier Guarantees */}
              <div className="bg-canvas-secondary/50 p-4 border border-border-subtle rounded-card text-xs text-charcoal-700 space-y-2">
                <div className="flex items-center gap-2 font-medium text-charcoal-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Authenticity & Archival Guarantee
                </div>
                <p className="leading-relaxed text-[11px] text-charcoal-500 font-light">
                  Every creation is numbered, inspected by master artisans, and protected with signature
                  insured tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
