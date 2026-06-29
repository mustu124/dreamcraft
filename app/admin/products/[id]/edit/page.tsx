import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductForm, type ProductFormInitialData } from "../../_components/ProductForm";

export const metadata: Metadata = { title: "Edit Product | Dreamcraft Admin" };

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createAdminClient();

  const [productRes, catsRes, subsRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        `*, product_variants(id, label, price),
         product_images(id, url, sort_order)`,
      )
      .eq("id", params.id)
      .order("sort_order", { referencedTable: "product_images" })
      .single(),
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase.from("subcategories").select("id, category_id, name, slug").order("sort_order"),
  ]);

  if (!productRes.data) notFound();

  const p = productRes.data;

  const initialData: ProductFormInitialData = {
    id:             p.id,
    name:           p.name,
    sku:            p.sku,
    category_id:    p.category_id ?? "",
    subcategory_id: p.subcategory_id ?? "",
    description:    p.description ?? "",
    is_active:      p.is_active,
    is_bestseller:  p.is_bestseller,
    variants:       (p.product_variants ?? []).map((v: { id: string; label: string; price: number }) => ({
      id: v.id,
      label: v.label,
      price: v.price,
    })),
    images: (p.product_images ?? []).map((img: { id: string; url: string; sort_order: number }) => ({
      id:         img.id,
      url:        img.url,
      sort_order: img.sort_order,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-800">
          Products
        </Link>
        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-gray-900">Edit: {p.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>

      <ProductForm
        initialData={initialData}
        categories={(catsRes.data ?? []) as { id: string; name: string; slug: string }[]}
        allSubcategories={
          (subsRes.data ?? []) as { id: string; category_id: string; name: string; slug: string }[]
        }
      />
    </div>
  );
}
