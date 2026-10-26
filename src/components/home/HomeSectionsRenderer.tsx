"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  Feather,
  Truck,
  ShieldCheck,
  RefreshCw,
  Award,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { HomepageSection, ThemeId } from "@/types/theme";
import type { ProductItem } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

interface HomeSectionsRendererProps {
  sections: HomepageSection[];
  featuredProducts: ProductItem[];
  themeId: ThemeId;
}

export function HomeSectionsRenderer({
  sections,
  featuredProducts,
  themeId,
}: HomeSectionsRendererProps) {
  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {sections
        .filter((section) => section.enabled)
        .map((section) => {
          switch (section.type) {
            case "hero":
              return (
                <HeroSection
                  key={section.id}
                  config={section}
                  themeId={themeId}
                />
              );
            case "featured_products":
              return (
                <FeaturedProductsSection
                  key={section.id}
                  config={section}
                  products={featuredProducts}
                />
              );
            case "categories":
              return (
                <CategoriesSection
                  key={section.id}
                  config={section}
                />
              );
            case "promotional_banner":
              return (
                <PromotionalBannerSection
                  key={section.id}
                  config={section}
                />
              );
            case "brand_story":
              return (
                <BrandStorySection
                  key={section.id}
                  config={section}
                />
              );
            case "image_text":
              return (
                <ImageTextSection
                  key={section.id}
                  config={section}
                />
              );
            case "newsletter":
              return (
                <NewsletterSection
                  key={section.id}
                  config={section}
                />
              );
            case "benefits":
              return (
                <BenefitsSection
                  key={section.id}
                  config={section}
                />
              );
            default:
              return null;
          }
        })}
    </div>
  );
}

