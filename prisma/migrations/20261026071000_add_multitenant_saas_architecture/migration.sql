-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'CANCELLATION';

-- DropIndex
DROP INDEX IF EXISTS "carts_sessionToken_key";
DROP INDEX IF EXISTS "categories_name_key";
DROP INDEX IF EXISTS "categories_slug_key";
DROP INDEX IF EXISTS "products_isArchived_published_idx";
DROP INDEX IF EXISTS "products_slug_key";

-- CreateTable businesses
CREATE TABLE IF NOT EXISTS "businesses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LUXURY_FASHION',
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "businesses_slug_key" UNIQUE ("slug")
);

-- Seed default-store into businesses before foreign keys
INSERT INTO "businesses" ("id", "slug", "name", "type", "status", "currency", "contactEmail", "createdAt", "updatedAt")
VALUES ('default-store', 'nexora', 'NEXORA Haute Couture', 'LUXURY_FASHION', 'ACTIVE', 'USD', 'concierge@nexoracommerce.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable business_members
CREATE TABLE IF NOT EXISTS "business_members" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessRole" NOT NULL DEFAULT 'STAFF',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_members_businessId_userId_key" UNIQUE ("businessId", "userId")
);

-- Connect Owner to default-store in business_members
INSERT INTO "business_members" ("id", "businessId", "userId", "role", "title", "createdAt", "updatedAt")
SELECT 'bm_owner_' || u.id, 'default-store', u.id, 'OWNER'::"BusinessRole", 'Store Director', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
WHERE u.role IN ('OWNER', 'SUPERADMIN') OR u.email = 'owner@nexoracommerce.com'
ON CONFLICT ("businessId", "userId") DO NOTHING;

-- CreateTable business_settings
CREATE TABLE IF NOT EXISTS "business_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "payhereMerchantId" TEXT,
    "payhereMerchantSecret" TEXT,
    "allowMockPayment" BOOLEAN NOT NULL DEFAULT true,
    "inventoryTracking" BOOLEAN NOT NULL DEFAULT true,
    "orderPrefix" TEXT NOT NULL DEFAULT 'NXR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_settings_businessId_key" UNIQUE ("businessId")
);

-- Seed default business_settings
INSERT INTO "business_settings" ("id", "businessId", "payhereMerchantId", "payhereMerchantSecret", "allowMockPayment", "inventoryTracking", "orderPrefix", "createdAt", "updatedAt")
VALUES ('bset_default', 'default-store', '1225000', 'nexora_payhere_sandbox_secret', true, true, 'NXR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("businessId") DO NOTHING;

-- CreateTable business_invitations
CREATE TABLE IF NOT EXISTS "business_invitations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "BusinessRole" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_invitations_token_key" UNIQUE ("token")
);

-- CreateTable business_audit_logs
CREATE TABLE IF NOT EXISTS "business_audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_audit_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable existing entities to add businessId
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "payment_events" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "stock_reservations" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "businessId" TEXT NOT NULL DEFAULT 'default-store';

-- Backfill any nulls
UPDATE "categories" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "products" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "carts" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "inventory_movements" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "orders" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "payments" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "stock_reservations" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "return_requests" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "support_tickets" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;
UPDATE "store_theme_configs" SET "businessId" = 'default-store' WHERE "businessId" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "businesses_slug_idx" ON "businesses"("slug");
CREATE INDEX IF NOT EXISTS "businesses_status_idx" ON "businesses"("status");

CREATE INDEX IF NOT EXISTS "business_members_businessId_idx" ON "business_members"("businessId");
CREATE INDEX IF NOT EXISTS "business_members_userId_idx" ON "business_members"("userId");

CREATE INDEX IF NOT EXISTS "business_invitations_businessId_idx" ON "business_invitations"("businessId");
CREATE INDEX IF NOT EXISTS "business_invitations_email_idx" ON "business_invitations"("email");
CREATE INDEX IF NOT EXISTS "business_invitations_token_idx" ON "business_invitations"("token");

