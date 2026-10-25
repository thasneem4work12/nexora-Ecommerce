import { describe, it, expect } from "vitest";
import { formatPrice, cn } from "./utils";

describe("Utility Functions", () => {
  describe("formatPrice", () => {
    it("formats integer cents into standard USD currency string", () => {
      expect(formatPrice(12500)).toBe("$125.00");
      expect(formatPrice(68000)).toBe("$680.00");
      expect(formatPrice(145000)).toBe("$1,450.00");
    });

    it("formats zero cents correctly", () => {
      expect(formatPrice(0)).toBe("$0.00");
    });

    it("formats fractional dollar cents accurately without rounding errors", () => {
      expect(formatPrice(99)).toBe("$0.99");
      expect(formatPrice(5)).toBe("$0.05");
    });
  });

  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("px-4", "py-2")).toBe("px-4 py-2");
    });

    it("resolves conflicting Tailwind classes prioritizing later values", () => {
      expect(cn("px-4 text-red-500", "px-6 text-blue-500")).toBe("px-6 text-blue-500");
    });

    it("handles falsy and conditional classes cleanly", () => {
      expect(cn("base-class", false && "hidden", null, undefined, "active")).toBe(
        "base-class active"
      );
    });
  });
});