// 1. Hero Section
function HeroSection({
  config,
  themeId,
}: {
  config: Extract<HomepageSection, { type: "hero" }>;
  themeId: ThemeId;
}) {
  const isDarkNoir = themeId === "midnight-noir";
  const isModernMinimal = themeId === "modern-minimal";
  const isOrangeEnergy = themeId === "orange-energy";

  if (isOrangeEnergy) {
    return (
      <section className="relative min-h-[75vh] flex items-center bg-black text-white px-4 sm:px-6 lg:px-8 border-b-4 border-bronze overflow-hidden">
        <div className="absolute inset-0 opacity-40 z-0">
          <Image
            src={config.imageUrl}
            alt={config.imageAlt || config.headline}
            fill
            priority
            className="object-cover grayscale contrast-150"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full py-16">
          <div className="inline-block bg-bronze text-white text-xs font-black uppercase tracking-widest px-3 py-1 mb-6">
            {config.badgeText || "NEW DROP // 2026"}
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-none mb-6">
            {config.headline}
          </h1>
          <p className="text-lg sm:text-2xl text-gray-300 font-bold max-w-2xl mb-8 uppercase tracking-wide">
            {config.subheadline}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href={config.primaryCtaLink || "/products"}>
              <Button
                variant="primary"
                size="lg"
                className="bg-bronze hover:bg-bronze-dark text-white font-black text-sm uppercase tracking-widest px-8 py-4"
              >
                {config.primaryCtaText} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            {config.secondaryCtaText && (
              <Link href={config.secondaryCtaLink || "/products"}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-black font-black text-sm uppercase tracking-widest px-8 py-4"
                >
                  {config.secondaryCtaText}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (isModernMinimal) {
    return (
      <section className="relative bg-canvas-secondary py-16 sm:py-24 border-b border-border-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {config.badgeText && (
              <span className="text-xs font-medium uppercase tracking-wider text-charcoal-500 bg-canvas-surface border border-border-subtle px-3 py-1 rounded-full inline-block">
                {config.badgeText}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-semibold tracking-tight text-charcoal-900 leading-tight">
              {config.headline}
            </h1>
            <p className="text-base sm:text-lg text-charcoal-700 leading-relaxed max-w-lg">
              {config.subheadline}
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link href={config.primaryCtaLink || "/products"}>
                <Button variant="primary" size="lg" className="rounded-btn shadow-none">
                  {config.primaryCtaText} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              {config.secondaryCtaText && (
                <Link href={config.secondaryCtaLink || "/products"}>
                  <Button variant="secondary" size="lg" className="rounded-btn shadow-none">
                    {config.secondaryCtaText}
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-card overflow-hidden shadow-sm">
            <Image
              src={config.imageUrl}
              alt={config.imageAlt || config.headline}
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  // Editorial Luxury & Midnight Noir
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center bg-canvas-secondary/50 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src={config.imageUrl}
          alt={config.imageAlt || config.headline}
          fill
          priority
          className="object-cover object-top filter brightness-[0.80] contrast-[1.05]"
        />
        <div
          className={`absolute inset-0 ${
            isDarkNoir
              ? "bg-gradient-to-r from-black/90 via-black/60 to-black/30"
              : "bg-gradient-to-r from-charcoal-900/80 via-charcoal-900/50 to-transparent"
          }`}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="max-w-2xl text-canvas-primary space-y-6">
          <div className="inline-flex items-center space-x-2 text-bronze-light text-xs tracking-[0.3em] uppercase font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{config.badgeText || "Atelier Lookbook Edition"}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-[1.1] text-canvas-surface">
            {config.headline}
          </h1>

          <p className="text-base sm:text-lg text-canvas-secondary/90 font-light leading-relaxed max-w-xl">
            {config.subheadline}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Link href={config.primaryCtaLink || "/products"}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                {config.primaryCtaText} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            {config.secondaryCtaText && (
              <Link href={config.secondaryCtaLink || "/products"}>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-canvas-primary border-canvas-primary/40 hover:border-canvas-primary hover:text-canvas-primary"
                >
                  {config.secondaryCtaText}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// 2. Featured Products Section
function FeaturedProductsSection({
  config,
  products,
}: {
  config: Extract<HomepageSection, { type: "featured_products" }>;
  products: ProductItem[];
}) {
  const displayProducts = products.slice(0, config.maxProducts || 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-border-default pb-6">
        <div>
          {config.subtitle && (
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              {config.subtitle}
            </span>
          )}
          <h2 className="text-2xl sm:text-4xl font-serif text-charcoal-900 mt-2">
            {config.title}
          </h2>
        </div>
        <Link
          href="/products"
          className="text-xs uppercase tracking-luxury text-charcoal-700 hover:text-bronze transition-colors flex items-center mt-4 md:mt-0 font-medium"
        >
          {config.viewAllText || "View Complete Catalog"} <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {displayProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// 3. Category Pillars Section
function CategoriesSection({
  config,
}: {
  config: Extract<HomepageSection, { type: "categories" }>;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-xl mx-auto mb-14">
        {config.subtitle && (
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            {config.subtitle}
          </span>
        )}
        <h2 className="text-3xl sm:text-4xl font-serif text-charcoal-900 mt-2">
          {config.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {config.items.map((cat: { slug: string; title: string; disciplineLabel?: string; description: string; imageUrl: string }, idx: number) => (
          <Link
            key={cat.slug || idx}
            href={`/products?category=${cat.slug}`}
            className="group relative h-[460px] overflow-hidden bg-canvas-secondary rounded-card border border-border-subtle"
          >
            <Image
              src={cat.imageUrl}
              alt={cat.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8 text-canvas-primary">
              <span className="text-[10px] tracking-luxury uppercase text-bronze-light font-medium">
                {cat.disciplineLabel || `Pillar 0${idx + 1}`}
              </span>
              <h3 className="text-2xl font-serif text-canvas-surface mt-1 group-hover:text-bronze-light transition-colors">
                {cat.title}
              </h3>
              {cat.description && (
                <p className="text-xs text-canvas-secondary/80 mt-2 line-clamp-2">
                  {cat.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// 4. Promotional Banner Section
function PromotionalBannerSection({
  config,
}: {
  config: Extract<HomepageSection, { type: "promotional_banner" }>;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden bg-canvas-surface rounded-card border border-border-default p-8 sm:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl space-y-3 text-center md:text-left">
          {config.badge && (
            <span className="inline-block bg-bronze/10 text-bronze text-xs font-semibold uppercase tracking-luxury px-3 py-1 rounded-badge">
              {config.badge}
            </span>
          )}
          <h3 className="text-2xl sm:text-4xl font-serif text-charcoal-900">
            {config.headline}
          </h3>
          <p className="text-sm text-charcoal-700 leading-relaxed">
            {config.description}
          </p>
        </div>
        <div>
          <Link href={config.buttonLink || "/products"}>
            <Button variant="primary" size="lg" className="rounded-btn shadow-md whitespace-nowrap">
              {config.buttonText || "Discover More"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// 5. Brand Story / Manifesto Section
function BrandStorySection({
  config,
}: {
  config: Extract<HomepageSection, { type: "brand_story" }>;
}) {
  return (
    <section className="bg-canvas-secondary py-20 sm:py-28 border-y border-border-default">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <Feather className="w-8 h-8 mx-auto text-bronze" />
        {config.badge && (
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            {config.badge}
          </span>
        )}
        <h2 className="text-3xl sm:text-5xl font-serif text-charcoal-900 leading-snug">
          “{config.quote}”
        </h2>
        <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-2xl mx-auto font-light">
          {config.narrative}
        </p>
        {config.buttonText && config.buttonLink && (
          <div className="pt-4">
            <Link href={config.buttonLink}>
              <Button variant="charcoal" size="md">
                {config.buttonText}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// 6. Image & Text Section
function ImageTextSection({
  config,
}: {
  config: Extract<HomepageSection, { type: "image_text" }>;
}) {
  const isImageRight = config.imagePosition === "right";

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center ${
          isImageRight ? "lg:grid-flow-dense" : ""
        }`}
      >
        <div className={isImageRight ? "lg:col-start-2" : ""}>
          <div className="relative aspect-[4/3] rounded-card overflow-hidden bg-canvas-secondary border border-border-subtle shadow-sm">
            <Image
              src={config.imageUrl}
              alt={config.title}
              fill
              className="object-cover"
            />
          </div>
        </div>
        <div className={`space-y-6 ${isImageRight ? "lg:col-start-1" : ""}`}>
          {config.badge && (
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              {config.badge}
            </span>
          )}
          <h3 className="text-3xl sm:text-4xl font-serif text-charcoal-900">
            {config.title}
          </h3>
          <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed font-light">
            {config.description}
          </p>
          {config.buttonText && config.buttonLink && (
            <div className="pt-2">
              <Link href={config.buttonLink}>
                <Button variant="outline" size="md">
                  {config.buttonText} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// 7. Newsletter Section
function NewsletterSection({
  config,
}: {
  config: Extract<HomepageSection, { type: "newsletter" }>;
}) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="bg-canvas-surface rounded-card border border-border-default p-8 sm:p-12 text-center space-y-6 shadow-sm">
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          Dispatch & Private Salon
        </span>
        <h3 className="text-2xl sm:text-4xl font-serif text-charcoal-900">
          {config.title}
        </h3>
        <p className="text-sm text-charcoal-700 max-w-lg mx-auto">
          {config.description}
        </p>

        {subscribed ? (
          <div className="inline-flex items-center space-x-2 text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-card text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Thank you for subscribing. You will receive private previews.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={config.placeholder || "Enter your email address..."}
              required
              className="flex-1 px-4 py-3 bg-canvas-primary border border-border-default text-xs tracking-wider text-charcoal-900 focus:outline-none focus:border-bronze rounded-btn"
            />
            <Button type="submit" variant="primary" size="md" className="rounded-btn whitespace-nowrap">
              {config.buttonText || "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

// 8. Benefits Section
function BenefitsSection({
  config,
}: {
  config: Extract<HomepageSection, { type: "benefits" }>;
}) {
  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case "truck":
        return <Truck className="w-5 h-5" />;
      case "shield":
        return <ShieldCheck className="w-5 h-5" />;
      case "refresh":
        return <RefreshCw className="w-5 h-5" />;
      case "award":
        return <Award className="w-5 h-5" />;
      case "clock":
        return <Clock className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
        {config.items.map((item: { icon: string; title: string; description: string }, idx: number) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 p-6 bg-canvas-surface rounded-card border border-border-subtle"
          >
            <div className="p-3 bg-canvas-secondary border border-border-default text-bronze rounded-card shrink-0">
              {getIcon(item.icon)}
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-luxury text-charcoal-900 font-semibold">
                {item.title}
              </h4>
              <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
