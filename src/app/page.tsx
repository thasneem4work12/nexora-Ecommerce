import React from "react";
import { cookies } from "next/headers";
import { getPublishedProducts } from "@/services/catalog.service";
import { getStoreAppearance } from "@/services/theme.service";
import { HomeSectionsRenderer } from "@/components/home/HomeSectionsRenderer";

interface PageProps {
  searchParams?: Promise<{
    previewTheme?: string;
    previewDraft?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const previewCookie = cookieStore.get("nexora_theme_preview")?.value;

  const previewThemeId = resolvedParams.previewTheme || previewCookie || null;
  const previewDraft = resolvedParams.previewDraft === "true";

  const appearance = await getStoreAppearance({
    previewThemeId,
    previewDraft,
  });

  const { products: featuredProducts } = await getPublishedProducts({
    featuredOnly: true,
    limit: 8,
  });

  return (
    <HomeSectionsRenderer
      sections={appearance.homepageSections}
      featuredProducts={featuredProducts}
      themeId={appearance.activeThemeId}
    />
  );
}
