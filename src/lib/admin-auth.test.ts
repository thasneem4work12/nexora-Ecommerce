import { describe, it, expect } from "vitest";
import {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  AuthError,
  type Permission,
} from "./admin-auth";

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

    // Staff cannot manage categories, audit logs, or settings
    expect(hasPermission("STAFF", "MANAGE_CATEGORIES")).toBe(false);
    expect(hasPermission("STAFF", "MANAGE_VARIANTS")).toBe(false);
    expect(hasPermission("STAFF", "VIEW_AUDIT_LOGS")).toBe(false);
    expect(hasPermission("STAFF", "MANAGE_SETTINGS")).toBe(false);
  });

  it("should grant MANAGER product and category management but deny destructive store settings", () => {
    expect(hasPermission("MANAGER", "VIEW_ADMIN")).toBe(true);
    expect(hasPermission("MANAGER", "VIEW_PRODUCTS")).toBe(true);
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
