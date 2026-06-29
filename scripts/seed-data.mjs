/**
 * Dreamcraft seed script — run once to populate the database.
 * Usage:  node scripts/seed-data.mjs
 * Requires: Node ≥ 18 (built-in fetch), @supabase/supabase-js installed.
 *
 * Idempotent: skips rows that would violate unique constraints.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

try {
  const envContent = readFileSync(resolve(ROOT, ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // Env vars may already be set in the shell
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureBucket(name) {
  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    allowedMimeTypes: ["image/*"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn(`  ⚠  Bucket '${name}': ${error.message}`);
  } else {
    console.log(`  ✓  Bucket '${name}' ready`);
  }
}

async function uploadFromUrl(bucket, remotePath, srcUrl) {
  // Check if the file already exists
  const { data: existing } = await supabase.storage.from(bucket).list("", {
    search: remotePath.split("/").pop(),
    limit: 1,
  });
  if (existing?.length) {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(remotePath);
    return publicUrl;
  }

  console.log(`    ↓ ${srcUrl}`);
  const fetchRes = await fetch(srcUrl);
  if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status} fetching ${srcUrl}`);
  const buf = Buffer.from(await fetchRes.arrayBuffer());
  const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(remotePath, buf, { contentType, upsert: true });

  if (error) throw new Error(`Upload ${remotePath}: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

// Picsum Photos — deterministic by seed word
function picsum(seed, w, h) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// ── 1. Ensure storage buckets ─────────────────────────────────────────────────

console.log("\n📦  Ensuring storage buckets…");
await Promise.all([
  ensureBucket("product-images"),
  ensureBucket("categories"),
  ensureBucket("banners"),
  ensureBucket("gallery"),
  ensureBucket("avatars"),
  ensureBucket("clips"),
]);

// ── 2. Upload category icons ──────────────────────────────────────────────────

console.log("\n🖼   Uploading category icons…");

const [resinIconUrl, candleIconUrl, giftIconUrl] = await Promise.all([
  uploadFromUrl("categories", "seed/resin-decor.jpg",  picsum("dccraft-resin", 400, 400)),
  uploadFromUrl("categories", "seed/soy-candles.jpg",  picsum("dccraft-candle", 400, 400)),
  uploadFromUrl("categories", "seed/gifts.jpg",        picsum("dccraft-gift", 400, 400)),
]);

// ── 3. Upsert categories ──────────────────────────────────────────────────────

console.log("\n🏷   Seeding categories…");

const { data: categories, error: catErr } = await supabase
  .from("categories")
  .upsert(
    [
      { name: "Resin Décor",    slug: "resin-decor",   icon_image_url: resinIconUrl,  sort_order: 1 },
      { name: "Soy Candles",    slug: "soy-candles",   icon_image_url: candleIconUrl, sort_order: 2 },
      { name: "Gifts & Bundles",slug: "gifts",          icon_image_url: giftIconUrl,   sort_order: 3 },
    ],
    { onConflict: "slug", ignoreDuplicates: false },
  )
  .select("id, slug");

if (catErr) { console.error("  ❌  categories:", catErr.message); process.exit(1); }

const catId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
console.log("  ✓  Categories:", Object.keys(catId).join(", "));

// ── 4. Upsert subcategories ───────────────────────────────────────────────────

console.log("\n🔖  Seeding subcategories…");

const wantedSubs = [
  { category_id: catId["resin-decor"], name: "Trays",          slug: "trays",          sort_order: 1 },
  { category_id: catId["resin-decor"], name: "Coasters",       slug: "coasters",       sort_order: 2 },
  { category_id: catId["resin-decor"], name: "Bowls",          slug: "bowls",          sort_order: 3 },
  { category_id: catId["resin-decor"], name: "Photo Frames",   slug: "photo-frames",   sort_order: 4 },
  { category_id: catId["soy-candles"], name: "Jar Candles",    slug: "jar-candles",    sort_order: 1 },
  { category_id: catId["soy-candles"], name: "Pillar Candles", slug: "pillar-candles", sort_order: 2 },
  { category_id: catId["soy-candles"], name: "Tea Lights",     slug: "tea-lights",     sort_order: 3 },
];

// Fetch existing subcategories for these categories
const { data: existingSubs } = await supabase
  .from("subcategories")
  .select("id, slug")
  .in("category_id", Object.values(catId));

const existingSlugs = new Set((existingSubs ?? []).map((s) => s.slug));
const toInsertSubs  = wantedSubs.filter((s) => !existingSlugs.has(s.slug));

if (toInsertSubs.length > 0) {
  const { error: subErr } = await supabase.from("subcategories").insert(toInsertSubs);
  if (subErr) { console.error("  ❌  subcategories:", subErr.message); process.exit(1); }
}

const { data: allSubs, error: allSubErr } = await supabase
  .from("subcategories")
  .select("id, slug")
  .in("category_id", Object.values(catId));

if (allSubErr) { console.error("  ❌  subcategories fetch:", allSubErr.message); process.exit(1); }

const subId = Object.fromEntries(allSubs.map((s) => [s.slug, s.id]));
console.log("  ✓  Subcategories:", Object.keys(subId).join(", "));

// ── 5. Upload product images ──────────────────────────────────────────────────

console.log("\n📸  Uploading product images (this takes a moment)…");

const productImages = {
  "tray-1":    await uploadFromUrl("product-images", "seed/tray-1.jpg",    picsum("ocean-tray-1",    800, 800)),
  "tray-2":    await uploadFromUrl("product-images", "seed/tray-2.jpg",    picsum("ocean-tray-2",    800, 800)),
  "coast-1":   await uploadFromUrl("product-images", "seed/coast-1.jpg",   picsum("marble-coast-1",  800, 800)),
  "coast-2":   await uploadFromUrl("product-images", "seed/coast-2.jpg",   picsum("marble-coast-2",  800, 800)),
  "bowl-1":    await uploadFromUrl("product-images", "seed/bowl-1.jpg",    picsum("resin-bowl-1",    800, 800)),
  "bowl-2":    await uploadFromUrl("product-images", "seed/bowl-2.jpg",    picsum("resin-bowl-2",    800, 800)),
  "candle-1":  await uploadFromUrl("product-images", "seed/candle-1.jpg",  picsum("lavender-candle-1",800, 800)),
  "candle-2":  await uploadFromUrl("product-images", "seed/candle-2.jpg",  picsum("lavender-candle-2",800, 800)),
  "pillar-1":  await uploadFromUrl("product-images", "seed/pillar-1.jpg",  picsum("sandalwood-pillar",800, 800)),
  "gift-1":    await uploadFromUrl("product-images", "seed/gift-1.jpg",    picsum("gift-set-1",      800, 800)),
};

console.log("  ✓  Product images uploaded");

// ── 6. Upsert products ────────────────────────────────────────────────────────

console.log("\n📦  Seeding products…");

const productsPayload = [
  {
    name:          "Ocean Wave Resin Tray",
    sku:           "DC-TRAY-001",
    description:   "A handcrafted resin tray capturing the serene blues and greens of ocean waves. Each piece is unique, made with eco-friendly resin and natural mineral pigments. Perfect for a bedside table, vanity, or as a striking centrepiece.",
    category_id:   catId["resin-decor"],
    subcategory_id:subId["trays"],
    is_active:     true,
    is_bestseller: true,
    sort_order:    1,
  },
  {
    name:          "Marble Effect Coaster Set",
    sku:           "DC-COAST-001",
    description:   "Set of elegant marble-effect resin coasters in ivory and gold. Each coaster is individually handpoured, so no two are identical. Heat-resistant, easy to clean, and beautifully display-worthy.",
    category_id:   catId["resin-decor"],
    subcategory_id:subId["coasters"],
    is_active:     true,
    is_bestseller: true,
    sort_order:    2,
  },
  {
    name:          "Emerald Forest Bowl",
    sku:           "DC-BOWL-001",
    description:   "Deep forest greens swirl through this handpoured resin bowl. Whether you use it to hold jewellery, keys, or leave it as a standalone art piece, this bowl is a quiet conversation starter.",
    category_id:   catId["resin-decor"],
    subcategory_id:subId["bowls"],
    is_active:     true,
    is_bestseller: false,
    sort_order:    3,
  },
  {
    name:          "Lavender Dreams Soy Candle",
    sku:           "DC-CAN-001",
    description:   "Hand-poured soy wax candle infused with pure lavender essential oil. Clean-burning with a long, steady flame, this candle fills your space with a calming floral warmth that lingers for hours.",
    category_id:   catId["soy-candles"],
    subcategory_id:subId["jar-candles"],
    is_active:     true,
    is_bestseller: true,
    sort_order:    4,
  },
  {
    name:          "Sandalwood & Amber Pillar Candle",
    sku:           "DC-PIL-001",
    description:   "A warm, grounding pillar candle with notes of sandalwood, amber, and a whisper of vanilla. Made with 100% natural soy wax and lead-free cotton wicks. Sets the perfect mood for any living space.",
    category_id:   catId["soy-candles"],
    subcategory_id:subId["pillar-candles"],
    is_active:     true,
    is_bestseller: false,
    sort_order:    5,
  },
  {
    name:          "Gift Set — Tray & Candle",
    sku:           "DC-GIFT-001",
    description:   "Our most popular gift pairing: a handcrafted resin tray alongside a hand-poured soy wax candle. Presented in a kraft gift box with a personalised card. Ready to gift, impossible to forget.",
    category_id:   catId["gifts"],
    subcategory_id:null,
    is_active:     true,
    is_bestseller: true,
    sort_order:    6,
  },
];

const { data: products, error: prodErr } = await supabase
  .from("products")
  .upsert(productsPayload, { onConflict: "sku", ignoreDuplicates: false })
  .select("id, sku");

if (prodErr) { console.error("  ❌  products:", prodErr.message); process.exit(1); }

const prodId = Object.fromEntries(products.map((p) => [p.sku, p.id]));
console.log("  ✓  Products:", Object.keys(prodId).join(", "));

// ── 7. Upsert product variants ────────────────────────────────────────────────

console.log("\n💰  Seeding product variants…");

const allVariants = [
  // Tray
  { product_id: prodId["DC-TRAY-001"], label: "Small (20 × 14 cm)",  price: 799  },
  { product_id: prodId["DC-TRAY-001"], label: "Medium (28 × 20 cm)", price: 1199 },
  { product_id: prodId["DC-TRAY-001"], label: "Large (35 × 25 cm)",  price: 1799 },

  // Coasters
  { product_id: prodId["DC-COAST-001"], label: "Set of 4", price: 699 },
  { product_id: prodId["DC-COAST-001"], label: "Set of 6", price: 999 },

  // Bowl
  { product_id: prodId["DC-BOWL-001"], label: "Small (15 cm dia.)", price: 899  },
  { product_id: prodId["DC-BOWL-001"], label: "Large (22 cm dia.)", price: 1499 },

  // Lavender candle
  { product_id: prodId["DC-CAN-001"], label: "100 g (≈ 25 hr burn)", price: 349 },
  { product_id: prodId["DC-CAN-001"], label: "200 g (≈ 50 hr burn)", price: 599 },
  { product_id: prodId["DC-CAN-001"], label: "300 g (≈ 80 hr burn)", price: 849 },

  // Pillar candle
  { product_id: prodId["DC-PIL-001"], label: "Small", price: 449 },
  { product_id: prodId["DC-PIL-001"], label: "Large", price: 799 },

  // Gift set
  { product_id: prodId["DC-GIFT-001"], label: "Ocean Wave Tray + Lavender Candle",       price: 1099 },
  { product_id: prodId["DC-GIFT-001"], label: "Emerald Forest Bowl + Sandalwood Candle", price: 1299 },
];

// Delete existing variants for these products first so we can re-insert cleanly
await supabase
  .from("product_variants")
  .delete()
  .in("product_id", Object.values(prodId));

const { error: varErr } = await supabase.from("product_variants").insert(allVariants);
if (varErr) { console.error("  ❌  product_variants:", varErr.message); process.exit(1); }
console.log(`  ✓  ${allVariants.length} variants inserted`);

// ── 8. Upsert product images ──────────────────────────────────────────────────

console.log("\n🖼   Seeding product images…");

const allImages = [
  { product_id: prodId["DC-TRAY-001"],  url: productImages["tray-1"],   sort_order: 0 },
  { product_id: prodId["DC-TRAY-001"],  url: productImages["tray-2"],   sort_order: 1 },
  { product_id: prodId["DC-COAST-001"], url: productImages["coast-1"],  sort_order: 0 },
  { product_id: prodId["DC-COAST-001"], url: productImages["coast-2"],  sort_order: 1 },
  { product_id: prodId["DC-BOWL-001"],  url: productImages["bowl-1"],   sort_order: 0 },
  { product_id: prodId["DC-BOWL-001"],  url: productImages["bowl-2"],   sort_order: 1 },
  { product_id: prodId["DC-CAN-001"],   url: productImages["candle-1"], sort_order: 0 },
  { product_id: prodId["DC-CAN-001"],   url: productImages["candle-2"], sort_order: 1 },
  { product_id: prodId["DC-PIL-001"],   url: productImages["pillar-1"], sort_order: 0 },
  { product_id: prodId["DC-GIFT-001"],  url: productImages["gift-1"],   sort_order: 0 },
];

// Delete existing images for these products first
await supabase
  .from("product_images")
  .delete()
  .in("product_id", Object.values(prodId));

const { error: imgErr } = await supabase.from("product_images").insert(allImages);
if (imgErr) { console.error("  ❌  product_images:", imgErr.message); process.exit(1); }
console.log(`  ✓  ${allImages.length} product images inserted`);

// ── 9. Upload and seed banners ────────────────────────────────────────────────

console.log("\n🖼   Uploading and seeding banners…");

// Only seed banners if there are none yet
const { count: bannerCount } = await supabase
  .from("banners")
  .select("*", { count: "exact", head: true });

if (bannerCount && bannerCount > 0) {
  console.log(`  ⏭  Banners already exist (${bannerCount}), skipping`);
} else {
  const [b1desktop, b1mobile, b2desktop, b2mobile, b3desktop, b3mobile] = await Promise.all([
    uploadFromUrl("banners", "seed/banner1-desktop.jpg", picsum("dreamcraft-hero-1", 1920, 900)),
    uploadFromUrl("banners", "seed/banner1-mobile.jpg",  picsum("dreamcraft-hero-1", 900, 1200)),
    uploadFromUrl("banners", "seed/banner2-desktop.jpg", picsum("dreamcraft-candle-hero", 1920, 900)),
    uploadFromUrl("banners", "seed/banner2-mobile.jpg",  picsum("dreamcraft-candle-hero", 900, 1200)),
    uploadFromUrl("banners", "seed/banner3-desktop.jpg", picsum("dreamcraft-resin-hero", 1920, 900)),
    uploadFromUrl("banners", "seed/banner3-mobile.jpg",  picsum("dreamcraft-resin-hero", 900, 1200)),
  ]);

  const { error: bannerErr } = await supabase.from("banners").insert([
    { image_url: b1desktop, mobile_image_url: b1mobile, link_url: "/shop",                       is_active: true,  sort_order: 1 },
    { image_url: b2desktop, mobile_image_url: b2mobile, link_url: "/shop?category=soy-candles", is_active: true,  sort_order: 2 },
    { image_url: b3desktop, mobile_image_url: b3mobile, link_url: "/shop?category=resin-decor", is_active: false, sort_order: 3 },
  ]);

  if (bannerErr) { console.error("  ❌  banners:", bannerErr.message); }
  else            { console.log("  ✓  3 banners inserted (2 active)"); }
}

// ── 10. Seed sample testimonials ──────────────────────────────────────────────

console.log("\n⭐  Seeding testimonials…");

const { count: testCount } = await supabase
  .from("testimonials")
  .select("*", { count: "exact", head: true });

if (testCount && testCount > 0) {
  console.log(`  ⏭  Testimonials already exist (${testCount}), skipping`);
} else {
  const { error: testErr } = await supabase.from("testimonials").insert([
    {
      customer_name: "Priya Sharma",
      customer_city: "Mumbai",
      review_text:   "The ocean wave tray is absolutely stunning. I've placed it on my coffee table and every single guest asks about it. Worth every rupee!",
      rating:        5,
      sort_order:    1,
      is_active:     true,
    },
    {
      customer_name: "Ananya Mehta",
      customer_city: "Bangalore",
      review_text:   "Ordered the lavender soy candle as a birthday gift. My friend loved it so much she placed an order for three more! The scent is incredible and it burns so cleanly.",
      rating:        5,
      sort_order:    2,
      is_active:     true,
    },
    {
      customer_name: "Kavita Nair",
      customer_city: "Pune",
      review_text:   "The marble coasters are gorgeous. They look so much more expensive than what I paid. Dreamcraft is my go-to for gifts now.",
      rating:        5,
      sort_order:    3,
      is_active:     true,
    },
    {
      customer_name: "Ritu Joshi",
      customer_city: "Delhi",
      review_text:   "Got the tray and candle gift set for my sister's anniversary. The packaging was beautiful and the personal note was such a thoughtful touch. She was in tears!",
      rating:        5,
      sort_order:    4,
      is_active:     true,
    },
  ]);

  if (testErr) { console.error("  ❌  testimonials:", testErr.message); }
  else          { console.log("  ✓  4 testimonials inserted"); }
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("\n✅  Seed complete!\n");
