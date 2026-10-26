import { getAdminCategories } from "@/services/admin-catalog.service";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { requireAdminPageSession } from "@/lib/admin-auth";

export default async function AdminCategoriesPage() {
  const { businessId } = await requireAdminPageSession("VIEW_ADMIN");
  const categories = await getAdminCategories(businessId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs uppercase tracking-luxury text-bronze font-semibold">
          House Disciplines
        </span>
        <h1 className="text-3xl font-serif text-charcoal-900 mt-1">
          Category Architecture
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 font-light">
          Configure product categories, slug routing, and showcase photography.
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  );
}
