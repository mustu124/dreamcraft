"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FilterCategory } from "../page";

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = { price: number };
type Image   = { url: string; sort_order: number };

type ProductRow = {
  id:            string;
  name:          string;
  sku:           string;
  is_active:     boolean;
  is_bestseller: boolean;
  categories:    { id: string; name: string } | null;
  product_variants: Variant[];
  product_images:   Image[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function priceRange(variants: Variant[]): string {
  const prices = variants.map((v) => v.price).sort((a, b) => a - b);
  if (!prices.length) return "—";
  return prices[0] === prices[prices.length - 1]
    ? `₹${prices[0]}`
    : `₹${prices[0]} – ₹${prices[prices.length - 1]}`;
}

function thumbnail(images: Image[]): string | null {
  return images.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-terracotta/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-terracotta" : "bg-gray-200",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ── Star icon ─────────────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-colors ${filled ? "fill-gold text-gold" : "fill-none text-gray-300"}`}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProductList({ categories }: { categories: FilterCategory[] }) {
  const [products, setProducts]             = useState<ProductRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter]     = useState<"" | "active" | "inactive">("");
  const [bestFilter, setBestFilter]         = useState<"" | "bestseller">("");
  const [togglingId, setTogglingId]         = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (s: string, cat: string, status: string, best: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (s)      params.set("search",       s);
    if (cat)    params.set("category_id",  cat);
    if (status) params.set("is_active",    status === "active" ? "true" : "false");
    if (best)   params.set("is_bestseller","true");

    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(search, categoryFilter, statusFilter, bestFilter);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, categoryFilter, statusFilter, bestFilter, fetchProducts]);

  async function handleToggle(id: string, field: "is_active" | "is_bestseller", value: boolean) {
    setTogglingId(id);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      // Revert optimistic update
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: !value } : p));
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
    setDeleteConfirmId(null);
  }

  return (
    <div className="space-y-4">
      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={bestFilter}
          onChange={(e) => setBestFilter(e.target.value as "" | "bestseller")}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        >
          <option value="">All types</option>
          <option value="bestseller">★ Bestsellers only</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_120px_110px_80px_80px_120px] items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <div />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Product</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Category</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Price</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">★ Best</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No products found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((p) => {
              const thumb = thumbnail(p.product_images);
              const isSaving = togglingId === p.id;

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[48px_1fr_120px_110px_80px_80px_120px] items-center gap-3 px-4 py-3 hover:bg-gray-50/50"
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {thumb ? (
                      <img src={thumb} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name / SKU */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="truncate font-mono text-xs text-gray-400">{p.sku}</p>
                  </div>

                  {/* Category */}
                  <p className="truncate text-sm text-gray-600">
                    {p.categories?.name ?? <span className="text-gray-300">—</span>}
                  </p>

                  {/* Price range */}
                  <p className="text-sm text-gray-700">{priceRange(p.product_variants)}</p>

                  {/* Bestseller toggle */}
                  <div className="flex items-center gap-1.5">
                    <StarIcon filled={p.is_bestseller} />
                    <Toggle
                      checked={p.is_bestseller}
                      onChange={(v) => handleToggle(p.id, "is_bestseller", v)}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Active toggle */}
                  <Toggle
                    checked={p.is_active}
                    onChange={(v) => handleToggle(p.id, "is_active", v)}
                    disabled={isSaving}
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    {deleteConfirmId === p.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === p.id ? "…" : "Sure?"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {products.length} product{products.length !== 1 ? "s" : ""} shown
      </p>
    </div>
  );
}
