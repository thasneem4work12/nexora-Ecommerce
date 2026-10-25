import type {
  ShippingMethodCode,
  ShippingMethodOption,
  ShippingAddressInput,
  TaxCalculationResult,
} from "@/types/order";

export const SHIPPING_METHODS: Record<ShippingMethodCode, ShippingMethodOption> = {
  STANDARD: {
    code: "STANDARD",
    title: "Complimentary Atelier Courier",
    description: "Insured standard dispatch in signature archival packaging.",
    priceInCents: 0, // Complimentary on orders over threshold, or $25 base
    estimatedDays: "3–5 Business Days",
  },
  EXPRESS: {
    code: "EXPRESS",
    title: "Expedited Insured Air Courier",
    description: "Priority air dispatch with dedicated courier tracking.",
    priceInCents: 4500, // $45.00
    estimatedDays: "1–2 Business Days",
  },
  WHITE_GLOVE: {
    code: "WHITE_GLOVE",
    title: "Signature White Glove Delivery",
    description: "Personal appointment delivery, unboxing, and styling consultation.",
    priceInCents: 12000, // $120.00
    estimatedDays: "Scheduled Date & Time",
  },
};

const FREE_STANDARD_SHIPPING_THRESHOLD_CENTS = 200000; // Orders >= $2,000.00 get free standard courier
const BASE_STANDARD_SHIPPING_CENTS = 2500; // $25.00 for orders under $2,000.00

/**
 * Calculates authoritative shipping cost based on subtotal and destination.
 * Never trusts client-submitted shipping amounts.
 */
export function calculateShipping(
  methodCode: ShippingMethodCode,
  subtotalInCents: number
): { shippingMethod: ShippingMethodOption; priceInCents: number } {
  const method = SHIPPING_METHODS[methodCode] || SHIPPING_METHODS.STANDARD;

  if (method.code === "STANDARD") {
    const isFree = subtotalInCents >= FREE_STANDARD_SHIPPING_THRESHOLD_CENTS;
    const priceInCents = isFree ? 0 : BASE_STANDARD_SHIPPING_CENTS;
    return {
      shippingMethod: {
        ...method,
        priceInCents,
      },
      priceInCents,
    };
  }

  return {
    shippingMethod: method,
    priceInCents: method.priceInCents,
  };
}

/**
 * Returns all available shipping options with dynamic pricing based on subtotal.
 */
export function getAvailableShippingMethods(
  subtotalInCents: number
): ShippingMethodOption[] {
  return Object.values(SHIPPING_METHODS).map((m) => {
    if (m.code === "STANDARD") {
      const isFree = subtotalInCents >= FREE_STANDARD_SHIPPING_THRESHOLD_CENTS;
      return {
        ...m,
        priceInCents: isFree ? 0 : BASE_STANDARD_SHIPPING_CENTS,
      };
    }
    return m;
  });
}

/**
 * Centralized, server-controlled tax calculation.
 * Supports domestic Sri Lankan sales and international exports.
 */
export function calculateTax(
  subtotalInCents: number,
  address?: ShippingAddressInput
): TaxCalculationResult {
  const country = address?.country?.toUpperCase().trim() || "LK";

  // Configurable regional tax rules
  if (country === "LK") {
    // Domestic boutique transactions: luxury excise / VAT rate (0% for demonstrative boutique or configurable)
    return {
      taxRate: 0.0,
      taxInCents: 0,
      region: "Sri Lanka (Atelier Domestic Exempt)",
    };
  }

  if (country === "US" || country === "USA") {
    // US Export rate: 5% import sales allocation
    const taxRate = 0.05;
    const taxInCents = Math.round(subtotalInCents * taxRate);
    return {
      taxRate,
      taxInCents,
      region: "United States (5% Duty & Tax)",
    };
  }

  if (["GB", "FR", "DE", "IT", "CH"].includes(country)) {
    // European destinations: standard boutique export
    const taxRate = 0.04;
    const taxInCents = Math.round(subtotalInCents * taxRate);
    return {
      taxRate,
      taxInCents,
      region: "Europe (4% Import Excise)",
    };
  }

  // Rest of the world: duty unpaid / export rate 0%
  return {
    taxRate: 0.0,
    taxInCents: 0,
    region: "International Duty Unpaid (0%)",
  };
}
