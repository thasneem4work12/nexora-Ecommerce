import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveStoreTenant } from "@/lib/tenant-context";
import { getStoreAppearance, generateThemeCssVars } from "@/services/theme.service";
import { THEME_REGISTRY } from "@/lib/themes/definitions";
import type { ThemeId } from "@/types/theme";
import { StoreTenantBridge } from "@/components/store/StoreTenantBridge";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await resolveStoreTenant(slug);

  if (!tenant) {
    return {
      title: "Store Not Found | NEXORA Commerce",
    };
  }

  const appearance = await getStoreAppearance({ businessId: tenant.business.id });
  const title = `${appearance.storeName} ${appearance.storeTagline} | Powered by NEXORA`;

  return {
    title,
    description: `Official storefront for ${appearance.storeName}. Curated collections and bespoke service.`,
    icons: appearance.faviconUrl ? [{ url: appearance.faviconUrl }] : undefined,
  };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { slug } = await params;
  const tenant = await resolveStoreTenant(slug);

  if (!tenant) {
    notFound();
  }

  const { business } = tenant;
  const appearance = await getStoreAppearance({ businessId: business.id });
  const themeDef =
    THEME_REGISTRY[appearance.activeThemeId as ThemeId] ||
    THEME_REGISTRY["editorial-luxury"];

  // Generate inline CSS variables if custom primary/secondary colors are defined
  let customCssVars: string | null = null;
  if (appearance.primaryColor || appearance.secondaryColor) {
    customCssVars = generateThemeCssVars(
      themeDef.palette,
      themeDef.typography,
      themeDef.borders,
      {
        primaryColor: appearance.primaryColor,
        secondaryColor: appearance.secondaryColor,
      }
    );
  }

  return (
    <div data-theme={appearance.activeThemeId} className="w-full">
      {customCssVars && (
        <style dangerouslySetInnerHTML={{ __html: customCssVars }} />
      )}
      <StoreTenantBridge
        business={{
          id: business.id,
          slug: business.slug,
          name: business.name,
          type: business.type,
          defaultCurrency: business.currency,
          contactEmail: business.contactEmail,
        }}
        appearance={appearance}
        basePath={`/store/${business.slug}`}
      />
      {children}
    </div>
  );
}
