import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, AuthError } from "@/lib/admin-auth";
import { getStoreAppearance } from "@/services/theme.service";
import { THEME_REGISTRY } from "@/lib/themes/definitions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAdminApi(req, "VIEW_APPEARANCE");

    const published = await getStoreAppearance({ businessId, previewDraft: false });
    const configRecord = await prisma.storeThemeConfig.findUnique({
      where: { businessId },
    });

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

    return NextResponse.json({
      success: true,
      published,
      draft: (configRecord?.draftConfig as Record<string, unknown>) || null,
      activeThemeId: published.activeThemeId,
      themes: themesList,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("GET /api/admin/appearance error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching appearance settings" },
      { status: 500 }
    );
  }
}
