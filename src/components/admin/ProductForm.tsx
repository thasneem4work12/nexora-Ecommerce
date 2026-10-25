"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface VariantFormItem {
  id?: string;
  sku: string;
  title: string;
  size: string;
  color: string;
  price: number; // in dollars for user input
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ImageFormItem {
  id?: string;
  url: string;
  alt: string;
  position: number;
}

interface ProductFormProps {
  categories: { id: string; name: string }[];
  initialData?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    categoryId?: string | null;
    basePriceInCents: number;
    featured: boolean;
    published: boolean;
    images: { id?: string; url: string; alt?: string | null; position: number }[];
    variants: {
      id?: string;
      sku: string;
      title: string;
      size?: string | null;
      color?: string | null;
      priceInCents: number;
      stock: number;
      lowStockThreshold: number;
      isActive: boolean;
    }[];
  } | null;
  isEdit?: boolean;
}

export function ProductForm({
  categories,
  initialData,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();

  // Basic attributes
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || categories[0]?.id || ""
  );
  const [basePrice, setBasePrice] = useState<number>(
    initialData ? initialData.basePriceInCents / 100 : 0
  );
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [published, setPublished] = useState(
    initialData ? initialData.published : true
  );

  // Images state
  const [images, setImages] = useState<ImageFormItem[]>(
    initialData?.images?.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt || "",
      position: img.position,
    })) || []
  );
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Variants state
  const [variants, setVariants] = useState<VariantFormItem[]>(
    initialData?.variants?.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      size: v.size || "",
      color: v.color || "",
      price: v.priceInCents / 100,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      isActive: v.isActive,
    })) || [
      {
        sku: "",
        title: "Standard / One Size",
        size: "One Size",
        color: "Natural",
        price: 0,
        stock: 5,
        lowStockThreshold: 2,
        isActive: true,
      },
    ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to upload image.");
        return;
      }

      setImages((prev) => [
        ...prev,
        {
          url: data.url,
          alt: title || "Product photograph",
          position: prev.length,
        },
      ]);
    } catch {
      setErrorMessage("Network error during file upload.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: imageUrlInput.trim(),
        alt: title || "Product photograph",
        position: prev.length,
      },
    ]);
    setImageUrlInput("");
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Variant operations
  const handleAddVariant = () => {
    const autoSkuPrefix = title
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase())
      .join("")
      .slice(0, 4);

    setVariants((prev) => [
      ...prev,
      {
        sku: `NEX-${autoSkuPrefix || "NEW"}-${prev.length + 1}`,
        title: `Variant ${prev.length + 1}`,
        size: "",
        color: "",
        price: basePrice || 0,
        stock: 5,
        lowStockThreshold: 2,
        isActive: true,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, updates: Partial<VariantFormItem>) => {
    setVariants((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, ...updates } : v))
    );
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("At least one variant must exist for each creation.");
      return;
    }
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Validate variants
      if (variants.length === 0) {
        throw new Error("At least one variant is required.");
      }
      for (const v of variants) {
        if (!v.sku.trim()) throw new Error("All variants must possess a valid SKU.");
        if (!v.title.trim()) throw new Error("All variants must possess a title.");
      }

      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        categoryId: categoryId || undefined,
        basePriceInCents: Math.round(basePrice * 100),
        featured,
        published,
        images: images.map((img, idx) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          position: idx,
        })),
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku.trim(),
          title: v.title.trim(),
          size: v.size.trim() || null,
          color: v.color.trim() || null,
          priceInCents: Math.round((v.price > 0 ? v.price : basePrice) * 100),
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
        })),
      };

      const url = isEdit
        ? `/api/admin/products/${initialData?.id}`
        : `/api/admin/products`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save product.");
      }

      setSuccessMessage(
        isEdit
          ? "Creation updated successfully."
          : "New creation registered successfully in atelier database."
      );

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Back button & Title */}
      <div className="flex items-center justify-between border-b border-border-default pb-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-xs uppercase tracking-luxury text-charcoal-500 hover:text-bronze transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Products
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
            {isEdit ? `Edit: ${initialData?.title}` : "Craft New Atelier Creation"}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/admin/products">
            <Button variant="outline" size="sm" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            {isEdit ? "Update Creation" : "Publish Creation"}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center">
          <Check className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: General Attributes */}
      <div className="bg-canvas-surface border border-border-default p-6 space-y-6">
        <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold border-b border-border-subtle pb-3">
          1. General Atelier Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label
              htmlFor="title"
              className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1"
            >
              Creation Title *
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Double-Breasted Cashmere Trench"
              className="w-full bg-canvas-primary border border-border-default px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1"
            >
              SEO Slug (Optional — auto-generated if blank)
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. double-breasted-cashmere-trench"
              className="w-full bg-canvas-primary border border-border-default px-3.5 py-2.5 text-xs text-charcoal-900 font-mono focus:outline-none focus:border-bronze"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="categoryId"
              className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1"
            >
              Category / House Discipline *
            </label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-canvas-primary border border-border-default px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-bronze cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Base Price */}
          <div>
            <label
              htmlFor="basePrice"
              className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1"
            >
              Base Price (USD $) *
            </label>
            <input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-canvas-primary border border-border-default px-3.5 py-2.5 text-xs text-charcoal-900 font-mono focus:outline-none focus:border-bronze"
            />
          </div>

          {/* Featured & Published */}
          <div className="flex items-center space-x-6 pt-5">
            <label className="flex items-center space-x-2 text-xs text-charcoal-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-bronze border-border-default rounded-none"
              />
              <span className="flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-bronze mr-1" /> Featured on Homepage
              </span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-charcoal-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-border-default rounded-none"
              />
              <span>Published (Visible to Storefront)</span>
            </label>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1"
            >
              Atelier Narrative / Description *
            </label>
            <textarea
              id="description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the materials, tailoring heritage, provenance, and finishing..."
              className="w-full bg-canvas-primary border border-border-default p-3 text-xs text-charcoal-900 leading-relaxed focus:outline-none focus:border-bronze"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Visual Gallery Management */}
      <div className="bg-canvas-surface border border-border-default p-6 space-y-6">
        <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold border-b border-border-subtle pb-3">
          2. Imagery & Atelier Photographs
        </h2>

        {/* Existing Images */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative bg-canvas-secondary border border-border-default p-2 space-y-2 group"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-canvas-secondary">
                  <Image
                    src={img.url}
                    alt={img.alt || `Preview ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                  <span className="absolute top-1 left-1 bg-charcoal-900/80 text-canvas-primary text-[10px] px-1.5 py-0.5 font-mono">
                    #{idx + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => {
                    const newAlt = e.target.value;
                    setImages((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, alt: newAlt } : item))
                    );
                  }}
                  placeholder="Alt text / description"
                  className="w-full text-[10px] bg-canvas-primary border border-border-subtle px-1.5 py-1 text-charcoal-700"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="w-full py-1 text-[10px] uppercase text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-charcoal-400">
            No images attached yet. Add at least one photograph for the customer gallery.
          </div>
        )}

        {/* Upload Controls */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-4 items-center">
          {/* File Upload Input */}
          <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-border-default text-xs uppercase tracking-wider text-charcoal-800 bg-canvas-primary hover:border-bronze transition-colors">
            <Upload className="w-4 h-4 mr-2 text-bronze" />
            {isUploading ? "Uploading File..." : "Upload Device File (JPG, PNG, WebP)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>

          <span className="text-xs text-charcoal-400">or</span>

          {/* External URL Input */}
          <div className="flex-1 flex gap-2 w-full sm:w-auto">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Paste external image URL (e.g. Unsplash CDN)..."
              className="flex-1 bg-canvas-primary border border-border-default px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleAddImageUrl}
              disabled={!imageUrlInput.trim()}
            >
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Attach URL
            </Button>
          </div>
        </div>
      </div>

      {/* Section 3: Variants & Inventory */}
      <div className="bg-canvas-surface border border-border-default p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold">
              3. Variants, Sizing & Initial Inventory
            </h2>
            <p className="text-[11px] text-charcoal-500 font-light mt-0.5">
              Each variant must have a unique SKU. Monetary prices and inventory are tracked per variant.
            </p>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={handleAddVariant}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Variant
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-secondary/50 text-charcoal-500 uppercase tracking-wider text-[10px] border-b border-border-subtle">
              <tr>
                <th className="py-2.5 px-3 font-semibold">SKU *</th>
                <th className="py-2.5 px-3 font-semibold">Variant Title *</th>
                <th className="py-2.5 px-3 font-semibold">Size</th>
                <th className="py-2.5 px-3 font-semibold">Color</th>
                <th className="py-2.5 px-3 font-semibold">Price ($)</th>
                <th className="py-2.5 px-3 font-semibold">Stock</th>
                <th className="py-2.5 px-3 font-semibold">Threshold</th>
                <th className="py-2.5 px-3 font-semibold text-center">Active</th>
                <th className="py-2.5 px-3 font-semibold text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {variants.map((v, idx) => (
                <tr key={idx} className="hover:bg-canvas-secondary/20">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { sku: e.target.value.toUpperCase() })
                      }
                      placeholder="NEX-CT-S"
                      className="w-28 bg-canvas-primary border border-border-default px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      value={v.title}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { title: e.target.value })
                      }
                      placeholder="Camel / Small"
                      className="w-36 bg-canvas-primary border border-border-default px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { size: e.target.value })
                      }
                      placeholder="S"
                      className="w-16 bg-canvas-primary border border-border-default px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.color}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { color: e.target.value })
                      }
                      placeholder="Camel"
                      className="w-20 bg-canvas-primary border border-border-default px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.price}
                      onChange={(e) =>
                        handleUpdateVariant(idx, {
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-24 bg-canvas-primary border border-border-default px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      disabled={isEdit && Boolean(v.id)} // Stock edits on existing variants go through stock adjustment
                      value={v.stock}
                      onChange={(e) =>
                        handleUpdateVariant(idx, {
                          stock: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      title={
                        isEdit && Boolean(v.id)
                          ? "Existing variant stock is managed in the Inventory Ledger."
                          : "Initial stock count"
                      }
                      className={`w-16 border px-2 py-1 text-xs font-mono ${
                        isEdit && Boolean(v.id)
                          ? "bg-canvas-secondary text-charcoal-400 cursor-not-allowed border-border-subtle"
                          : "bg-canvas-primary border-border-default"
                      }`}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      value={v.lowStockThreshold}
                      onChange={(e) =>
                        handleUpdateVariant(idx, {
                          lowStockThreshold: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-16 bg-canvas-primary border border-border-default px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-bronze"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-1 text-charcoal-400 hover:text-rose-600 transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex justify-end space-x-4 border-t border-border-default pt-4">
        <Link href="/admin/products">
          <Button variant="outline" size="md" type="button">
            Cancel
          </Button>
        </Link>
        <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
          {isEdit ? "Save Changes" : "Create & Publish Piece"}
        </Button>
      </div>
    </form>
  );
}
