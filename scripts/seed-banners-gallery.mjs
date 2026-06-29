/**
 * Populates:
 *  1. banners  — 4 candle-product images as hero carousel slides
 *  2. gallery_images — every product image (one per product) as gallery items
 *
 * Safe to re-run: clears old banners/gallery first, then re-inserts.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL        = "https://skfenguqikdmrwbefntt.supabase.co";
const SERVICE_ROLE_KEY    =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrZmVuZ3VxaWtkbXJ3YmVmbnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYyMTM5NiwiZXhwIjoyMDk4MTk3Mzk2fQ.E9aqwxM2OoYyg_jOHkx_NUPef2O1iBweze_7vL9RI00";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── helpers ───────────────────────────────────────────────────────────────────

function firstImage(images) {
  if (!images || images.length === 0) return null;
  return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url ?? null;
}

// ── 1. fetch category ids ─────────────────────────────────────────────────────

const { data: cats } = await db.from("categories").select("id, name, slug");
const candleCat = cats?.find((c) =>
  c.name.toLowerCase().includes("candle") || c.slug.toLowerCase().includes("candle"),
);

if (!candleCat) {
  console.error("Could not find candle category — aborting banner seed.");
  process.exit(1);
}

console.log(`Candle category: ${candleCat.name} (${candleCat.id})`);

// ── 2. fetch candle products ──────────────────────────────────────────────────

const { data: candleProds, error: cErr } = await db
  .from("products")
  .select("id, name, sku, product_images(url, sort_order)")
  .eq("is_active", true)
  .eq("category_id", candleCat.id)
  .order("sort_order")
  .limit(5);

if (cErr) { console.error("Candle query error:", cErr.message); process.exit(1); }

const bannerProds = candleProds.filter((p) => firstImage(p.product_images));
console.log(`Found ${bannerProds.length} candle products with images for banners`);

// ── 3. clear + insert banners ─────────────────────────────────────────────────

await db.from("banners").delete().neq("id", "00000000-0000-0000-0000-000000000000");

const bannerRows = bannerProds.slice(0, 4).map((prod, i) => ({
  image_url:        firstImage(prod.product_images),
  mobile_image_url: firstImage(prod.product_images),
  link_url:         `/shop/${prod.sku}`,
  is_active:        true,
  sort_order:       i,
}));

const { error: bErr } = await db.from("banners").insert(bannerRows);
if (bErr) { console.error("Banner insert error:", bErr.message); }
else       { console.log(`✓ Inserted ${bannerRows.length} banners`); }

// ── 4. fetch all products with images (for gallery) ───────────────────────────

const { data: allProds, error: pErr } = await db
  .from("products")
  .select("id, name, sku, product_images(url, sort_order, id)")
  .eq("is_active", true)
  .order("sort_order");

if (pErr) { console.error("Products query error:", pErr.message); process.exit(1); }

// ── 5. clear + insert gallery_images ─────────────────────────────────────────

await db.from("gallery_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");

const galleryRows = [];
for (const prod of allProds) {
  if (!prod.product_images?.length) continue;
  const sorted = [...prod.product_images].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  // Use all images for richer gallery (up to 2 per product to avoid repetition)
  for (const img of sorted.slice(0, 2)) {
    if (img.url) {
      galleryRows.push({
        image_url:  img.url,
        caption:    prod.name,
        is_active:  true,
        sort_order: galleryRows.length,
      });
    }
  }
}

// Insert in batches of 50
for (let i = 0; i < galleryRows.length; i += 50) {
  const batch = galleryRows.slice(i, i + 50);
  const { error: gErr } = await db.from("gallery_images").insert(batch);
  if (gErr) { console.error(`Gallery batch ${i} error:`, gErr.message); }
}
console.log(`✓ Inserted ${galleryRows.length} gallery images from ${allProds.length} products`);
console.log("\nDone!");