CREATE INDEX IF NOT EXISTS "business_audit_logs_businessId_idx" ON "business_audit_logs"("businessId");
CREATE INDEX IF NOT EXISTS "business_audit_logs_userId_idx" ON "business_audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "business_audit_logs_action_idx" ON "business_audit_logs"("action");

CREATE INDEX IF NOT EXISTS "carts_businessId_idx" ON "carts"("businessId");
CREATE INDEX IF NOT EXISTS "carts_userId_idx" ON "carts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "carts_businessId_sessionToken_key" ON "carts"("businessId", "sessionToken");

CREATE INDEX IF NOT EXISTS "categories_businessId_idx" ON "categories"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_businessId_slug_key" ON "categories"("businessId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_businessId_name_key" ON "categories"("businessId", "name");

CREATE INDEX IF NOT EXISTS "inventory_movements_businessId_idx" ON "inventory_movements"("businessId");
CREATE INDEX IF NOT EXISTS "inventory_movements_businessId_createdAt_idx" ON "inventory_movements"("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "notifications_businessId_idx" ON "notifications"("businessId");

CREATE INDEX IF NOT EXISTS "orders_businessId_idx" ON "orders"("businessId");
CREATE INDEX IF NOT EXISTS "orders_businessId_status_idx" ON "orders"("businessId", "status");
CREATE INDEX IF NOT EXISTS "orders_businessId_createdAt_idx" ON "orders"("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "payment_events_businessId_idx" ON "payment_events"("businessId");
CREATE INDEX IF NOT EXISTS "payments_businessId_idx" ON "payments"("businessId");

CREATE INDEX IF NOT EXISTS "products_businessId_idx" ON "products"("businessId");
CREATE INDEX IF NOT EXISTS "products_businessId_published_idx" ON "products"("businessId", "published");
CREATE INDEX IF NOT EXISTS "products_businessId_isArchived_idx" ON "products"("businessId", "isArchived");
CREATE UNIQUE INDEX IF NOT EXISTS "products_businessId_slug_key" ON "products"("businessId", "slug");

CREATE INDEX IF NOT EXISTS "return_requests_businessId_idx" ON "return_requests"("businessId");
CREATE INDEX IF NOT EXISTS "return_requests_businessId_status_idx" ON "return_requests"("businessId", "status");

CREATE INDEX IF NOT EXISTS "stock_reservations_businessId_idx" ON "stock_reservations"("businessId");
CREATE INDEX IF NOT EXISTS "stock_reservations_businessId_status_expiresAt_idx" ON "stock_reservations"("businessId", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS "support_tickets_businessId_idx" ON "support_tickets"("businessId");
CREATE INDEX IF NOT EXISTS "support_tickets_businessId_status_idx" ON "support_tickets"("businessId", "status");

-- AddForeignKeys
ALTER TABLE "business_members" DROP CONSTRAINT IF EXISTS "business_members_businessId_fkey";
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_members" DROP CONSTRAINT IF EXISTS "business_members_userId_fkey";
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_settings" DROP CONSTRAINT IF EXISTS "business_settings_businessId_fkey";
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_invitations" DROP CONSTRAINT IF EXISTS "business_invitations_businessId_fkey";
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_invitations" DROP CONSTRAINT IF EXISTS "business_invitations_invitedById_fkey";
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_audit_logs" DROP CONSTRAINT IF EXISTS "business_audit_logs_businessId_fkey";
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_audit_logs" DROP CONSTRAINT IF EXISTS "business_audit_logs_userId_fkey";
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_businessId_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_businessId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_businessId_fkey";
ALTER TABLE "carts" ADD CONSTRAINT "carts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" DROP CONSTRAINT IF EXISTS "inventory_movements_businessId_fkey";
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_businessId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_businessId_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_reservations" DROP CONSTRAINT IF EXISTS "stock_reservations_businessId_fkey";
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "return_requests" DROP CONSTRAINT IF EXISTS "return_requests_businessId_fkey";
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_businessId_fkey";
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_businessId_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_theme_configs" DROP CONSTRAINT IF EXISTS "store_theme_configs_businessId_fkey";
ALTER TABLE "store_theme_configs" ADD CONSTRAINT "store_theme_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
