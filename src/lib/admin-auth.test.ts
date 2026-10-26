import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  AuthError,
  requireAdminApi,
  type Permission,
} from "./admin-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BusinessRole } from "@prisma/client";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    businessMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("Admin Authorization & RBAC Matrix", () => {
  it("should have correct role hierarchy ordering", () => {
    expect(ROLE_HIERARCHY.CUSTOMER).toBe(0);
    expect(ROLE_HIERARCHY.STAFF).toBe(1);
    expect(ROLE_HIERARCHY.MANAGER).toBe(2);
    expect(ROLE_HIERARCHY.OWNER).toBe(3);
    expect(ROLE_HIERARCHY.SUPERADMIN).toBe(4);

    expect(ROLE_HIERARCHY.OWNER).toBeGreaterThan(ROLE_HIERARCHY.MANAGER);
    expect(ROLE_HIERARCHY.MANAGER).toBeGreaterThan(ROLE_HIERARCHY.STAFF);
    expect(ROLE_HIERARCHY.STAFF).toBeGreaterThan(ROLE_HIERARCHY.CUSTOMER);
  });

  it("should deny CUSTOMER from all administrative capabilities", () => {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];

    allPermissions.forEach((perm) => {
      expect(hasPermission("CUSTOMER", perm)).toBe(false);
    });
  });

  it("should enforce STAFF permissions strictly to view and operational stock adjustment", () => {
    expect(hasPermission("STAFF", "VIEW_ADMIN")).toBe(true);
    expect(hasPermission("STAFF", "VIEW_PRODUCTS")).toBe(true);
    expect(hasPermission("STAFF", "VIEW_INVENTORY")).toBe(true);
    expect(hasPermission("STAFF", "ADJUST_INVENTORY")).toBe(true);

    // Staff cannot create, edit, publish, or archive products
    expect(hasPermission("STAFF", "CREATE_PRODUCT")).toBe(false);
    expect(hasPermission("STAFF", "EDIT_PRODUCT")).toBe(false);
    expect(hasPermission("STAFF", "PUBLISH_PRODUCT")).toBe(false);
    expect(hasPermission("STAFF", "ARCHIVE_PRODUCT")).toBe(false);

    // Staff can view orders, but cannot manage fulfillment
    expect(hasPermission("STAFF", "VIEW_ORDERS")).toBe(true);
    expect(hasPermission("STAFF", "MANAGE_ORDERS")).toBe(false);

    // Staff cannot manage categories, audit logs, or settings
    expect(hasPermission("STAFF", "MANAGE_CATEGORIES")).toBe(false);
    expect(hasPermission("STAFF", "MANAGE_VARIANTS")).toBe(false);
    expect(hasPermission("STAFF", "VIEW_AUDIT_LOGS")).toBe(false);
    expect(hasPermission("STAFF", "MANAGE_SETTINGS")).toBe(false);
  });

  it("should grant MANAGER product and category management but deny destructive store settings", () => {
    expect(hasPermission("MANAGER", "VIEW_ADMIN")).toBe(true);
    expect(hasPermission("MANAGER", "VIEW_PRODUCTS")).toBe(true);
    expect(hasPermission("MANAGER", "VIEW_ORDERS")).toBe(true);
    expect(hasPermission("MANAGER", "MANAGE_ORDERS")).toBe(true);
    expect(hasPermission("MANAGER", "CREATE_PRODUCT")).toBe(true);
    expect(hasPermission("MANAGER", "EDIT_PRODUCT")).toBe(true);
    expect(hasPermission("MANAGER", "PUBLISH_PRODUCT")).toBe(true);
    expect(hasPermission("MANAGER", "MANAGE_CATEGORIES")).toBe(true);
    expect(hasPermission("MANAGER", "MANAGE_VARIANTS")).toBe(true);
    expect(hasPermission("MANAGER", "VIEW_INVENTORY")).toBe(true);
    expect(hasPermission("MANAGER", "ADJUST_INVENTORY")).toBe(true);
    expect(hasPermission("MANAGER", "VIEW_AUDIT_LOGS")).toBe(true);

    // Manager cannot archive products or change store settings
    expect(hasPermission("MANAGER", "ARCHIVE_PRODUCT")).toBe(false);
    expect(hasPermission("MANAGER", "MANAGE_SETTINGS")).toBe(false);
  });

  it("should grant OWNER full administrative access across the platform", () => {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];

    allPermissions.forEach((perm) => {
      expect(hasPermission("OWNER", perm)).toBe(true);
    });
  });

  it("should grant SUPERADMIN full administrative access", () => {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];

    allPermissions.forEach((perm) => {
      expect(hasPermission("SUPERADMIN", perm)).toBe(true);
    });
  });

  it("should construct AuthError with status code and name", () => {
    const err401 = new AuthError("Unauthenticated", 401);
    expect(err401.message).toBe("Unauthenticated");
    expect(err401.status).toBe(401);
    expect(err401.name).toBe("AuthError");

    const err403 = new AuthError("Forbidden", 403);
    expect(err403.status).toBe(403);
  });
});

import type { Role, User, Session } from "@prisma/client";

