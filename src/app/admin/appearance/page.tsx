import React from "react";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getStoreAppearance } from "@/services/theme.service";
import { THEME_REGISTRY } from "@/lib/themes/definitions";
import { prisma } from "@/lib/prisma";
import { AppearanceStudioClient } from "@/components/admin/appearance/AppearanceStudioClient";

export const metadata = {
  title: "Theme & Store Appearance Studio | Atelier Administration",
  description: "Customize storefront themes, typography, branding, and homepage sections with draft preview and publishing controls.",
};

export default async function AdminAppearancePage() {
  const { user } = await requireAdminPageSession("VIEW_APPEARANCE");

  const published = await getStoreAppearance({ previewDraft: false });
  const dbConfig = await prisma.storeThemeConfig.findUnique({
    where: { businessId: "default-store" },
  });

  const draft = (dbConfig?.draftConfig as Record<string, unknown>) || null;

  const themesList = Object.values(THEME_REGISTRY).map((t) => ({
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    palette: t.palette,
    typography: t.typography,
    borders: t.borders,
    productCard: t.productCard,
    header: t.header,
    footer: t.footer,
    defaultSections: t.defaultSections,
  }));

  return (
    <AppearanceStudioClient
      published={published}
      initialDraft={draft}
      themes={themesList}
      userRole={user.role}
    />
  );
}
