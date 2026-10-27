import { NextRequest, NextResponse } from "next/server";
import { PILOT_COOKIE_NAME, verifyPilotSessionToken, validateHostHeader } from "@/lib/pilot-gate";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Host Header Validation
  // If pilot gate is enabled or approved pilot hostname is configured, ensure Host header is valid
  if (process.env.PILOT_ACCESS_GATE_ENABLED === "true" || process.env.APPROVED_PILOT_HOSTNAME) {
    if (!validateHostHeader(req)) {
      return new NextResponse(
        JSON.stringify({
          error: "Forbidden: Host header does not match approved pilot domain",
          code: "INVALID_HOST_HEADER",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // 2. Pilot Access Gate Check
  // Only enforce access gating if PILOT_ACCESS_GATE_ENABLED is set to "true"
  if (process.env.PILOT_ACCESS_GATE_ENABLED === "true") {
    // Whitelisted bypass paths:
    // - Health/readiness checks (Docker and load balancer probes)
    // - Pilot unlock UI and API endpoints
    // - Static files / uploads
    const isBypassPath =
      pathname.startsWith("/api/health") ||
      pathname.startsWith("/api/ready") ||
      pathname.startsWith("/api/pilot") ||
      pathname === "/pilot-access" ||
      pathname.startsWith("/uploads/") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/_next/");

    if (!isBypassPath) {
      const pilotCookie = req.cookies.get(PILOT_COOKIE_NAME);
      const isAuthorized = pilotCookie ? await verifyPilotSessionToken(pilotCookie.value) : false;

      if (!isAuthorized) {
        // If it's an API request, return 401 Unauthorized
        if (pathname.startsWith("/api/")) {
          return new NextResponse(
            JSON.stringify({
              error: "Pilot Access Required. Enter a valid invitation key at /pilot-access",
              code: "PILOT_ACCESS_REQUIRED",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // For page requests, redirect to the pilot access unlock portal
        const unlockUrl = req.nextUrl.clone();
        unlockUrl.pathname = "/pilot-access";
        unlockUrl.searchParams.set("returnUrl", req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(unlockUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
