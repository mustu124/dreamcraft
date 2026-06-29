import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../_components/ProductForm";

export const metadata: Metadata = { title: "Add Product | Dreamcraft Admin" };

export default async function NewProductPage() {
  const supabase = createClient();
  const [{ data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase.from("subcategories").select("id, category_id, name, slug").order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-800">
          Products
        </Link>
        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-gray-900">Add Product</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>

      <ProductForm
        categories={(categories ?? []) as { id: string; name: string; slug: string }[]}
        allSubcategories={
          (subcategories ?? []) as { id: string; category_id: string; name: string; slug: string }[]
        }
      />
    </div>
  );
}
