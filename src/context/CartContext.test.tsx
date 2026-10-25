import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "./CartContext";
import type { CartLineItem } from "@/types";

const mockItem: CartLineItem = {
  variantId: "var_test_1",
  productId: "prod_test_1",
  title: "Cashmere Trench",
  variantTitle: "Camel / M",
  priceInCents: 145000,
  quantity: 1,
  image: "https://example.com/coat.jpg",
  maxStock: 5,
};

describe("CartContext", () => {
  it("initializes with an empty cart and closed drawer", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.itemCount).toBe(0);
    expect(result.current.cart.subtotalInCents).toBe(0);
    expect(result.current.isCartOpen).toBe(false);
  });

  it("adds an item to the cart and opens the drawer", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addItem(mockItem);
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.itemCount).toBe(1);
    expect(result.current.cart.subtotalInCents).toBe(145000);
    expect(result.current.isCartOpen).toBe(true);
  });

  it("clamps quantity to maxStock when adding duplicate items", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addItem(mockItem);
      // Try to add 10 more when maxStock is 5
      result.current.addItem({ ...mockItem, quantity: 10 });
    });

    expect(result.current.cart.items[0].quantity).toBe(5);
  });

  it("updates item quantity and calculates subtotal correctly", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addItem(mockItem);
      result.current.updateQuantity(mockItem.variantId, 3);
    });

    expect(result.current.cart.items[0].quantity).toBe(3);
    expect(result.current.cart.subtotalInCents).toBe(145000 * 3);
  });

  it("removes item when quantity is reduced to 0 or via removeItem", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addItem(mockItem);
      result.current.updateQuantity(mockItem.variantId, 0);
    });

    expect(result.current.cart.items).toHaveLength(0);
  });
});
