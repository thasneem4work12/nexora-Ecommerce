"use client";

import React, { useState } from "react";
import {
  Palette,
  Layout,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type {
  StoreAppearanceConfig,
  ThemeDefinition,
  ThemeId,
  HomepageSectionConfig,
} from "@/types/theme";
import type { Role } from "@prisma/client";

interface AppearanceStudioClientProps {
  published: StoreAppearanceConfig;
  initialDraft: Record<string, unknown> | null;
  themes: ThemeDefinition[];
  userRole: Role;
}

export function AppearanceStudioClient({
  published,
  initialDraft,
  themes,
  userRole,
}: AppearanceStudioClientProps) {
  const canManage = userRole === "OWNER" || userRole === "SUPERADMIN";

  // Working state
  const [activeTab, setActiveTab] = useState<"themes" | "branding" | "homepage" | "preview">("themes");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  // Form states
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(
    (initialDraft?.activeThemeId as ThemeId) || published.activeThemeId
  );
  const [storeName, setStoreName] = useState<string>(
    (initialDraft?.storeName as string) ?? published.storeName
  );
  const [storeTagline, setStoreTagline] = useState<string>(
    (initialDraft?.storeTagline as string) ?? published.storeTagline
  );
  const [logoUrl, setLogoUrl] = useState<string>(
    (initialDraft?.logoUrl as string) ?? published.logoUrl ?? ""
  );
  const [faviconUrl, setFaviconUrl] = useState<string>(
    (initialDraft?.faviconUrl as string) ?? published.faviconUrl ?? ""
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    (initialDraft?.primaryColor as string) ?? published.primaryColor ?? ""
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    (initialDraft?.secondaryColor as string) ?? published.secondaryColor ?? ""
  );
  const [contactEmail, setContactEmail] = useState<string>(
    (initialDraft?.contactEmail as string) ?? published.contactEmail ?? ""
  );
  const [contactPhone, setContactPhone] = useState<string>(
    (initialDraft?.contactPhone as string) ?? published.contactPhone ?? ""
  );
  const [announcementEnabled, setAnnouncementEnabled] = useState<boolean>(
    (initialDraft?.announcementEnabled as boolean) ?? published.announcementEnabled
  );
  const [announcementText, setAnnouncementText] = useState<string>(
    (initialDraft?.announcementText as string) ?? published.announcementText ?? ""
  );
  const [announcementLink, setAnnouncementLink] = useState<string>(
    (initialDraft?.announcementLink as string) ?? published.announcementLink ?? ""
  );
  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(
    (initialDraft?.homepageSections as HomepageSectionConfig[]) ?? published.homepageSections
  );

  const [hasDraft, setHasDraft] = useState<boolean>(Boolean(initialDraft));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Helper to show message
  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Switch Theme in Draft
  const handleSelectTheme = (themeId: ThemeId) => {
    setActiveThemeId(themeId);
    const selectedDef = themes.find((t) => t.id === themeId);
    if (selectedDef) {
      setHomepageSections(selectedDef.defaultSections);
      setAnnouncementText(selectedDef.header.announcementText || "");
      setAnnouncementEnabled(selectedDef.header.showAnnouncement);
      setAnnouncementLink(selectedDef.header.announcementLink || "");
    }
    showFeedback("success", `Selected ${themes.find((t) => t.id === themeId)?.name}. Save draft or publish to apply.`);
  };

  // Section Ordering
  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...homepageSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setHomepageSections(newSections);
  };

  const toggleSectionEnabled = (index: number) => {
    const newSections = [...homepageSections];
    newSections[index] = {
      ...newSections[index],
      enabled: !newSections[index].enabled,
    };
    setHomepageSections(newSections);
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    if (!canManage) {
      showFeedback("error", "Unauthorized: Only OWNER and SUPERADMIN can modify appearance.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = {
        activeThemeId,
        storeName: storeName.trim(),
        storeTagline: storeTagline.trim(),
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        announcementEnabled,
        announcementText: announcementText.trim() || null,
        announcementLink: announcementLink.trim() || null,
        homepageSections,
      };

      const res = await fetch("/api/admin/appearance/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");

      setHasDraft(true);
      setPreviewKey((k) => k + 1);
      showFeedback("success", "Draft saved. Changes are ready for preview and not yet visible to public visitors.");
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("error", e.message || "Error saving appearance draft");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Action
  const handlePublish = async () => {
    if (!canManage) {
      showFeedback("error", "Unauthorized: Only OWNER and SUPERADMIN can publish appearance changes.");
      return;
    }
    if (!confirm("Are you sure you want to publish these appearance changes to the live storefront?")) {
      return;
    }

    setIsPublishing(true);
    setFeedback(null);
    try {
      // First save current form to draft to ensure latest inputs are published
      const payload = {
        activeThemeId,
        storeName: storeName.trim(),
        storeTagline: storeTagline.trim(),
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        announcementEnabled,
        announcementText: announcementText.trim() || null,
        announcementLink: announcementLink.trim() || null,
        homepageSections,
      };

      await fetch("/api/admin/appearance/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await fetch("/api/admin/appearance/publish", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish appearance");

      setHasDraft(false);
      setPreviewKey((k) => k + 1);
      showFeedback("success", "Theme and branding successfully published to the live storefront!");
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("error", e.message || "Error publishing appearance");
    } finally {
      setIsPublishing(false);
    }
  };

  // Discard Draft Action
  const handleDiscard = async () => {
    if (!canManage) {
      showFeedback("error", "Unauthorized: Only OWNER can discard appearance drafts.");
      return;
    }
    if (!confirm("Discard all unpublished draft changes and revert to published appearance?")) {
      return;
    }

    setIsDiscarding(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/appearance/discard", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to discard draft");

      // Reset local state to published
      setActiveThemeId(published.activeThemeId);
      setStoreName(published.storeName);
      setStoreTagline(published.storeTagline);
      setLogoUrl(published.logoUrl ?? "");
      setFaviconUrl(published.faviconUrl ?? "");
      setPrimaryColor(published.primaryColor ?? "");
      setSecondaryColor(published.secondaryColor ?? "");
      setContactEmail(published.contactEmail ?? "");
      setContactPhone(published.contactPhone ?? "");
      setAnnouncementEnabled(published.announcementEnabled);
      setAnnouncementText(published.announcementText ?? "");
      setAnnouncementLink(published.announcementLink ?? "");
      setHomepageSections(published.homepageSections);
      setHasDraft(false);
      setPreviewKey((k) => k + 1);
      showFeedback("success", "Unpublished draft discarded. Current published storefront restored.");
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("error", e.message || "Error discarding draft");
    } finally {
      setIsDiscarding(false);
    }
  };

  // Restore Default Theme
  const handleRestoreDefault = async () => {
    if (!canManage) {
      showFeedback("error", "Unauthorized: Only OWNER can reset store theme.");
      return;
    }
    if (!confirm("Restore safe default Editorial Luxury settings? This will overwrite existing published settings.")) {
      return;
    }

    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/appearance/reset", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore default theme");

      const defaultDef = themes.find((t) => t.id === "editorial-luxury");
      if (defaultDef) {
        setActiveThemeId("editorial-luxury");
        setStoreName("NEXORA");
        setStoreTagline("Haute Couture");
        setLogoUrl("");
        setFaviconUrl("");
        setPrimaryColor("");
        setSecondaryColor("");
        setContactEmail("concierge@nexoracommerce.com");
        setContactPhone("+1 (800) 456-7890");
        setAnnouncementEnabled(defaultDef.header.showAnnouncement);
        setAnnouncementText(defaultDef.header.announcementText || "");
        setAnnouncementLink(defaultDef.header.announcementLink || "");
        setHomepageSections(defaultDef.defaultSections);
      }
      setHasDraft(false);
      setPreviewKey((k) => k + 1);
      showFeedback("success", "Store appearance successfully restored to Editorial Luxury defaults.");
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("error", e.message || "Error resetting appearance");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              Maison Customization Engine
            </span>
            {hasDraft && (
              <Badge variant="warning">
                Unpublished Draft Active
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
            Storefront Theme & Branding Studio
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 font-light">
            Switch business aesthetics, fine-tune luxury brand tokens, and reorder homepage sections with preview isolation.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {hasDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={isDiscarding || !canManage}
              className="text-xs text-rose-700 border-rose-200 hover:border-rose-400"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Discard Draft
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving || !canManage}
            className="text-xs"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || !canManage}
            className="text-xs shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {isPublishing ? "Publishing..." : "Publish to Storefront"}
          </Button>
        </div>
      </div>

      {/* Role Alert for Staff / Manager */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-card flex items-start space-x-3 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Read-Only Mode:</span> Your role (
            <strong>{userRole}</strong>) permits viewing theme presets and previewing styles. Modifying or publishing live storefront branding requires <strong>OWNER</strong> or <strong>SUPERADMIN</strong> privileges.
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-card text-xs flex items-center space-x-2 border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-default space-x-1 sm:space-x-4">
        {[
          { id: "themes", label: "Theme Presets (4)", icon: Palette },
          { id: "branding", label: "Branding & Palette", icon: Sliders },
          { id: "homepage", label: "Homepage Sections", icon: Layout },
          { id: "preview", label: "Live Responsive Preview", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "themes" | "branding" | "homepage" | "preview")}
              className={`flex items-center space-x-2 py-3 px-3 sm:px-4 text-xs uppercase tracking-luxury font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-bronze text-bronze"
                  : "border-transparent text-charcoal-500 hover:text-charcoal-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: THEMES SELECTION */}
      {activeTab === "themes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif text-charcoal-900">
                Pre-Engineered Luxury Themes
              </h2>
              <p className="text-xs text-charcoal-500">
                Four bespoke design systems tailored for heritage ateliers, nocturnal jewelers, minimalist galleries, and dynamic streetwear houses.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestoreDefault}
              disabled={isResetting || !canManage}
              className="text-xs text-charcoal-500 hover:text-charcoal-900"
            >
              Restore Safe Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {themes.map((theme) => {
              const isLive = published.activeThemeId === theme.id;
              const isSelected = activeThemeId === theme.id;

              return (
                <div
                  key={theme.id}
                  data-testid={`theme-card-${theme.id}`}
                  className={`bg-canvas-surface rounded-card border transition-all p-6 flex flex-col justify-between space-y-5 ${
                    isSelected
                      ? "border-bronze shadow-md ring-1 ring-bronze/40"
                      : "border-border-default hover:border-border-strong"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-serif text-charcoal-900">
                            {theme.name}
                          </h3>
                          {isLive && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                              Live
                            </span>
                          )}
                          {isSelected && !isLive && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                              Draft Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-charcoal-500 italic mt-0.5">
                          {theme.tagline}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-charcoal-700 leading-relaxed font-light">
                      {theme.description}
                    </p>

                    {/* Color Swatches */}
                    <div>
                      <span className="text-[10px] uppercase tracking-luxury text-charcoal-500 block mb-1.5 font-medium">
                        Core Palette
                      </span>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-7 h-7 rounded border border-border-default shadow-xs flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: theme.palette.canvasPrimary, color: theme.palette.textPrimary }}
                          title={`Canvas: ${theme.palette.canvasPrimary}`}
                        >
                          Bg
                        </div>
                        <div
                          className="w-7 h-7 rounded border border-border-default shadow-xs flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: theme.palette.canvasSurface, color: theme.palette.textPrimary }}
                          title={`Surface: ${theme.palette.canvasSurface}`}
                        >
                          Sf
                        </div>
                        <div
                          className="w-7 h-7 rounded border border-border-default shadow-xs flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: theme.palette.accentPrimary }}
                          title={`Accent: ${theme.palette.accentPrimary}`}
                        >
                          Ac
                        </div>
                        <div
                          className="w-7 h-7 rounded border border-border-default shadow-xs flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: theme.palette.textPrimary, color: theme.palette.canvasPrimary }}
                          title={`Text: ${theme.palette.textPrimary}`}
                        >
                          Tx
                        </div>
                        <span className="text-[11px] text-charcoal-500 font-mono ml-2">
                          {theme.palette.accentPrimary}
                        </span>
                      </div>
                    </div>

                    {/* Design Specs */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-charcoal-500">
                      <span className="bg-canvas-secondary px-2 py-0.5 rounded border border-border-subtle">
                        Font: {theme.typography.headingFont}
                      </span>
                      <span className="bg-canvas-secondary px-2 py-0.5 rounded border border-border-subtle">
                        Radius: {theme.borders.cardRadius}
                      </span>
                      <span className="bg-canvas-secondary px-2 py-0.5 rounded border border-border-subtle">
                        Card: {theme.productCard.style}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                    <Button
                      variant={isSelected ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handleSelectTheme(theme.id)}
                      disabled={!canManage}
                      className="text-xs"
                    >
                      {isSelected ? "Selected in Studio" : "Select Theme for Draft"}
                    </Button>

                    <button
                      onClick={() => {
                        setActiveThemeId(theme.id);
                        setActiveTab("preview");
                      }}
                      className="text-xs text-charcoal-700 hover:text-bronze flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview in Studio</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING & PALETTE OVERRIDES */}
      {activeTab === "branding" && (
        <div className="bg-canvas-surface rounded-card border border-border-default p-6 sm:p-8 space-y-8">
          <div>
            <h2 className="text-lg font-serif text-charcoal-900">
              Identity & Accent Overrides
            </h2>
            <p className="text-xs text-charcoal-500">
              Customize Maison identity tokens, logo assets, and safe hex color overrides.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. NEXORA"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Store Tagline
              </label>
              <input
                type="text"
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
                placeholder="e.g. Haute Couture"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Logo URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... or /logo.png"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
              <p className="text-[11px] text-charcoal-500">
                Leave blank to display the typographic serif store name.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Favicon URL
              </label>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://... or /favicon.ico"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Primary Accent Color Override
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor || "#966A38"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 p-0.5 border border-border-default rounded-btn cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="Default (Theme Accent)"
                  className="flex-1 px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze font-mono"
                />
              </div>
              <p className="text-[11px] text-charcoal-500">
                Must be valid hex (#RRGGBB). Overrides primary buttons, links, and highlights.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Secondary Accent Color Override
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={secondaryColor || "#B58A54"}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-9 h-9 p-0.5 border border-border-default rounded-btn cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="Default (Theme Accent Light)"
                  className="flex-1 px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Concierge Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="concierge@nexoracommerce.com"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-luxury text-charcoal-700 block">
                Concierge Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (800) 456-7890"
                className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
              />
            </div>
          </div>

          {/* Announcement Bar Settings */}
          <div className="pt-6 border-t border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif text-charcoal-900">
                  Top Announcement Bar
                </h3>
                <p className="text-xs text-charcoal-500">
                  Global banner for complimentary shipping thresholds or seasonal collections.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bronze"></div>
              </label>
            </div>

            {announcementEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-luxury text-charcoal-700 block">
                    Announcement Text
                  </label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Complimentary Worldwide Delivery on Orders Over $150"
                    className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-luxury text-charcoal-700 block">
                    Announcement Target Link
                  </label>
                  <input
                    type="text"
                    value={announcementLink}
                    onChange={(e) => setAnnouncementLink(e.target.value)}
                    placeholder="/products"
                    className="w-full px-3 py-2 text-xs bg-canvas-primary border border-border-default rounded-btn focus:outline-none focus:border-bronze"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HOMEPAGE SECTIONS */}
      {activeTab === "homepage" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-serif text-charcoal-900">
              Homepage Layout & Section Ordering
            </h2>
            <p className="text-xs text-charcoal-500">
              Rearrange section sequence, toggle visibility, and update promotional copy.
            </p>
          </div>

          <div className="space-y-3">
            {homepageSections.map((section, idx) => (
              <div
                key={section.id || idx}
                className={`bg-canvas-surface rounded-card border transition-all p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  section.enabled ? "border-border-default" : "border-border-subtle opacity-60"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => moveSection(idx, "up")}
                      disabled={idx === 0 || !canManage}
                      className="p-1 hover:bg-canvas-secondary rounded text-charcoal-500 hover:text-charcoal-900 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(idx, "down")}
                      disabled={idx === homepageSections.length - 1 || !canManage}
                      className="p-1 hover:bg-canvas-secondary rounded text-charcoal-500 hover:text-charcoal-900 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-serif font-bold text-charcoal-900 uppercase">
                        {section.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-charcoal-400 font-mono">
                        (Seq {idx + 1})
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {"headline" in section
                        ? section.headline
                        : "title" in section
                        ? section.title
                        : `Section type: ${section.type}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={() => toggleSectionEnabled(idx)}
                      disabled={!canManage}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-charcoal-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bronze"></div>
                  </label>
                  <span className="text-xs text-charcoal-700 font-medium w-16">
                    {section.enabled ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LIVE RESPONSIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-surface p-4 rounded-card border border-border-default">
            <div className="flex items-center space-x-3">
              <span className="text-xs uppercase tracking-luxury text-charcoal-700 font-semibold">
                Viewport:
              </span>
              <div className="flex space-x-1 border border-border-default rounded p-0.5">
                <button
                  onClick={() => setPreviewViewport("desktop")}
                  className={`p-1.5 rounded text-xs flex items-center space-x-1 ${
                    previewViewport === "desktop" ? "bg-charcoal-900 text-white" : "text-charcoal-500 hover:text-charcoal-900"
                  }`}
                  title="Desktop (100%)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewViewport("tablet")}
                  className={`p-1.5 rounded text-xs flex items-center space-x-1 ${
                    previewViewport === "tablet" ? "bg-charcoal-900 text-white" : "text-charcoal-500 hover:text-charcoal-900"
                  }`}
                  title="Tablet (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewViewport("mobile")}
                  className={`p-1.5 rounded text-xs flex items-center space-x-1 ${
                    previewViewport === "mobile" ? "bg-charcoal-900 text-white" : "text-charcoal-500 hover:text-charcoal-900"
                  }`}
                  title="Mobile (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Reload Frame
              </Button>

              <a
                href={`/?previewTheme=${activeThemeId}&previewDraft=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-charcoal-700 hover:text-bronze flex items-center space-x-1 font-medium"
              >
                <span>Open in Full Window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Embedded IFrame container */}
          <div className="bg-charcoal-950 p-4 sm:p-8 rounded-card flex justify-center overflow-x-auto min-h-[700px] shadow-inner">
            <div
              className={`transition-all duration-300 bg-white rounded shadow-2xl overflow-hidden ${
                previewViewport === "desktop"
                  ? "w-full h-[760px]"
                  : previewViewport === "tablet"
                  ? "w-[768px] h-[760px]"
                  : "w-[375px] h-[700px]"
              }`}
            >
              <iframe
                key={previewKey}
                src={`/?previewTheme=${activeThemeId}&previewDraft=true`}
                title="Storefront Live Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