describe("requireAdminApi Server Guard Enforcement", () => {
  const futureExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

  function mockActiveSession(role: Role) {
    const mockUser: User = {
      id: `usr-${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@nexoracommerce.com`,
      name: `${role} Test User`,
      emailVerified: true,
      image: null,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockSession: Session = {
      id: `sess-${role.toLowerCase()}-1`,
      userId: mockUser.id,
      token: "mock-token",
      expiresAt: futureExpiry,
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);

    if (role === "CUSTOMER") {
      vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.businessMember.findMany).mockResolvedValue([]);
    } else {
      vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
        id: `bm-${role.toLowerCase()}-1`,
        businessId: "default-store",
        userId: mockUser.id,
        role: role as unknown as BusinessRole,
        title: `${role} Lead`,
        createdAt: new Date(),
        updatedAt: new Date(),
        business: {
          id: "default-store",
          slug: "nexora",
          name: "NEXORA Haute Couture",
          type: "LUXURY_FASHION",
          status: "ACTIVE",
          currency: "USD",
          contactEmail: "concierge@nexoracommerce.com",
          contactPhone: "+1800123456",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof prisma.businessMember.findUnique>>);
    }

    return { mockUser, mockSession };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated requests with HTTP 401", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    await expect(requireAdminApi("VIEW_ADMIN")).rejects.toThrowError(
      new AuthError("Authentication required. Please sign in.", 401)
    );
  });

  it("should reject expired sessions with HTTP 401", async () => {
    const expiredDate = new Date(Date.now() - 10000);
    const mockUser: User = {
      id: "u-expired-1",
      name: "Owner User",
      email: "owner@nexora.com",
      emailVerified: true,
      image: null,
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockExpiredSession: Session = {
      id: "s-expired-1",
      userId: "u-expired-1",
      token: "expired-tok",
      expiresAt: expiredDate,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: mockUser,
      session: mockExpiredSession,
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockExpiredSession);

    await expect(requireAdminApi("VIEW_ADMIN")).rejects.toThrowError(
      new AuthError("Authentication required. Please sign in.", 401)
    );
  });

  it("should strictly reject CUSTOMER accounts with HTTP 403 on any admin endpoint", async () => {
    mockActiveSession("CUSTOMER");

    await expect(requireAdminApi("VIEW_ADMIN")).rejects.toThrowError(
      new AuthError("Access denied: Customer accounts do not have administrative privileges.", 403)
    );

    await expect(requireAdminApi("VIEW_PRODUCTS")).rejects.toThrowError(
      new AuthError("Access denied: Customer accounts do not have administrative privileges.", 403)
    );

    await expect(requireAdminApi("ADJUST_INVENTORY")).rejects.toThrowError(
      new AuthError("Access denied: Customer accounts do not have administrative privileges.", 403)
    );
  });

  it("should enforce STAFF role limits: allow operational tasks, deny management mutations", async () => {
    mockActiveSession("STAFF");

    // Permitted for STAFF
    const allowed = await requireAdminApi("VIEW_ADMIN");
    expect(allowed.user.role).toBe("STAFF");

    const allowedInv = await requireAdminApi("ADJUST_INVENTORY");
    expect(allowedInv.user.role).toBe("STAFF");

    // Prohibited for STAFF -> must reject with HTTP 403
    await expect(requireAdminApi("CREATE_PRODUCT")).rejects.toThrowError(
      new AuthError("Access denied: Your role (STAFF) does not have permission for 'CREATE_PRODUCT'.", 403)
    );

    await expect(requireAdminApi("ARCHIVE_PRODUCT")).rejects.toThrowError(
      new AuthError("Access denied: Your role (STAFF) does not have permission for 'ARCHIVE_PRODUCT'.", 403)
    );

    await expect(requireAdminApi("MANAGE_CATEGORIES")).rejects.toThrowError(
      new AuthError("Access denied: Your role (STAFF) does not have permission for 'MANAGE_CATEGORIES'.", 403)
    );

    await expect(requireAdminApi("VIEW_AUDIT_LOGS")).rejects.toThrowError(
      new AuthError("Access denied: Your role (STAFF) does not have permission for 'VIEW_AUDIT_LOGS'.", 403)
    );
  });

  it("should enforce MANAGER role limits: allow product creation, deny product archiving", async () => {
    mockActiveSession("MANAGER");

    // Permitted for MANAGER
    const allowed = await requireAdminApi("CREATE_PRODUCT");
    expect(allowed.user.role).toBe("MANAGER");

    const allowedCats = await requireAdminApi("MANAGE_CATEGORIES");
    expect(allowedCats.user.role).toBe("MANAGER");

    const allowedLogs = await requireAdminApi("VIEW_AUDIT_LOGS");
    expect(allowedLogs.user.role).toBe("MANAGER");

    // Prohibited for MANAGER -> must reject with HTTP 403
    await expect(requireAdminApi("ARCHIVE_PRODUCT")).rejects.toThrowError(
      new AuthError("Access denied: Your role (MANAGER) does not have permission for 'ARCHIVE_PRODUCT'.", 403)
    );

    await expect(requireAdminApi("MANAGE_SETTINGS")).rejects.toThrowError(
      new AuthError("Access denied: Your role (MANAGER) does not have permission for 'MANAGE_SETTINGS'.", 403)
    );
  });

  it("should allow OWNER access to all permissions including destructive actions", async () => {
    mockActiveSession("OWNER");

    const allowedArchive = await requireAdminApi("ARCHIVE_PRODUCT");
    expect(allowedArchive.user.role).toBe("OWNER");

    const allowedSettings = await requireAdminApi("MANAGE_SETTINGS");
    expect(allowedSettings.user.role).toBe("OWNER");
  });
});

