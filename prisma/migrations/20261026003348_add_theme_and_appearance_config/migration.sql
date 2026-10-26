-- CreateTable
CREATE TABLE "store_theme_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL DEFAULT 'default-store',
    "activeThemeId" TEXT NOT NULL DEFAULT 'editorial-luxury',
    "storeName" TEXT NOT NULL DEFAULT 'NEXORA',
    "storeTagline" TEXT NOT NULL DEFAULT 'Haute Couture',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "contactEmail" TEXT DEFAULT 'concierge@nexoracommerce.com',
    "contactPhone" TEXT DEFAULT '+1 (800) 456-7890',
    "announcementText" TEXT DEFAULT 'Complimentary Worldwide Delivery on Orders Over $150',
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementLink" TEXT DEFAULT '/products',
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "fontPreset" TEXT NOT NULL DEFAULT 'default',
    "headerConfig" JSONB,
    "footerConfig" JSONB,
    "homepageSections" JSONB,
    "draftConfig" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_theme_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_theme_configs_businessId_key" ON "store_theme_configs"("businessId");

-- CreateIndex
CREATE INDEX "store_theme_configs_businessId_idx" ON "store_theme_configs"("businessId");

-- CreateIndex
CREATE INDEX "store_theme_configs_activeThemeId_idx" ON "store_theme_configs"("activeThemeId");
