import React from "react";
import { getAdminCategories } from "@/services/admin-catalog.service";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await getAdminCategories();

  return (
    <div className="space-y-6">
      <ProductForm categories={categories} />
    </div>
  );
}
