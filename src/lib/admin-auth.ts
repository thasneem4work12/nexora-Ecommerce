import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User, Session } from "@prisma/client";

export const ROLE_HIERARCHY: Record<Role, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
  SUPERADMIN: 4,
};

export const PERMISSIONS = {
  VIEW_ADMIN: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  VIEW_PRODUCTS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  CREATE_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  EDIT_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  PUBLISH_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  ARCHIVE_PRODUCT: ["OWNER", "SUPERADMIN"] as Role[],
  MANAGE_CATEGORIES: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  MANAGE_VARIANTS: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  VIEW_INVENTORY: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  ADJUST_INVENTORY: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  VIEW_AUDIT_LOGS: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  VIEW_ORDERS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  MANAGE_ORDERS: ["MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  VIEW_CUSTOMERS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  MANAGE_SUPPORT: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as Role[],
  MANAGE_SETTINGS: ["OWNER", "SUPERADMIN"] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Checks if a given role possesses the required permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role);
}

/**
 * Authoritatively retrieves the current user and session from PostgreSQL.
 * Guarantees roles are verified against the database and cannot be spoofed in cookies.
 */
export async function getVerifiedUserSession(): Promise<{
  user: User;
  session: Session;
} | null> {
  try {
    const reqHeaders = await headers();
    const authSession = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!authSession || !authSession.user || !authSession.session) {
      return null;
    }

    // Authoritative check against PostgreSQL
    const dbUser = await prisma.user.findUnique({
      where: { id: authSession.user.id },
    });

    if (!dbUser) {
      return null;
    }

    const dbSession = await prisma.session.findUnique({
      where: { id: authSession.session.id },
    });

    if (!dbSession || dbSession.expiresAt < new Date()) {
      return null;
    }

    return {
      user: dbUser,
      session: dbSession,
    };
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return null;
  }
}

/**
 * Server guard for Route Handlers and Server Actions.
 * Throws an AuthError (401 or 403) if verification fails.
 */
export async function requireAdminApi(
  permission: Permission = "VIEW_ADMIN"
): Promise<{ user: User; session: Session }> {
  const verified = await getVerifiedUserSession();

  if (!verified) {
    throw new AuthError("Authentication required. Please sign in.", 401);
  }

  if (verified.user.role === "CUSTOMER") {
    throw new AuthError(
      "Access denied: Customer accounts do not have administrative privileges.",
      403
    );
  }

  if (!hasPermission(verified.user.role, permission)) {
    throw new AuthError(
      `Access denied: Your role (${verified.user.role}) does not have permission for '${permission}'.`,
      403
    );
  }

  return verified;
}

/**
 * Server guard for Next.js Server Component pages.
 * Redirects unauthenticated users or customers away from administrative layouts.
 */
export async function requireAdminPageSession(
  permission: Permission = "VIEW_ADMIN"
): Promise<{ user: User; session: Session }> {
  const verified = await getVerifiedUserSession();

  if (!verified) {
    redirect("/login?callbackUrl=/admin");
  }

  if (verified.user.role === "CUSTOMER") {
    redirect("/account");
  }

  if (!hasPermission(verified.user.role, permission)) {
    redirect("/admin?error=unauthorized_action");
  }

  return verified;
}
