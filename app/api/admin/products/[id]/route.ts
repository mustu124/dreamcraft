import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// ── GET /api/admin/products/[id] ──────────────────────────────────────────────
// Returns full product data for the edit form.

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await createAdminClient()
    .from("products")
    .select(
      `*, categories!category_id(id, name),
       subcategories!subcategory_id(id, name),
       product_variants(id, label, price),
       product_images(id, url, sort_order)`,
    )
    .eq("id", params.id)
    .order("sort_order", { referencedTable: "product_images" })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ product: data });
}

// ── PATCH /api/admin/products/[id] ────────────────────────────────────────────
// Handles both full edits and quick single-field toggles (is_active, is_bestseller).

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const admin = createAdminClient();

  // ── Quick-toggle path (is_active / is_bestseller only) ─────────────────────
  if (Object.keys(body).every((k) => k === "is_active" || k === "is_bestseller")) {
    const update: Record<string, boolean> = {};
    if (typeof body.is_active === "boolean")     update.is_active    = body.is_active;
    if (typeof body.is_bestseller === "boolean") update.is_bestseller = body.is_bestseller;

    const { error } = await admin.from("products").update(update).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Full edit path ─────────────────────────────────────────────────────────
  const { name, sku, category_id, subcategory_id, description,
          is_active, is_bestseller, variants, images } = body;

  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!Array.isArray(variants) || variants.length === 0)
    return NextResponse.json({ error: "At least one variant is required" }, { status: 400 });

  // Update product core fields
  const { error: productErr } = await admin.from("products").update({
    name: (name as string).trim(),
    ...(typeof sku === "string" && sku.trim() ? { sku: sku.trim().toUpperCase() } : {}),
    category_id:    category_id    || null,
    subcategory_id: subcategory_id || null,
    description:    typeof description === "string" ? description.trim() || null : null,
    is_active:      is_active    !== false,
    is_bestseller:  is_bestseller === true,
  }).eq("id", params.id);

  if (productErr) {
    const msg = productErr.code === "23505" ? "SKU already exists." : productErr.message;
    return NextResponse.json({ error: msg }, { status: productErr.code === "23505" ? 409 : 500 });
  }

  // ── Variants ───────────────────────────────────────────────────────────────
  type VariantInput = { id?: string; label: string; price: number };
  const incomingVariants = variants as VariantInput[];
  const incomingIds = incomingVariants.filter((v) => v.id).map((v) => v.id as string);

  // Fetch existing variant IDs
  const { data: existingVars } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", params.id);

  const toRemove = (existingVars ?? [])
    .map((v: { id: string }) => v.id)
    .filter((id: string) => !incomingIds.includes(id));

  // product_variants has no sort_order/is_active columns — display order follows
  // insertion order, and a variant referenced by past orders (FK violation) is
  // simply left in place since there's no soft-delete flag to fall back to.
  for (const varId of toRemove) {
    await admin.from("product_variants").delete().eq("id", varId);
  }

  // Upsert incoming variants
  for (const v of incomingVariants) {
    if (v.id) {
      const { error } = await admin.from("product_variants").update({
        label: v.label.trim(),
        price: Math.round(v.price),
      }).eq("id", v.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from("product_variants").insert({
        product_id: params.id,
        label: v.label.trim(),
        price: Math.round(v.price),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Images ────────────────────────────────────────────────────────────────
  type ImageInput = { id?: string; url: string; sort_order: number };
  const incomingImages = (Array.isArray(images) ? images : []) as ImageInput[];
  const incomingImgIds = incomingImages.filter((img) => img.id).map((img) => img.id as string);

  const { data: existingImgs } = await admin
    .from("product_images")
    .select("id")
    .eq("product_id", params.id);

  const imgIdsToRemove = (existingImgs ?? [])
    .map((img: { id: string }) => img.id)
    .filter((id: string) => !incomingImgIds.includes(id));

  if (imgIdsToRemove.length > 0) {
    await admin.from("product_images").delete().in("id", imgIdsToRemove);
  }

  for (let i = 0; i < incomingImages.length; i++) {
    const img = incomingImages[i];
    if (img.id) {
      const { error } = await admin.from("product_images").update({ sort_order: i }).eq("id", img.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from("product_images").insert({
        product_id: params.id,
        url: img.url,
        sort_order: i,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/admin/products/[id] ───────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Variants cascade; but some may be FK-referenced in order_items.
  // Soft-delete the product instead of hard delete to avoid FK errors.
  const { error } = await createAdminClient()
    .from("products")
    .update({ is_active: false })
    .eq("id", params.id);

  // Try hard delete — if FK violation, the soft-delete above still took effect.
  await createAdminClient().from("products").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
