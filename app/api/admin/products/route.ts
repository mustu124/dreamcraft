import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// ── GET /api/admin/products ───────────────────────────────────────────────────
// Query: search, category_id, is_active, is_bestseller

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search        = searchParams.get("search") ?? "";
  const categoryId    = searchParams.get("category_id") ?? "";
  const isActiveStr   = searchParams.get("is_active");
  const isBestStr     = searchParams.get("is_bestseller");

  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select(
      `id, name, sku, is_active, is_bestseller, created_at,
       categories(id, name),
       product_variants(price),
       product_images(url, sort_order)`,
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (isActiveStr !== null) {
    query = query.eq("is_active", isActiveStr === "true");
  }
  if (isBestStr !== null) {
    query = query.eq("is_bestseller", isBestStr === "true");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data ?? [] });
}

// ── POST /api/admin/products ──────────────────────────────────────────────────
// Body: { name, sku, category_id, subcategory_id?, description?, is_active,
//         is_bestseller, variants: [{label, price}]+, images: [{url, sort_order}]* }

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, sku, category_id, subcategory_id, description,
          is_active, is_bestseller, variants, images } = body;

  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (typeof sku !== "string" || !sku.trim())
    return NextResponse.json({ error: "sku is required" }, { status: 400 });
  if (!Array.isArray(variants) || variants.length === 0)
    return NextResponse.json({ error: "At least one variant is required" }, { status: 400 });
  if (!variants.every((v: Record<string, unknown>) => v.label && typeof v.price === "number" && v.price >= 0))
    return NextResponse.json({ error: "Each variant needs a label and a price" }, { status: 400 });

  const admin = createAdminClient();

  const { data: product, error: productErr } = await admin
    .from("products")
    .insert({
      name: (name as string).trim(),
      sku: (sku as string).trim().toUpperCase(),
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
      description: typeof description === "string" ? description.trim() || null : null,
      is_active:    is_active    !== false,
      is_bestseller: is_bestseller === true,
    })
    .select("id")
    .single<{ id: string }>();

  if (productErr) {
    const msg = productErr.code === "23505" ? "SKU already exists." : productErr.message;
    return NextResponse.json({ error: msg }, { status: productErr.code === "23505" ? 409 : 500 });
  }

  const productId = product!.id;

  const [variantsRes, imagesRes] = await Promise.all([
    admin.from("product_variants").insert(
      (variants as { label: string; price: number }[]).map((v) => ({
        product_id: productId,
        label: v.label.trim(),
        price: Math.round(v.price),
      })),
    ),
    Array.isArray(images) && images.length > 0
      ? admin.from("product_images").insert(
          (images as { url: string; sort_order: number }[]).map((img) => ({
            product_id: productId,
            url: img.url,
            sort_order: img.sort_order,
          })),
        )
      : Promise.resolve({ error: null }),
  ]);

  if (variantsRes.error || imagesRes.error) {
    return NextResponse.json(
      { error: (variantsRes.error ?? imagesRes.error)!.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: productId }, { status: 201 });
}
