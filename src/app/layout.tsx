import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getStoreAppearance, generateThemeCssVars } from "@/services/theme.service";
import { THEME_REGISTRY } from "@/lib/themes/definitions";
import type { ThemeId } from "@/types/theme";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const previewTheme = cookieStore.get("nexora_theme_preview")?.value;
  const appearance = await getStoreAppearance({ previewThemeId: previewTheme });

  const title = `${appearance.storeName} ${appearance.storeTagline} | Bespoke International Luxury`;
  const description =
    "Discover uncompromised material integrity and quiet luxury across tailored apparel, hand-welted footwear, and artisanal leather goods.";

  return {
    title,
    description,
    icons: appearance.faviconUrl ? [{ url: appearance.faviconUrl }] : undefined,
  };
}

import { StoreTenantProvider } from "@/context/StoreTenantContext";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const previewTheme = cookieStore.get("nexora_theme_preview")?.value;
  const appearance = await getStoreAppearance({ previewThemeId: previewTheme });

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
    <html lang="en" data-theme={appearance.activeThemeId}>
      {customCssVars && (
        <head>
          <style dangerouslySetInnerHTML={{ __html: customCssVars }} />
        </head>
      )}
      <body className="flex flex-col min-h-screen bg-canvas-primary text-charcoal-900 selection:bg-bronze/20 selection:text-bronze-dark">
        <StoreTenantProvider
          initialBusiness={{
            id: "default-store",
            slug: "nexora",
            name: appearance.storeName,
          }}
          initialAppearance={appearance}
          initialBasePath=""
        >
          <CartProvider>
            <Header appearance={appearance} />
            <main className="flex-1">{children}</main>
            <Footer appearance={appearance} />
            <CartDrawer />
          </CartProvider>
        </StoreTenantProvider>
      </body>
    </html>
  );
}
