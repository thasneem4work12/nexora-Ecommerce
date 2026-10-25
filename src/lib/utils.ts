import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes with clsx and resolves conflicts with tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats monetary amounts stored as integer cents into user-friendly strings.
 * E.g., 12500 cents -> "$125.00"
 */
export function formatPrice(
  cents: number,
  options: {
    currency?: string;
    locale?: string;
  } = {}
): string {
  const { currency = "USD", locale = "en-US" } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
