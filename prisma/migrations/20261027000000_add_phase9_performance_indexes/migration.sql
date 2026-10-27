-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_deliveryStatus_idx" ON "notifications"("deliveryStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_businessId_isRead_idx" ON "notifications"("businessId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saas_invoices_businessId_status_idx" ON "saas_invoices"("businessId", "status");
