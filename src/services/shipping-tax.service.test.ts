import { describe, it, expect } from "vitest";
import {
  calculateShipping,
  getAvailableShippingMethods,
  calculateTax,
} from "./shipping-tax.service";

describe("Shipping & Tax Calculation Engine", () => {
  describe("Shipping Calculations", () => {
    it("should provide complimentary standard shipping for orders >= $2,000", () => {
      const subtotalInCents = 250000; // $2,500.00
      const { shippingMethod, priceInCents } = calculateShipping("STANDARD", subtotalInCents);

      expect(priceInCents).toBe(0);
      expect(shippingMethod.priceInCents).toBe(0);
      expect(shippingMethod.code).toBe("STANDARD");
    });

    it("should charge base standard courier for orders under $2,000", () => {
      const subtotalInCents = 95000; // $950.00
      const { priceInCents } = calculateShipping("STANDARD", subtotalInCents);

      expect(priceInCents).toBe(2500); // $25.00
    });

    it("should charge flat rates for Express Insured Air Courier", () => {
      const { priceInCents, shippingMethod } = calculateShipping("EXPRESS", 100000);

      expect(priceInCents).toBe(4500); // $45.00
      expect(shippingMethod.code).toBe("EXPRESS");
    });

    it("should charge flat rates for Signature White Glove Delivery", () => {
      const { priceInCents, shippingMethod } = calculateShipping("WHITE_GLOVE", 500000);

      expect(priceInCents).toBe(12000); // $120.00
      expect(shippingMethod.code).toBe("WHITE_GLOVE");
    });

    it("should list all available shipping options with dynamic pricing", () => {
      const methodsHigh = getAvailableShippingMethods(300000);
      const standardHigh = methodsHigh.find((m) => m.code === "STANDARD");
      expect(standardHigh?.priceInCents).toBe(0);

      const methodsLow = getAvailableShippingMethods(50000);
      const standardLow = methodsLow.find((m) => m.code === "STANDARD");
      expect(standardLow?.priceInCents).toBe(2500);
    });
  });

  describe("Tax & Duty Calculations", () => {
    it("should calculate 0% tax for Sri Lankan domestic atelier sales", () => {
      const result = calculateTax(100000, {
        firstName: "Test",
        lastName: "Client",
        addressLine1: "123 Galle Road",
        city: "Colombo",
        postalCode: "00300",
        country: "LK",
      });

      expect(result.taxRate).toBe(0.0);
      expect(result.taxInCents).toBe(0);
      expect(result.region).toContain("Sri Lanka");
    });

    it("should calculate 5% tax and duty for United States export destination", () => {
      const subtotalInCents = 200000; // $2,000.00
      const result = calculateTax(subtotalInCents, {
        firstName: "Jane",
        lastName: "Doe",
        addressLine1: "742 Evergreen Terrace",
        city: "New York",
        postalCode: "10001",
        country: "US",
      });

      expect(result.taxRate).toBe(0.05);
      expect(result.taxInCents).toBe(10000); // $100.00
      expect(result.region).toContain("United States");
    });

    it("should calculate 4% excise for European destinations", () => {
      const subtotalInCents = 150000; // $1,500.00
      const result = calculateTax(subtotalInCents, {
        firstName: "Pierre",
        lastName: "Dubois",
        addressLine1: "15 Rue de la Paix",
        city: "Paris",
        postalCode: "75001",
        country: "FR",
      });

      expect(result.taxRate).toBe(0.04);
      expect(result.taxInCents).toBe(6000); // $60.00
      expect(result.region).toContain("Europe");
    });

    it("should default to 0% duty unpaid for unconfigured destinations", () => {
      const result = calculateTax(100000, {
        firstName: "Aki",
        lastName: "Tanaka",
        addressLine1: "Ginza 6",
        city: "Tokyo",
        postalCode: "104-0061",
        country: "JP",
      });

      expect(result.taxRate).toBe(0.0);
      expect(result.taxInCents).toBe(0);
    });
  });
});
