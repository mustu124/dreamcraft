"use client";

import { usePathname, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type Subcat = { id: string; name: string; slug: string };
export type FilterCategory = { id: string; name: string; slug: string; subcategories: Subcat[] };

export type SortKey = "newest" | "price_asc" | "price_high";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShopFilters({
  categories,
  activeCategory,
  activeSubcategory,
  activeSort,
}: {
  categories: FilterCategory[];
  activeCategory: string | null;
  activeSubcategory: string | null;
  activeSort: SortKey;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const activeCatData = activeCategory
    ? (categories.find((c) => c.slug === activeCategory) ?? null)
    : null;

  // Build a new URL preserving unchanged params and resetting page to 1.
  function navigate(updates: {
    category?:    string | null;
    subcategory?: string | null;
    sort?:        string | null;
  }) {
    const params = new URLSearchParams();

    const cat  = "category"    in updates ? updates.category    : activeCategory;
    const sub  = "subcategory" in updates ? updates.subcategory : activeSubcategory;
    const sort = "sort"        in updates ? updates.sort        : activeSort;

    if (cat)                         params.set("category",    cat);
    if (sub)                         params.set("subcategory", sub);
    if (sort && sort !== "newest")   params.set("sort",        sort);
    // "page" intentionally omitted — filter change resets to page 1

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleCategory(slug: string) {
    if (activeCategory === slug) {
      navigate({ category: null, subcategory: null });
    } else {
      navigate({ category: slug, subcategory: null });
    }
  }

  function toggleSubcategory(slug: string) {
    navigate({ subcategory: activeSubcategory === slug ? null : slug });
  }

  const hasSubcats =
    !!activeCatData && activeCatData.subcategories.length > 0;

  return (
    <div className="mb-8">

      {/* ── Row 1: category pills + sort ───────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Scrollable pill row — never wraps */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterPill
            label="All"
            active={!activeCategory}
            onClick={() => navigate({ category: null, subcategory: null })}
          />
          {categories.map((cat) => (
            <FilterPill
              key={cat.id}
              label={cat.name}
              active={activeCategory === cat.slug}
              onClick={() => toggleCategory(cat.slug)}
            />
          ))}
        </div>

        {/* Sort — never shrinks */}
        <select
          value={activeSort}
          onChange={(e) => navigate({ sort: e.target.value })}
          aria-label="Sort products"
          className="flex-shrink-0 rounded-lg border border-navy/20 bg-ivory px-3 py-2 font-body text-sm text-navy focus:border-terracotta focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_high">Price ↓</option>
        </select>
      </div>

      {/* ── Row 2: subcategory pills (animated) ────────────────── */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: hasSubcats ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          {activeCatData && activeCatData.subcategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-3 scrollbar-hide">
              <SubFilterPill
                label={`All ${activeCatData.name}`}
                active={!activeSubcategory}
                onClick={() => navigate({ subcategory: null })}
              />
              {activeCatData.subcategories.map((sub) => (
                <SubFilterPill
                  key={sub.id}
                  label={sub.name}
                  active={activeSubcategory === sub.slug}
                  onClick={() => toggleSubcategory(sub.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* divider */}
      <div className="mt-4 border-b border-navy/8" />
    </div>
  );
}

// ── Pill helpers ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-none rounded-full px-4 py-1.5 font-body text-sm whitespace-nowrap transition-all duration-200",
        active
          ? "bg-terracotta text-ivory shadow-sm"
          : "border border-navy/25 text-navy/70 hover:border-terracotta hover:text-terracotta",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SubFilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-none rounded-full px-3 py-1 font-body text-xs whitespace-nowrap transition-all duration-200",
        active
          ? "bg-navy text-ivory"
          : "border border-navy/20 text-navy/60 hover:border-navy/50 hover:text-navy",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
