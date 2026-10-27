-- CreateEnum
CREATE TYPE "SaaSBillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SaaSSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SaaSInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'UNCOLLECTIBLE', 'VOID');

-- CreateEnum
CREATE TYPE "SaaSPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "saas_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "maxProducts" INTEGER NOT NULL DEFAULT 50,
    "maxStaff" INTEGER NOT NULL DEFAULT 2,
    "maxStorageMb" INTEGER NOT NULL DEFAULT 1000,
    "allowCustomThemes" BOOLEAN NOT NULL DEFAULT false,
    "allowAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "allowPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "interval" "SaaSBillingInterval" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountInCents" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_subscriptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "status" "SaaSSubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billingInterval" "SaaSBillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "endedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'SIMULATED',
    "providerSubscriptionId" TEXT,
    "providerCustomerId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "SaaSInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "billingPeriodStartsAt" TIMESTAMP(3) NOT NULL,
    "billingPeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "subtotalInCents" INTEGER NOT NULL,
    "taxInCents" INTEGER NOT NULL DEFAULT 0,
    "discountInCents" INTEGER NOT NULL DEFAULT 0,
    "totalInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "priceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountInCents" INTEGER NOT NULL,
    "totalAmountInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "businessId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SIMULATED',
    "providerPaymentId" TEXT,
    "amountInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "SaaSPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_billing_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentId" TEXT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "payload" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_usage_records" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "limitValue" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_plan_changes" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fromPlanId" TEXT NOT NULL,
    "toPlanId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "changeType" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "prorationAmountInCents" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_plan_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_billing_audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_billing_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saas_plans_code_key" ON "saas_plans"("code");

-- CreateIndex
CREATE INDEX "saas_plan_prices_planId_idx" ON "saas_plan_prices"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_prices_planId_interval_version_key" ON "saas_plan_prices"("planId", "interval", "version");

-- CreateIndex
CREATE UNIQUE INDEX "saas_subscriptions_businessId_key" ON "saas_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "saas_subscriptions_planId_idx" ON "saas_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "saas_subscriptions_priceId_idx" ON "saas_subscriptions"("priceId");

-- CreateIndex
CREATE INDEX "saas_subscriptions_status_idx" ON "saas_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "saas_invoices_invoiceNumber_key" ON "saas_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "saas_invoices_subscriptionId_idx" ON "saas_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "saas_invoices_businessId_idx" ON "saas_invoices"("businessId");

-- CreateIndex
CREATE INDEX "saas_invoices_status_idx" ON "saas_invoices"("status");

-- CreateIndex
CREATE INDEX "saas_invoices_invoiceNumber_idx" ON "saas_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "saas_invoice_lines_invoiceId_idx" ON "saas_invoice_lines"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_payments_paymentNumber_key" ON "saas_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "saas_payments_subscriptionId_idx" ON "saas_payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "saas_payments_invoiceId_idx" ON "saas_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "saas_payments_businessId_idx" ON "saas_payments"("businessId");

-- CreateIndex
CREATE INDEX "saas_payments_status_idx" ON "saas_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "saas_billing_events_eventId_key" ON "saas_billing_events"("eventId");

-- CreateIndex
CREATE INDEX "saas_billing_events_businessId_idx" ON "saas_billing_events"("businessId");

-- CreateIndex
CREATE INDEX "saas_billing_events_subscriptionId_idx" ON "saas_billing_events"("subscriptionId");

-- CreateIndex
CREATE INDEX "saas_billing_events_paymentId_idx" ON "saas_billing_events"("paymentId");

-- CreateIndex
CREATE INDEX "saas_billing_events_eventId_idx" ON "saas_billing_events"("eventId");

-- CreateIndex
CREATE INDEX "saas_usage_records_businessId_metric_idx" ON "saas_usage_records"("businessId", "metric");

-- CreateIndex
CREATE INDEX "saas_usage_records_subscriptionId_idx" ON "saas_usage_records"("subscriptionId");

-- CreateIndex
CREATE INDEX "saas_plan_changes_subscriptionId_idx" ON "saas_plan_changes"("subscriptionId");

-- CreateIndex
CREATE INDEX "saas_plan_changes_businessId_idx" ON "saas_plan_changes"("businessId");

-- CreateIndex
CREATE INDEX "saas_billing_audit_logs_businessId_idx" ON "saas_billing_audit_logs"("businessId");

-- CreateIndex
CREATE INDEX "saas_billing_audit_logs_userId_idx" ON "saas_billing_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "saas_billing_audit_logs_action_idx" ON "saas_billing_audit_logs"("action");

-- CreateIndex
CREATE INDEX "businesses_isSuspended_idx" ON "businesses"("isSuspended");

-- AddForeignKey
ALTER TABLE "saas_plan_prices" ADD CONSTRAINT "saas_plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "saas_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "saas_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "saas_plan_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "saas_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoice_lines" ADD CONSTRAINT "saas_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "saas_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoice_lines" ADD CONSTRAINT "saas_invoice_lines_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "saas_plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "saas_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "saas_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_billing_events" ADD CONSTRAINT "saas_billing_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_billing_events" ADD CONSTRAINT "saas_billing_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "saas_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_billing_events" ADD CONSTRAINT "saas_billing_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "saas_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_usage_records" ADD CONSTRAINT "saas_usage_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_usage_records" ADD CONSTRAINT "saas_usage_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "saas_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_changes" ADD CONSTRAINT "saas_plan_changes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "saas_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_changes" ADD CONSTRAINT "saas_plan_changes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_changes" ADD CONSTRAINT "saas_plan_changes_fromPlanId_fkey" FOREIGN KEY ("fromPlanId") REFERENCES "saas_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_changes" ADD CONSTRAINT "saas_plan_changes_toPlanId_fkey" FOREIGN KEY ("toPlanId") REFERENCES "saas_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_changes" ADD CONSTRAINT "saas_plan_changes_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_billing_audit_logs" ADD CONSTRAINT "saas_billing_audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_billing_audit_logs" ADD CONSTRAINT "saas_billing_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

