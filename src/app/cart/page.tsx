"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStoreTenant } from "@/context/StoreTenantContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { basePath } = useStoreTenant();
  const catalogHref = `${basePath}/products`;
  const checkoutHref = `${basePath}/checkout`;

  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 bg-canvas-secondary rounded-full flex items-center justify-center mx-auto text-bronze">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif text-charcoal-900">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-sm text-charcoal-500 font-light leading-relaxed">
            There are no pieces currently held in your private bag. Browse our atelier catalog to discover limited handcrafted items.
          </p>
          <div>
            <Link href={catalogHref}>
              <Button variant="primary" size="md">
                Discover Catalog <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <Link
          href={catalogHref}
          className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-500 hover:text-bronze transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Continue Shopping
        </Link>
      </div>

      <div className="flex items-center justify-between border-b border-border-default pb-6 mb-10">
        <div>
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Order Review
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900 mt-1">
            Shopping Bag ({cart.itemCount} items)
          </h1>
        </div>
        <button
          onClick={clearCart}
          className="text-xs uppercase tracking-luxury text-charcoal-500 hover:text-rose-600 transition-colors"
        >
          Empty Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Cart Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="divide-y divide-border-subtle border-y border-border-subtle">
            {cart.items.map((item) => (
              <div key={item.variantId} className="py-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="relative w-24 h-32 bg-canvas-secondary border border-border-subtle flex-shrink-0 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-serif text-charcoal-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-charcoal-500">
                      {item.variantTitle}
                    </p>
                    <p className="text-sm font-medium text-bronze pt-1">
                      {formatPrice(item.priceInCents)}
                    </p>
                  </div>
                </div>

                {/* Quantity and Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <div className="flex items-center border border-border-default bg-canvas-surface">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-3 py-2 text-charcoal-700 hover:bg-canvas-secondary"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-2 text-xs font-medium text-charcoal-900 select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="px-3 py-2 text-charcoal-700 hover:bg-canvas-secondary disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-base font-serif text-charcoal-900 w-24 text-right">
                    {formatPrice(item.priceInCents * item.quantity)}
                  </span>

                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-charcoal-300 hover:text-rose-600 transition-colors p-2"
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary Column (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-canvas-surface border border-border-default p-8 space-y-6">
            <h2 className="text-lg font-serif text-charcoal-900 uppercase tracking-wider pb-4 border-b border-border-subtle">
              Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-charcoal-700">
                <span>Subtotal</span>
                <span className="font-medium text-charcoal-900">
                  {formatPrice(cart.subtotalInCents)}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-700">
                <span>Estimated Shipping</span>
                <span>
                  {cart.shippingInCents === 0 ? "Complimentary" : formatPrice(cart.shippingInCents)}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-700">
                <span>Estimated Duty & Tax (8%)</span>
                <span>{formatPrice(cart.estimatedTaxInCents)}</span>
              </div>

              <div className="pt-4 border-t border-border-subtle flex justify-between text-charcoal-900 text-lg font-serif font-bold">
                <span>Estimated Total</span>
                <span className="text-bronze">
                  {formatPrice(cart.totalInCents)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link href={checkoutHref} className="block w-full">
                <Button variant="primary" size="lg" className="w-full">
                  Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-charcoal-500 text-center leading-relaxed">
              Taxes and duties are calculated based on your final shipping destination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
