/**
 * Open redirect protection helper.
 * Strictly verifies that a given callback or redirect URL is a safe, internal relative path.
 * Neutralizes external hosts, protocol-relative bypasses (//evil.com), Windows backslash tricks (/\evil.com),
 * and dangerous pseudo-protocols (javascript:, data:).
 */
export function getSafeCallbackUrl(rawUrl: string | null): string {
  if (!rawUrl) return "/account";

  // Disallow non-relative URLs or protocol-relative URLs (//evil.com or /\evil.com)
  if (!rawUrl.startsWith("/") || rawUrl.startsWith("//") || rawUrl.startsWith("/\\")) {
    return "/account";
  }

  // Disallow control characters or pseudo-protocols
  if (/[\x00-\x1F\x7F]/.test(rawUrl) || rawUrl.toLowerCase().includes("javascript:")) {
    return "/account";
  }

  return rawUrl;
}
