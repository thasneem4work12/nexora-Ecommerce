"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartLineItem, CartSummary } from "@/types";

import { useStoreTenant } from "./StoreTenantContext";

interface CartContextType {
  cart: CartSummary;
  isCartOpen: boolean;
  addItem: (item: CartLineItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const BASE_STORAGE_KEY = "nexora_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { business } = useStoreTenant();
  const businessId = business?.id || "default-store";
  const storageKey = `${BASE_STORAGE_KEY}_${businessId}`;

  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage whenever businessId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [items, isLoaded, storageKey]);

  const addItem = (item: CartLineItem) => {
    setItems((prev) => {
      const itemWithBusiness = {
        ...item,
        businessId: item.businessId || businessId,
      };
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const newQty = Math.min(existing.quantity + item.quantity, item.maxStock);
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, itemWithBusiness];
    });
    setIsCartOpen(true);
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          const clamped = Math.min(quantity, item.maxStock);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Computations
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );
  const estimatedTaxInCents = Math.round(subtotalInCents * 0.08); // 8% estimated tax
  const shippingInCents = subtotalInCents > 15000 || subtotalInCents === 0 ? 0 : 1500; // Free over $150
  const totalInCents = subtotalInCents + estimatedTaxInCents + shippingInCents;

  const cart: CartSummary = {
    items,
    itemCount,
    subtotalInCents,
    estimatedTaxInCents,
    shippingInCents,
    totalInCents,
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
