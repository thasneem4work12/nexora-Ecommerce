import React from "react";
import { notFound } from "next/navigation";
import { resolveStoreTenant } from "@/lib/tenant-context";
import { getPublishedProducts } from "@/services/catalog.service";
import { getStoreAppearance } from "@/services/theme.service";
import { HomeSectionsRenderer } from "@/components/home/HomeSectionsRenderer";

interface StoreHomePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    previewTheme?: string;
    previewDraft?: string;
  }>;
}

export default async function StoreHomePage({ params, searchParams }: StoreHomePageProps) {
  const { slug } = await params;
  const tenant = await resolveStoreTenant(slug);

  if (!tenant) {
    notFound();
  }

  const { business } = tenant;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const previewThemeId = resolvedSearchParams.previewTheme || null;
  const previewDraft = resolvedSearchParams.previewDraft === "true";

  const appearance = await getStoreAppearance({
    businessId: business.id,
    previewThemeId,
    previewDraft,
  });

  const { products: featuredProducts } = await getPublishedProducts({
    businessId: business.id,
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
