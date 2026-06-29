import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShopProductCard from "@/app/(site)/shop/ShopProductCard";
import type { ShopProduct } from "@/app/(site)/shop/ShopProductCard";
import ProductGallery from "./ProductGallery";
import ProductInfo from "./ProductInfo";
import type { ProductInfoData } from "./ProductInfo";

// ── Raw Supabase shapes ───────────────────────────────────────────────────────

type RawProductDetail = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  categories:    { name: string; slug: string } | null;
  subcategories: { name: string; slug: string } | null;
  product_images:   { url: string; sort_order: number }[];
  product_variants: { id: string; label: string; price: number }[];
};

type RawRelated = {
  id: string;
  name: string;
  sku: string;
  categories:       { name: string; slug: string } | null;
  product_images:   { url: string; sort_order: number }[];
  product_variants: { id: string; label: string; price: number }[];
};

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { sku: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description")
    .eq("sku", params.sku)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Product | Dreamcraft" };

  return {
    title:       `${data.name} | Dreamcraft`,
    description: data.description ?? undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: { sku: string };
}) {
  const supabase = createClient();

  // ── Fetch the product ─────────────────────────────────────
  const { data: rawProduct } = await supabase
    .from("products")
    .select(`
      id, name, sku, description, category_id,
      categories(name, slug),
      subcategories(name, slug),
      product_images(url, sort_order),
      product_variants(id, label, price)
    `)
    .eq("sku", params.sku)
    .eq("is_active", true)
    .single();

  if (!rawProduct) notFound();

  const p = rawProduct as unknown as RawProductDetail;

  // ── Fetch related products (same category, limit 4) ────────
  const { data: rawRelated } = p.category_id
    ? await supabase
        .from("products")
        .select(`
          id, name, sku,
          categories(name, slug),
          product_images(url, sort_order),
          product_variants(id, label, price)
        `)
        .eq("category_id", p.category_id)
        .eq("is_active", true)
        .neq("sku", params.sku)
        .order("created_at", { ascending: false })
        .limit(4)
    : { data: [] };

  const related = (rawRelated ?? []) as unknown as RawRelated[];

  // ── Transform product into typed shape ────────────────────
  const sortedImages = [...p.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url);

  const product: ProductInfoData = {
    id:               p.id,
    name:             p.name,
    sku:              p.sku,
    description:      p.description,
    categoryName:     p.categories?.name ?? "",
    categorySlug:     p.categories?.slug ?? "",
    subcategoryName:  p.subcategories?.name ?? null,
    subcategorySlug:  p.subcategories?.slug ?? null,
    images:           sortedImages,
    variants:         p.product_variants.map((v) => ({ id: v.id, label: v.label, price: v.price })),
    isCandleCategory: (p.categories?.slug ?? "") === "candles",
  };

  // ── Transform related into ShopProduct shape ──────────────
  const relatedProducts: ShopProduct[] = related.map((r) => {
    const imgs   = [...r.product_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url);
    const prices = r.product_variants.map((v) => v.price);
    return {
      id:                  r.id,
      name:                r.name,
      sku:                 r.sku,
      categoryName:        r.categories?.name ?? "",
      categorySlug:        r.categories?.slug ?? "",
      images:              imgs,
      minPrice:            prices.length ? Math.min(...prices) : null,
      variants:            r.product_variants,
      hasMultipleVariants: r.product_variants.length > 1,
    };
  });

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ivory">

      {/* ── Two-column product section ──────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 md:pt-24 md:pb-20 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">

          {/* LEFT: Gallery — sticky on desktop so it stays visible while
              the right column scrolls through longer product info */}
          <div className="lg:sticky lg:top-[80px] lg:self-start">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* RIGHT: Product info — all interactive, must be client component */}
          <ProductInfo product={product} />
        </div>
      </div>

      {/* ── You May Also Like ───────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section
          aria-label="You may also like"
          className="border-t border-navy/8 py-12 md:py-16"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-2 h-px w-8 bg-gold" />
            <h2 className="mb-8 font-heading italic text-2xl text-navy md:text-3xl">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-6">
              {relatedProducts.map((rp) => (
                <ShopProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
