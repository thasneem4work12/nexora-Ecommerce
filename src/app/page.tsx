import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Feather } from "lucide-react";
import { getPublishedProducts } from "@/services/catalog.service";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const { products: featuredProducts } = await getPublishedProducts({
    featuredOnly: true,
    limit: 4,
  });

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Editorial Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-canvas-secondary/50 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=2000"
            alt="NEXORA Autumn Lookbook"
            fill
            priority
            className="object-cover object-top filter brightness-[0.85] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/80 via-charcoal-900/50 to-transparent" />
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="max-w-2xl text-canvas-primary space-y-6">
            <div className="inline-flex items-center space-x-2 text-bronze-light text-xs tracking-[0.3em] uppercase font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autumn / Winter Atelier Edition</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-[1.1] text-canvas-surface">
              The Architecture <br />
              <span className="italic font-light">of Quiet Luxury</span>
            </h1>

            <p className="text-base sm:text-lg text-canvas-secondary/90 font-light leading-relaxed max-w-xl">
              Sculpted tailoring, rare Mongolian combed cashmeres, and hand-welted
              cordwaining. Made for those who appreciate distinction without volume.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link href="/products">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Explore Collection <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/products?category=apparel">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-canvas-primary border-canvas-primary/40 hover:border-canvas-primary hover:text-canvas-primary">
                  The Tailored Coat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* House Curations — Featured Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-border-default pb-6">
          <div>
            <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
              Curated Selection
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif text-charcoal-900 mt-2">
              Signature Creations
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs uppercase tracking-luxury text-charcoal-700 hover:text-bronze transition-colors flex items-center mt-4 md:mt-0 font-medium"
          >
            View Complete Catalog <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Category Showcases */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Three Pillars
          </span>
          <h2 className="text-3xl font-serif text-charcoal-900 mt-2">
            The House Disciplines
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <Link
            href="/products?category=apparel"
            className="group relative h-[480px] overflow-hidden bg-canvas-secondary border border-border-subtle"
          >
            <Image
              src="https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000"
              alt="Tailored Apparel"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8 text-canvas-primary">
              <span className="text-[10px] tracking-luxury uppercase text-bronze-light font-medium">
                Discipline I
              </span>
              <h3 className="text-2xl font-serif text-canvas-surface mt-1 group-hover:text-bronze-light transition-colors">
                Tailored Apparel
              </h3>
              <p className="text-xs text-canvas-secondary/80 mt-2 line-clamp-2">
                Unstructured blazers, double-faced cashmere coats, and sea-island cotton shirts.
              </p>
            </div>
          </Link>

          {/* Pillar 2 */}
          <Link
            href="/products?category=footwear"
            className="group relative h-[480px] overflow-hidden bg-canvas-secondary border border-border-subtle"
          >
            <Image
              src="https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=1000"
              alt="Handcrafted Footwear"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8 text-canvas-primary">
              <span className="text-[10px] tracking-luxury uppercase text-bronze-light font-medium">
                Discipline II
              </span>
              <h3 className="text-2xl font-serif text-canvas-surface mt-1 group-hover:text-bronze-light transition-colors">
                Artisanal Footwear
              </h3>
              <p className="text-xs text-canvas-secondary/80 mt-2 line-clamp-2">
                Goodyear welted wholecuts, hand-painted crust leathers, and sculpted lasts.
              </p>
            </div>
          </Link>

          {/* Pillar 3 */}
          <Link
            href="/products?category=accessories"
            className="group relative h-[480px] overflow-hidden bg-canvas-secondary border border-border-subtle"
          >
            <Image
              src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000"
              alt="Fine Leather Goods"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8 text-canvas-primary">
              <span className="text-[10px] tracking-luxury uppercase text-bronze-light font-medium">
                Discipline III
              </span>
              <h3 className="text-2xl font-serif text-canvas-surface mt-1 group-hover:text-bronze-light transition-colors">
                Fine Leather Goods
              </h3>
              <p className="text-xs text-canvas-secondary/80 mt-2 line-clamp-2">
                Bridle leather briefcases, hand-rolled silk foulards, and brass accoutrements.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Brand Narrative / Manifesto */}
      <section className="bg-canvas-secondary py-24 border-y border-border-default">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <Feather className="w-8 h-8 mx-auto text-bronze" />
          <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
            Our Philosophy
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif text-charcoal-900 leading-snug">
            “True distinction is never shouted; <br className="hidden sm:inline" />
            it is revealed in the stitch.”
          </h2>
          <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-2xl mx-auto font-light">
            Every NEXORA piece is produced in limited micro-batches in heritage
            workshops across Italy, the UK, and Japan. We reject fast trends in
            favor of enduring silhouettes and materials that develop exceptional patina over decades.
          </p>
          <div className="pt-4">
            <Link href="/products">
              <Button variant="charcoal" size="md">
                Experience the Craft
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
