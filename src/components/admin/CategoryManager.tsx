"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Edit2, Trash2, X, AlertCircle, Check, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

interface CategoryManagerProps {
  initialCategories: CategoryData[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: CategoryData) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setImageUrl(cat.imageUrl || "");
    setErrorMessage(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : `/api/admin/categories`;
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save category.");
      }

      setSuccessMessage("Category saved successfully.");
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryData) => {
    if (cat.productCount > 0) {
      alert(
        `Cannot delete "${cat.name}": ${cat.productCount} active creations are currently associated with this category.`
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to permanently delete the category "${cat.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete category.");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error deleting category.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-canvas-surface border border-border-default p-4 sm:p-5">
        <div>
          <h2 className="text-sm uppercase tracking-luxury text-charcoal-900 font-semibold">
            Storefront Disciplines ({initialCategories.length})
          </h2>
          <p className="text-xs text-charcoal-500 font-light mt-0.5">
            Categories organize creations across customer catalog filters and house showcases.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" /> New Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {initialCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-canvas-surface border border-border-default overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Category Cover Image */}
              <div className="relative h-44 w-full bg-canvas-secondary border-b border-border-subtle overflow-hidden">
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-charcoal-300">
                    <Layers className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-charcoal-900/80 text-canvas-primary text-[10px] tracking-wider uppercase px-2 py-0.5 font-medium">
                  {cat.productCount} {cat.productCount === 1 ? "Piece" : "Pieces"}
                </div>
              </div>

              {/* Information */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-charcoal-900 font-normal">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] font-mono text-charcoal-400">
                    /{cat.slug}
                  </span>
                </div>
                <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                  {cat.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border-subtle bg-canvas-secondary/20 flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(cat)}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(cat)}
                className="text-rose-600 hover:text-rose-700 hover:border-rose-300"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-canvas-surface border border-border-default max-w-md w-full shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-base font-serif text-charcoal-900">
                {editingCategory ? `Edit: ${editingCategory.name}` : "Create New Category"}
              </h3>
              <button
                onClick={closeModal}
                className="text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fine Leather Goods"
                  className="w-full bg-canvas-primary border border-border-default px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Slug (Optional — auto-generated)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. fine-leather-goods"
                  className="w-full bg-canvas-primary border border-border-default px-3 py-2 text-xs text-charcoal-900 font-mono focus:outline-none focus:border-bronze"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Cover Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-canvas-primary border border-border-default px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-luxury text-charcoal-700 font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Discipline summary for showcases..."
                  className="w-full bg-canvas-primary border border-border-default p-2 text-xs text-charcoal-900 focus:outline-none focus:border-bronze"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex justify-end space-x-3">
                <Button variant="outline" size="sm" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                  {editingCategory ? "Update Discipline" : "Create Discipline"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
