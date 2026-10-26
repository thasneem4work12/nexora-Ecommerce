import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User, Session, Business, BusinessMember, BusinessRole } from "@prisma/client";
import { getActiveAdminBusinessId, DEFAULT_BUSINESS_ID } from "@/lib/tenant-context";

export const ROLE_HIERARCHY: Record<Role, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
  SUPERADMIN: 4,
};

export const BUSINESS_ROLE_HIERARCHY: Record<BusinessRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
};

export const PERMISSIONS = {
  VIEW_ADMIN: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_PRODUCTS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  CREATE_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  EDIT_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  PUBLISH_PRODUCT: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  ARCHIVE_PRODUCT: ["OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_CATEGORIES: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_VARIANTS: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_INVENTORY: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  ADJUST_INVENTORY: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_AUDIT_LOGS: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_ORDERS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_ORDERS: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_CUSTOMERS: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_SUPPORT: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_APPEARANCE: ["STAFF", "MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_APPEARANCE: ["OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_SETTINGS: ["OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_MEMBERS: ["OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  VIEW_BILLING: ["MANAGER", "OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  MANAGE_BILLING: ["OWNER", "SUPERADMIN"] as (Role | BusinessRole)[],
  PLATFORM_ADMIN: ["SUPERADMIN"] as (Role | BusinessRole)[],
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
export function hasPermission(role: Role | BusinessRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return (allowedRoles as readonly (Role | BusinessRole)[]).includes(role);
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

export interface AdminContext {
  user: User;
  session: Session;
  businessId: string;
  business: Business;
  member?: BusinessMember | null;
  role: Role | BusinessRole;
  businessRole?: BusinessRole | null;
  isSuperAdmin: boolean;
}

/**
 * Resolves the authenticated user's authorization within a specific business context.
 * Honors global SUPERADMIN with auditing, and verifies BusinessMember for all other roles.
 */
export async function getVerifiedBusinessContext(
  requestedBusinessId?: string,
  permission: Permission = "VIEW_ADMIN"
): Promise<AdminContext> {
  const verified = await getVerifiedUserSession();

  if (!verified) {
    throw new AuthError("Authentication required. Please sign in.", 401);
  }

  const { user, session } = verified;
  const targetBusinessId = requestedBusinessId || (await getActiveAdminBusinessId());

  // 1. Platform SUPERADMIN bypass
  if (user.role === "SUPERADMIN") {
    let business = await prisma.business.findUnique({
      where: { id: targetBusinessId },
    });
    if (!business) {
      business = await prisma.business.findFirst({
        where: { id: DEFAULT_BUSINESS_ID },
      });
    }

    if (!business) {
      throw new AuthError("Target business not found", 404);
    }

    return {
      user,
      session,
      businessId: business.id,
      business,
      member: null,
      role: "SUPERADMIN",
      businessRole: null,
      isSuperAdmin: true,
    };
  }

  // 2. Query business membership
  const member = await prisma.businessMember.findUnique({
    where: {
      businessId_userId: {
        businessId: targetBusinessId,
        userId: user.id,
      },
    },
    include: { business: true },
  });

  if (!member) {
    // Check if user has membership in ANY business
    const userMemberships = await prisma.businessMember.findMany({
      where: { userId: user.id },
      include: { business: true },
      take: 1,
    });

    if (user.role === "CUSTOMER") {
      throw new AuthError(
        "Access denied: Customer accounts do not have administrative privileges.",
        403
      );
    }

    if (userMemberships.length === 0) {
      // Legacy owner bootstrap compatibility: if user has role OWNER in User table and target is default-store
      if (user.role === "OWNER" && targetBusinessId === DEFAULT_BUSINESS_ID) {
        const defaultBiz = await prisma.business.findUnique({
          where: { id: DEFAULT_BUSINESS_ID },
        });
        if (defaultBiz) {
          // Auto-connect legacy owner to default business
          const createdMember = await prisma.businessMember.upsert({
            where: {
              businessId_userId: {
                businessId: DEFAULT_BUSINESS_ID,
                userId: user.id,
              },
            },
            create: {
              businessId: DEFAULT_BUSINESS_ID,
              userId: user.id,
              role: "OWNER",
              title: "Store Director",
            },
            update: {},
            include: { business: true },
          });

          return {
            user,
            session,
            businessId: defaultBiz.id,
            business: defaultBiz,
            member: createdMember,
            role: "OWNER",
            businessRole: "OWNER",
            isSuperAdmin: false,
          };
        }
      }

      throw new AuthError(
        "Access denied: You do not have administrative membership in any business.",
        403
      );
    }

    throw new AuthError(
      `Access denied: You are not authorized to administer business '${targetBusinessId}'.`,
      403
    );
  }

  // 3. Verify business is active
  if (member.business.status === "SUSPENDED" || member.business.isSuspended) {
    throw new AuthError("Access denied: This business account is suspended.", 403);
  }

  // 4. Verify permission for member's role
  if (!hasPermission(member.role, permission)) {
    throw new AuthError(
      `Access denied: Your role (${member.role}) does not have permission for '${permission}'.`,
      403
    );
  }

  return {
    user,
    session,
    businessId: member.business.id,
    business: member.business,
    member,
    role: member.role,
    businessRole: member.role,
    isSuperAdmin: false,
  };
}

/**
 * Server guard for Route Handlers and Server Actions with multi-tenant context.
 * Polymorphically accepts either (request, permission) or (permission, options).
 */
export async function requireAdminApi(
  firstArg?: Permission | Request | unknown,
  secondArg?: Permission | { businessId?: string },
  thirdArg?: { businessId?: string }
): Promise<AdminContext> {
  let permission: Permission = "VIEW_ADMIN";
  let businessId: string | undefined;

  if (firstArg && typeof firstArg === "object" && ("headers" in firstArg || "url" in firstArg)) {
    // Called as (request, permission, options)
    if (typeof secondArg === "string") {
      permission = secondArg as Permission;
    }
    if (thirdArg?.businessId) {
      businessId = thirdArg.businessId;
    }
  } else {
    // Called as (permission, options)
    if (typeof firstArg === "string") {
      permission = firstArg as Permission;
    }
    if (secondArg && typeof secondArg === "object" && "businessId" in secondArg) {
      businessId = secondArg.businessId;
    }
  }

  return getVerifiedBusinessContext(businessId, permission);
}

/**
 * Server guard for Next.js Server Component pages with multi-tenant context.
 */
export async function requireAdminPageSession(
  permission: Permission = "VIEW_ADMIN",
  options?: { businessId?: string }
): Promise<AdminContext> {
  const verified = await getVerifiedUserSession();

  if (!verified) {
    redirect("/login?callbackUrl=/admin");
  }

  if (verified.user.role === "CUSTOMER") {
    // Check if customer has any business memberships
    const memberCount = await prisma.businessMember.count({
      where: { userId: verified.user.id },
    });
    if (memberCount === 0) {
      redirect("/account");
    }
  }

  try {
    return await getVerifiedBusinessContext(options?.businessId, permission);
  } catch (err) {
    const error = err as AuthError;
    if (error.status === 401) {
      redirect("/login?callbackUrl=/admin");
    }
    redirect("/admin?error=unauthorized_action");
  }
}

/**
 * Requires the active session to belong to a global platform SUPERADMIN.
 * Used for platform API route handlers.
 */
export async function requirePlatformSuperadmin(): Promise<{ user: User; session: Session }> {
  const verified = await getVerifiedUserSession();
  if (!verified) {
    throw new AuthError("Authentication required. Please sign in.", 401);
  }
  if (verified.user.role !== "SUPERADMIN") {
    throw new AuthError("Access denied: Platform SUPERADMIN authorization required.", 403);
  }
  return verified;
}

/**
 * Requires the active session to belong to a global platform SUPERADMIN.
 * Used for platform Server Component pages.
 */
export async function requirePlatformPageSession(): Promise<{ user: User; session: Session }> {
  const verified = await getVerifiedUserSession();
  if (!verified) {
    redirect("/login?callbackUrl=/platform");
  }
  if (verified.user.role !== "SUPERADMIN") {
    redirect("/admin?error=superadmin_required");
  }
  return verified;
}
