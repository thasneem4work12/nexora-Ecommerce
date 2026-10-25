import React from "react";
import { notFound } from "next/navigation";
import {
  getAdminProductById,
  getAdminCategories,
} from "@/services/admin-catalog.service";
import { ProductForm } from "@/components/admin/ProductForm";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProductForm
        categories={categories}
        initialData={product}
        isEdit={true}
      />
    </div>
  );
}
