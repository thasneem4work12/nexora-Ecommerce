-- CreateEnum
CREATE TYPE "PilotInvitationStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PilotSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "pilot_invitations" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "testerName" TEXT NOT NULL,
    "testerEmail" TEXT,
    "testerRole" TEXT NOT NULL DEFAULT 'EXTERNAL_TESTER',
    "status" "PilotInvitationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "lastRedeemedAt" TIMESTAMP(3),
    "lastRedeemedIp" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_sessions" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "testerName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "PilotSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_rate_limits" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'PILOT_UNLOCK',
    "failedAttempts" INTEGER NOT NULL DEFAULT 1,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_access_audit_logs" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "identifier" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_access_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pilot_invitations_tokenHash_key" ON "pilot_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "pilot_invitations_status_idx" ON "pilot_invitations"("status");

-- CreateIndex
CREATE INDEX "pilot_invitations_expiresAt_idx" ON "pilot_invitations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pilot_sessions_sessionTokenHash_key" ON "pilot_sessions"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "pilot_sessions_invitationId_idx" ON "pilot_sessions"("invitationId");

-- CreateIndex
CREATE INDEX "pilot_sessions_status_idx" ON "pilot_sessions"("status");

-- CreateIndex
CREATE INDEX "pilot_sessions_expiresAt_idx" ON "pilot_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pilot_rate_limits_identifier_key" ON "pilot_rate_limits"("identifier");

-- CreateIndex
CREATE INDEX "pilot_rate_limits_identifier_idx" ON "pilot_rate_limits"("identifier");

-- CreateIndex
CREATE INDEX "pilot_rate_limits_blockedUntil_idx" ON "pilot_rate_limits"("blockedUntil");

-- CreateIndex
CREATE INDEX "pilot_access_audit_logs_invitationId_idx" ON "pilot_access_audit_logs"("invitationId");

-- CreateIndex
CREATE INDEX "pilot_access_audit_logs_sessionId_idx" ON "pilot_access_audit_logs"("sessionId");

-- CreateIndex
CREATE INDEX "pilot_access_audit_logs_action_idx" ON "pilot_access_audit_logs"("action");

-- CreateIndex
CREATE INDEX "pilot_access_audit_logs_createdAt_idx" ON "pilot_access_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "pilot_sessions" ADD CONSTRAINT "pilot_sessions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "pilot_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_access_audit_logs" ADD CONSTRAINT "pilot_access_audit_logs_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "pilot_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_access_audit_logs" ADD CONSTRAINT "pilot_access_audit_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pilot_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
