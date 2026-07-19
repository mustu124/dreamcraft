import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── POST /api/cart/sync ───────────────────────────────────────────────────────
// A cart persists indefinitely in localStorage, capturing a variantId/price at
// add-to-cart time. If that product is later edited in the admin panel (sizes
// renamed, added, or removed), the stored variantId can go stale and checkout
// fails with "Product variant not found". This endpoint lets the client
// re-resolve each cart line against the live catalogue before submitting an
// order, so stale items get remapped or dropped instead of blowing up at
// payment time.

type ResolvedProduct = {
  productId: string;
  variants: { id: string; label: string; price: number }[];
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const skus = Array.isArray(body?.skus)
    ? Array.from(new Set((body.skus as unknown[]).filter((s): s is string => typeof s === "string")))
    : [];

  if (skus.length === 0) return NextResponse.json({ products: {} });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, is_active, product_variants(id, label, price)")
    .in("sku", skus)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products: Record<string, ResolvedProduct> = {};
  for (const p of data ?? []) {
    products[p.sku] = {
      productId: p.id,
      variants: (p.product_variants ?? []).map((v: { id: string; label: string; price: number }) => ({
        id: v.id,
        label: v.label,
        price: v.price,
      })),
    };
  }

  return NextResponse.json({ products });
}
