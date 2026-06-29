import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "./_components/CategoryManager";

export const metadata: Metadata = { title: "Categories | Dreamcraft Admin" };

// Shape we expose to the client component
export type CategoryRow = {
  id:             string;
  name:           string;
  slug:           string;
  icon_image_url: string | null;
  sort_order:     number;
  subcategory_count: number;
};

export default async function CategoriesPage() {
  const supabase = createClient();

  // Fetch categories with their subcategory IDs (just for counting)
  const { data: raw } = await supabase
    .from("categories")
    .select("id, name, slug, icon_image_url, sort_order, subcategories(id)")
    .order("sort_order");

  const categories: CategoryRow[] = (raw ?? []).map((c) => ({
    id:               c.id,
    name:             c.name,
    slug:             c.slug,
    icon_image_url:   c.icon_image_url ?? null,
    sort_order:       c.sort_order,
    subcategory_count: Array.isArray(c.subcategories) ? c.subcategories.length : 0,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Drag to reorder — order here controls the homepage circles and shop filter bar.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
