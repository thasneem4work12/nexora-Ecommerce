"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStoreTenant } from "@/context/StoreTenantContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function CartDrawer() {
  const { cart, isCartOpen, closeCart, updateQuantity, removeItem } = useCart();
  const { basePath } = useStoreTenant();
  const checkoutHref = `${basePath}/checkout`;
  const catalogHref = `${basePath}/products`;

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Bag"
          className="w-screen max-w-md bg-canvas-surface shadow-2xl flex flex-col border-l border-border-default"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-5 h-5 text-bronze" />
              <h2 className="text-lg font-serif tracking-wider uppercase text-charcoal-900">
                Shopping Bag ({cart.itemCount})
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-2 text-charcoal-500 hover:text-charcoal-900 transition-colors"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-canvas-secondary flex items-center justify-center text-charcoal-300">
                  <ShoppingBag className="w-8 h-8 text-bronze/60" />
                </div>
                <div>
                  <h3 className="text-base font-serif text-charcoal-900">
                    Your shopping bag is empty
                  </h3>
                  <p className="text-sm text-charcoal-500 mt-1">
                    Explore our curated collections of bespoke garments and accessories.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeCart}
                  className="mt-2"
                >
                  <Link href={catalogHref} className="flex items-center">
                    Discover Catalog <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6 divide-y divide-border-subtle">
                {cart.items.map((item) => (
                  <div key={item.variantId} className="pt-6 first:pt-0 flex space-x-4">
                    <div className="relative w-20 h-24 bg-canvas-secondary flex-shrink-0 overflow-hidden border border-border-subtle">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-charcoal-900 line-clamp-1">
                            {item.title}
                          </h4>
                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="text-charcoal-300 hover:text-rose-600 transition-colors ml-2"
                            aria-label={`Remove ${item.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                          {item.variantTitle}
                        </p>
                        <p className="text-sm font-medium text-bronze mt-1">
                          {formatPrice(item.priceInCents)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border-default bg-canvas-secondary/50">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="p-1.5 hover:bg-canvas-surface text-charcoal-700 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-medium text-charcoal-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxStock}
                            className="p-1.5 hover:bg-canvas-surface text-charcoal-700 disabled:opacity-30 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-xs text-charcoal-500 font-medium">
                          Total: {formatPrice(item.priceInCents * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Summary & Checkout */}
          {cart.items.length > 0 && (
            <div className="p-6 border-t border-border-default bg-canvas-secondary/30 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-charcoal-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-charcoal-900">
                    {formatPrice(cart.subtotalInCents)}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-500 text-xs">
                  <span>Estimated Shipping</span>
                  <span>
                    {cart.shippingInCents === 0 ? "Complimentary" : formatPrice(cart.shippingInCents)}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-900 text-base font-serif font-semibold pt-2 border-t border-border-subtle">
                  <span>Estimated Total</span>
                  <span className="text-bronze">
                    {formatPrice(cart.totalInCents)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link href={checkoutHref} onClick={closeCart} className="block w-full">
                  <Button variant="primary" size="md" className="w-full flex items-center justify-center">
                    Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-center text-[11px] text-charcoal-500 mt-2">
                  Complimentary worldwide shipping on orders over $150
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
