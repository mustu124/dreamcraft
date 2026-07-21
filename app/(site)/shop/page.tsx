import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopFilters from "./ShopFilters";
import ShopProductCard from "./ShopProductCard";
import type { FilterCategory, SortKey } from "./ShopFilters";
import type { ShopProduct } from "./ShopProductCard";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Shop | Dreamcraft",
  description: "Browse handcrafted eco-resin home decor and soy wax candles — made to order.",
};

// ── Raw Supabase shapes ───────────────────────────────────────────────────────

type SubcatRow = { id: string; name: string; slug: string; sort_order: number };
type CatRow    = { id: string; name: string; slug: string; sort_order: number; subcategories: SubcatRow[] };

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  created_at: string;
  categories: { name: string; slug: string } | null;
  product_images: { url: string; sort_order: number }[];
  product_variants: { id: string; label: string; price: number }[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();

  // Normalise searchParams values (Next can return string | string[] | undefined)
  const catSlug  = typeof searchParams.category    === "string" ? searchParams.category    : undefined;
  const subSlug  = typeof searchParams.subcategory === "string" ? searchParams.subcategory : undefined;
  const sortRaw  = typeof searchParams.sort        === "string" ? searchParams.sort        : "newest";
  const pageNum  = Math.max(1, Number(searchParams.page) || 1);
  const sort     = (["newest", "price_asc", "price_high"].includes(sortRaw) ? sortRaw : "newest") as SortKey;

  // ── Fetch categories (for filter bar + ID lookup) ──────────────
  const { data: catData } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, subcategories(id, name, slug, sort_order)")
    .order("sort_order")
    .order("sort_order", { referencedTable: "subcategories" });

  const categories = (catData ?? []) as unknown as CatRow[];

  // In-memory ID lookup from slug — avoids extra round-trips
  const activeCatRow = catSlug ? categories.find((c) => c.slug === catSlug) ?? null : null;
  const activeSubRow = subSlug && activeCatRow
    ? activeCatRow.subcategories.find((s) => s.slug === subSlug) ?? null
    : null;

  // ── Fetch all matching products (sort done in-memory) ──────────
  // Fetching all rather than paginating at DB level because price sort
  // requires knowing the min variant price which only exists in JS after
  // flattening the variants array.
  let query = supabase
    .from("products")
    .select(`
      id, name, sku, created_at,
      categories(name, slug),
      product_images(url, sort_order),
      product_variants(id, label, price)
    `)
    .eq("is_active", true);

  if (activeCatRow?.id) query = query.eq("category_id",    activeCatRow.id);
  if (activeSubRow?.id) query = query.eq("subcategory_id", activeSubRow.id);

  const { data: rawData } = await query;
  const raw = (rawData ?? []) as unknown as RawProduct[];

  // ── Sort in memory ─────────────────────────────────────────────
  function minPrice(p: RawProduct): number {
    const prices = p.product_variants.map((v) => v.price);
    return prices.length ? Math.min(...prices) : Infinity;
  }

  const sorted = [...raw].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return minPrice(a) !== minPrice(b)
          ? minPrice(a) - minPrice(b)
          : a.name.localeCompare(b.name);
      case "price_high":
        return minPrice(a) !== minPrice(b)
          ? minPrice(b) - minPrice(a)
          : a.name.localeCompare(b.name);
      default: {
        // "newest": created_at desc, then name asc as tiebreaker
        const dt = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return dt !== 0 ? dt : a.name.localeCompare(b.name);
      }
    }
  });

  const total      = sorted.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const page       = Math.min(pageNum, Math.max(1, totalPages)); // clamp to valid range
  const sliceFrom  = (page - 1) * PAGE_SIZE;
  const paginated  = sorted.slice(sliceFrom, sliceFrom + PAGE_SIZE);

  // ── Transform into ShopProduct shape ──────────────────────────
  const products: ShopProduct[] = paginated.map((p) => {
    const imgs   = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url);
    const prices = p.product_variants.map((v) => v.price);
    return {
      id:                 p.id,
      name:               p.name,
      sku:                p.sku,
      categoryName:       p.categories?.name ?? "",
      categorySlug:       p.categories?.slug ?? "",
      images:             imgs,
      minPrice:           prices.length ? Math.min(...prices) : null,
      variants:           p.product_variants.map((v) => ({ id: v.id, label: v.label, price: v.price })),
      hasMultipleVariants: p.product_variants.length > 1,
    };
  });

  // ── Filter categories prop (strip subcategory sort_order) ──────
  // Candles is de-emphasized in nav/filters site-wide, but stays a real,
  // directly-linkable category — products and data are untouched.
  const filterCategories: FilterCategory[] = categories
    .filter((c) => c.slug !== "candles")
    .map((c) => ({
      id:   c.id,
      name: c.name,
      slug: c.slug,
      subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    }));

  // ── Page URL builder (for pagination links) ────────────────────
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (catSlug)                params.set("category",    catSlug);
    if (subSlug)                params.set("subcategory", subSlug);
    if (sort !== "newest")      params.set("sort",        sort);
    if (p > 1)                  params.set("page",        String(p));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ivory">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="border-b border-navy/8 px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-heading italic text-4xl text-navy md:text-5xl">
            {activeCatRow ? activeCatRow.name : "Shop"}
          </h1>
          {activeSubRow && (
            <p className="mt-1 font-body text-sm text-terracotta">
              {activeSubRow.name}
            </p>
          )}
          <p className="mt-2 font-body text-sm text-navy/50">
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Filters + grid ──────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 lg:px-8">

        <ShopFilters
          categories={filterCategories}
          activeCategory={catSlug ?? null}
          activeSubcategory={subSlug ?? null}
          activeSort={sort}
        />

        {/* ── Empty state ──────────────────────────────────────── */}
        {products.length === 0 ? (
          <EmptyState hasFilters={!!(catSlug || subSlug)} />
        ) : (
          <>
            {/* ── Product grid ───────────────────────────────────
             * grid-cols-2  → mobile  (<640px): exactly 2 per row
             * sm:grid-cols-3 → tablet (640-1023px): 3 per row
             * lg:grid-cols-4 → desktop (≥1024px): 4 per row
             */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-6">
              {products.map((product) => (
                <ShopProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* ── Pagination ────────────────────────────────────── */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageUrl={pageUrl}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <span aria-hidden className="text-5xl">🌿</span>
      <h2 className="mt-5 font-heading italic text-2xl text-navy">
        {hasFilters ? "No products found" : "Nothing here yet"}
      </h2>
      <p className="mt-3 max-w-xs font-body text-sm text-navy/55">
        {hasFilters
          ? "Try a different category or clear the filters to see all products."
          : "Check back soon — new pieces are always in the making."}
      </p>
      {hasFilters && (
        <Link
          href="/shop"
          className="mt-6 rounded-full border border-terracotta px-6 py-2 font-body text-sm text-terracotta transition-colors hover:bg-terracotta hover:text-ivory"
        >
          View All Products
        </Link>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  pageUrl,
}: {
  currentPage: number;
  totalPages: number;
  pageUrl: (p: number) => string;
}) {
  const pages = buildPageList(currentPage, totalPages);

  const base = "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 font-body text-sm transition-colors duration-200";
  const active = `${base} bg-terracotta text-ivory`;
  const inactive = `${base} text-navy/70 hover:bg-blush/40 hover:text-navy`;
  const arrow = `${base} border border-navy/20 text-navy/60 hover:border-terracotta hover:text-terracotta`;

  return (
    <nav aria-label="Product pages" className="mt-12 flex items-center justify-center gap-1.5">
      {currentPage > 1 && (
        <Link href={pageUrl(currentPage - 1)} className={arrow}>
          ←
        </Link>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`el-${i}`} className="px-2 text-navy/35 font-body text-sm select-none">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p as number)}
            aria-current={p === currentPage ? "page" : undefined}
            className={p === currentPage ? active : inactive}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link href={pageUrl(currentPage + 1)} className={arrow}>
          →
        </Link>
      )}
    </nav>
  );
}

// Returns an array of page numbers with "..." for gaps.
function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | "...")[] = [1];
  if (current > 3)           result.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    result.push(p);
  }
  if (current < total - 2)   result.push("...");
  result.push(total);
  return result;
}
