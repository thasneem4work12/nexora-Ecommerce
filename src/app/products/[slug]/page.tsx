import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/services/catalog.service";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Creation Not Found | NEXORA Haute Couture",
    };
  }

  return {
    title: `${product.title} | NEXORA Haute Couture`,
    description: product.description,
    openGraph: {
      title: `${product.title} | NEXORA Haute Couture`,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    3
  );

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}
