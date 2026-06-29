import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubcategoryManager } from "./_components/SubcategoryManager";

export const metadata: Metadata = { title: "Subcategories | Dreamcraft Admin" };

export type SubcategoryRow = {
  id:         string;
  name:       string;
  slug:       string;
  sort_order: number;
};

export default async function CategorySubcategoriesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [catResult, subsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("id", params.id)
      .single(),
    supabase
      .from("subcategories")
      .select("id, name, slug, sort_order")
      .eq("category_id", params.id)
      .order("sort_order"),
  ]);

  if (!catResult.data) notFound();

  const category = catResult.data as { id: string; name: string; slug: string };
  const subcategories: SubcategoryRow[] = (subsResult.data ?? []) as SubcategoryRow[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/admin/categories"
          className="text-gray-500 hover:text-gray-800"
        >
          Categories
        </Link>
        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-gray-900">{category.name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Subcategories: {category.name}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Drag to reorder — subcategories appear in the shop filter bar and product form.
        </p>
      </div>

      <SubcategoryManager
        categoryId={category.id}
        initialSubcategories={subcategories}
      />
    </div>
  );
}
