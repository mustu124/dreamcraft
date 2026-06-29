import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductList } from "./_components/ProductList";

export const metadata: Metadata = { title: "Products | Dreamcraft Admin" };

export type FilterCategory = { id: string; name: string };

export default async function ProductsPage() {
  const { data: categories } = await createClient()
    .from("categories")
    .select("id, name")
    .order("sort_order");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your catalogue — changes go live immediately.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-xl bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta/90"
        >
          + Add Product
        </Link>
      </div>

      <ProductList categories={(categories ?? []) as FilterCategory[]} />
    </div>
  );
}
