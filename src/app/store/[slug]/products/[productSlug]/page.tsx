import { notFound } from "next/navigation";
import { resolveStoreTenant } from "@/lib/tenant-context";
import { getProductBySlug, getRelatedProducts } from "@/services/catalog.service";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import type { Metadata } from "next";

interface StoreProductPageProps {
  params: Promise<{
    slug: string;
    productSlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreProductPageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const tenant = await resolveStoreTenant(slug);
  if (!tenant) {
    return { title: "Store Not Found" };
  }

  const product = await getProductBySlug(productSlug, tenant.business.id);
  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: `${product.title} | ${tenant.business.name}`,
    description: product.description,
    openGraph: {
      title: `${product.title} | ${tenant.business.name}`,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function StoreProductDetailPage({ params }: StoreProductPageProps) {
  const { slug, productSlug } = await params;
  const tenant = await resolveStoreTenant(slug);

  if (!tenant) {
    notFound();
  }

  const product = await getProductBySlug(productSlug, tenant.business.id);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    3,
    tenant.business.id
  );

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}
