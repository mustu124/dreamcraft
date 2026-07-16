/**
 * Dreamcraft real-product seed script.
 * Wipes old placeholder products and inserts all real products
 * with images uploaded from the local assets folder.
 *
 * Usage:  node scripts/seed-products.mjs
 * Requires: Node ≥ 18, @supabase/supabase-js installed.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

// ── Env ───────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

try {
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
} catch { /* env vars may already be set */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const ASSETS   = resolve(ROOT, "assets", "For Website");

// ── Helpers ───────────────────────────────────────────────────────────────────

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function uploadFile(bucket, storagePath, localPath) {
  if (!existsSync(localPath)) {
    console.warn(`    ⚠  File not found, skipping: ${localPath}`);
    return null;
  }

  // Check existence using folder + filename split
  const parts  = storagePath.split("/");
  const fname  = parts.pop();
  const folder = parts.join("/");

  const { data: existing } = await supabase.storage.from(bucket).list(folder, { search: fname, limit: 1 });
  if (existing?.length) {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return publicUrl;
  }

  const buf  = readFileSync(localPath);
  const ct   = MIME[extname(localPath).toLowerCase()] ?? "image/jpeg";
  const { data, error } = await supabase.storage.from(bucket).upload(storagePath, buf, { contentType: ct, upsert: true });
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  process.stdout.write(`    ↑ ${fname}\n`);
  return publicUrl;
}

// Upload an image from the assets folder to product-images bucket
async function img(productSlug, filename) {
  const storagePath = `products/${productSlug}/${slug(filename)}`;
  const localPath   = resolve(ASSETS, filename);
  return uploadFile("product-images", storagePath, localPath);
}

// ── 1. Buckets ────────────────────────────────────────────────────────────────

console.log("\n📦  Ensuring storage bucket…");
const { error: bucketErr } = await supabase.storage.createBucket("product-images", {
  public: true, allowedMimeTypes: ["image/*"], fileSizeLimit: 10 * 1024 * 1024,
});
if (bucketErr && !bucketErr.message.toLowerCase().includes("already exists")) {
  console.warn("  ⚠  Bucket:", bucketErr.message);
} else {
  console.log("  ✓  product-images bucket ready");
}

// ── 2. Categories ─────────────────────────────────────────────────────────────

console.log("\n🏷   Upserting categories…");
const { data: cats, error: catErr } = await supabase
  .from("categories")
  .upsert([
    { name: "Eco-Resin Décor", slug: "resin-decor", sort_order: 1 },
    { name: "Soy Candles",    slug: "soy-candles", sort_order: 2 },
    { name: "Gifts & Bundles",slug: "gifts",        sort_order: 3 },
  ], { onConflict: "slug", ignoreDuplicates: false })
  .select("id, slug");

if (catErr) { console.error("  ❌  categories:", catErr.message); process.exit(1); }
const catId = Object.fromEntries(cats.map(c => [c.slug, c.id]));
console.log("  ✓", Object.keys(catId).join(", "));

// ── 3. Subcategories ──────────────────────────────────────────────────────────

console.log("\n🔖  Upserting subcategories…");
const wantedSubs = [
  { category_id: catId["resin-decor"], name: "Trays",               slug: "trays",          sort_order: 1 },
  { category_id: catId["resin-decor"], name: "Coasters",            slug: "coasters",       sort_order: 2 },
  { category_id: catId["resin-decor"], name: "Vases & Bottles",     slug: "vases",          sort_order: 3 },
  { category_id: catId["resin-decor"], name: "Planters",            slug: "planters",       sort_order: 4 },
  { category_id: catId["resin-decor"], name: "Figurines & Statues", slug: "figurines",      sort_order: 5 },
  { category_id: catId["resin-decor"], name: "Desk Organisers",     slug: "desk-organisers",sort_order: 6 },
  { category_id: catId["soy-candles"], name: "Jar Candles",         slug: "jar-candles",    sort_order: 1 },
  { category_id: catId["soy-candles"], name: "Tealight Holders",    slug: "tea-lights",     sort_order: 2 },
  { category_id: catId["soy-candles"], name: "Diffusers & Aroma",   slug: "diffusers",      sort_order: 3 },
];

const { data: existingSubs } = await supabase
  .from("subcategories").select("id, slug")
  .in("category_id", Object.values(catId));

const existingSlugs = new Set((existingSubs ?? []).map(s => s.slug));
const toInsert = wantedSubs.filter(s => !existingSlugs.has(s.slug));
if (toInsert.length) {
  const { error: subErr } = await supabase.from("subcategories").insert(toInsert);
  if (subErr) { console.error("  ❌  subcategories:", subErr.message); process.exit(1); }
}
// Also update existing subs to match new names/sort_order
for (const s of wantedSubs.filter(s => existingSlugs.has(s.slug))) {
  await supabase.from("subcategories").update({ name: s.name, sort_order: s.sort_order })
    .eq("slug", s.slug).eq("category_id", s.category_id);
}

const { data: allSubs } = await supabase.from("subcategories").select("id, slug").in("category_id", Object.values(catId));
const subId = Object.fromEntries(allSubs.map(s => [s.slug, s.id]));
console.log("  ✓", Object.keys(subId).join(", "));

// ── 4. Delete old placeholder products ───────────────────────────────────────

console.log("\n🗑   Removing old placeholder products…");
const OLD_SKUS = ["DC-TRAY-001","DC-COAST-001","DC-BOWL-001","DC-CAN-001","DC-PIL-001","DC-GIFT-001"];
const { data: oldProds } = await supabase.from("products").select("id").in("sku", OLD_SKUS);
if (oldProds?.length) {
  const ids = oldProds.map(p => p.id);
  await supabase.from("product_images").delete().in("product_id", ids);
  await supabase.from("product_variants").delete().in("product_id", ids);
  await supabase.from("products").delete().in("id", ids);
  console.log(`  ✓  Removed ${ids.length} old products`);
} else {
  console.log("  ✓  No old placeholders found");
}

// ── 5. Product definitions ────────────────────────────────────────────────────

console.log("\n📸  Uploading product images and seeding products…");
console.log("    (first run uploads ~90 images — this takes a few minutes)\n");

// Each entry: { sku, name, description, category, subcategory, is_bestseller, sort_order, images[], variants[] }
const PRODUCTS = [

  // ── TRAYS ──────────────────────────────────────────────────────────────────
  {
    sku: "DC-TRAY-BOW", name: "Bow Trinket Tray",
    description: "A dainty Eco-Resin trinket tray shaped like a decorative bow. Hand-poured in your choice of colour, perfect for holding rings, earrings, or small accessories on a vanity.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 101,
    images: ["Bow trays.png"],
    variants: [{ label: "Small", price: 799 }, { label: "Large", price: 1299 }],
  },
  {
    sku: "DC-TRAY-BUB", name: "Bubble Trinket Tray",
    description: "Soft bubble-shaped Eco-Resin trinket tray, handcrafted with a smooth finish. A playful and modern touch for any desk or dressing table.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 102,
    images: ["Bubble Trays.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1199 }],
  },
  {
    sku: "DC-TRAY-CLO", name: "Cloud Trinket Tray",
    description: "A whimsical cloud-shaped trinket tray in eco-resin. Light, airy, and totally unique — store your small treasures in style.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 103,
    images: ["Cloud Trinket Trays.png", "Cloud trays.png", "Cloud trays (1).png"],
    variants: [{ label: "Small", price: 599 }, { label: "Large", price: 999 }],
  },
  {
    sku: "DC-TRAY-FEA", name: "Feather Tray",
    description: "Elegant feather-shaped Eco-Resin tray with intricate surface detail. Handpoured and finished with a water-resistant coating — a striking piece for any bedside or vanity.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 104,
    images: ["Feather tray.png", "Feather tray (1).png"],
    variants: [{ label: "Small", price: 799 }, { label: "Large", price: 1299 }],
  },
  {
    sku: "DC-TRAY-LEA", name: "Leaf Trinket Tray",
    description: "A nature-inspired leaf-shaped trinket tray cast in premium eco-resin. Each vein and curve is hand-detailed, making every piece one of a kind.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 105,
    images: ["Leaf Trinket Trays.png"],
    variants: [{ label: "Small", price: 599 }, { label: "Large", price: 999 }],
  },
  {
    sku: "DC-TRAY-MAP", name: "Maple Leaf Tray",
    description: "A beautifully detailed maple-leaf Eco-Resin tray with realistic vein texture. Ideal as a jewellery catch-all or a thoughtful gift for nature lovers.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 106,
    images: ["Maple leaf tray.png", "Maple leaf tray (1).png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-TRAY-SFI", name: "Starfish Tray",
    description: "A coastal-inspired starfish-shaped Eco-Resin tray. Bring a touch of the sea to your space.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 107,
    images: ["Star fish tray.png", "Star fish tray (1).png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1199 }],
  },
  {
    sku: "DC-TRAY-VIC", name: "Victorian Trinket Tray",
    description: "An ornate Victorian-style Eco-Resin trinket tray with decorative border detailing. Handcrafted to add a classic, elegant touch to any dressing table.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 108,
    images: ["Victorian trinket trays.png"],
    variants: [{ label: "Small", price: 799 }, { label: "Large", price: 1299 }],
  },
  {
    sku: "DC-TRAY-CON", name: "Conch Shell Trinket Tray",
    description: "A graceful conch-shell Eco-Resin tray with smooth curves and a natural, sea-inspired silhouette. Perfect for rings, earrings, or a candle holder.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 109,
    images: ["Conch Trinket Trays.png", "Conch Trinket.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-TRAY-TUR", name: "Turtle Tray Set",
    description: "A charming set of turtle-shaped Eco-Resin trinket trays — a large mother turtle and smaller turtles for nesting your accessories. Great as a gift set.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 110,
    images: ["Turtle Tray.png", "Turtle set.png"],
    variants: [{ label: "Single Tray", price: 999 }],
  },
  {
    sku: "DC-TRAY-MYS", name: "Mystic Shell Tray",
    description: "An abstract shell-inspired Eco-Resin tray with a mystical, ocean-meets-fantasy aesthetic.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 111,
    images: ["Mystic shell trays.png"],
    variants: [{ label: "Small", price: 799 }, { label: "Large", price: 1299 }],
  },
  {
    sku: "DC-TRAY-SHE", name: "Shell Trinket Tray",
    description: "A scallop-shell shaped Eco-Resin tray — an elegant bedside or vanity organiser for your everyday jewellery.",
    category: "resin-decor", subcategory: "trays", is_bestseller: true, sort_order: 112,
    images: ["Shell Trinket Tray.png", "ChatGPT Image Jun 3, 2026, 04_53_57 PM.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-TRAY-LEL", name: "Leather Look Tray",
    description: "A sophisticated Eco-Resin tray with a realistic leather-look texture — sleek, modern, and perfect for a desk or nightstand.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 113,
    images: ["Leather look trays.png", "Leather look trays (1).png"],
    variants: [{ label: "Small", price: 899 }, { label: "Large", price: 1499 }],
  },
  {
    sku: "DC-TRAY-HAL", name: "Half Moon Tray",
    description: "A minimalist half-moon Eco-Resin tray — clean lines, smooth finish, and endlessly versatile. Style it on a shelf, vanity, or coffee table.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 114,
    images: ["Half moon tray (2).png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-TRAY-TEX", name: "Texture Tray",
    description: "Organic oval Eco-Resin tray with a beautiful marble or block-colour finish. Each piece is individually poured, so colours and patterns vary slightly.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 115,
    images: ["Texture trays.png", "Texture trays (1).png", "ChatGPT Image Jun 2, 2026, 04_50_47 PM.png"],
    variants: [{ label: "Small", price: 899 }, { label: "Large", price: 1499 }],
  },
  {
    sku: "DC-TRAY-HRT", name: "Heart Tray",
    description: "A beautiful heart-shaped Eco-Resin tray with a striking heart-grid pattern. Styled with gold jewellery, it makes the most romantic gift.",
    category: "resin-decor", subcategory: "trays", is_bestseller: true, sort_order: 116,
    images: ["file_000000002c4c7208974e547478e6923a.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-TRAY-FLH", name: "Flower & Heart Tray",
    description: "A delicate trinket tray combining floral and heart motifs. Perfect for gifting or as a sweet addition to your vanity.",
    category: "resin-decor", subcategory: "trays", is_bestseller: false, sort_order: 117,
    images: ["Flower & heart trays.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },

  // ── COASTERS ───────────────────────────────────────────────────────────────
  {
    sku: "DC-COAS-MAR", name: "Marble Beaded Coasters",
    description: "Elegant marble-pattern beaded Eco-Resin coasters — each set is a miniature work of art for your coffee table.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: true, sort_order: 201,
    images: ["ChatGPT Image Jun 2, 2026, 04_48_45 PM.png"],
    variants: [{ label: "Set of 4", price: 699 }, { label: "Set of 6", price: 999 }],
  },
  {
    sku: "DC-COAS-WAV", name: "Wavy Coasters",
    description: "Fluid wavy-edged Eco-Resin coasters with a smooth, heat-resistant finish — a beautiful everyday upgrade.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 202,
    images: ["Wavy coasters.png", "Multiple wavy coasters.png"],
    variants: [{ label: "Set of 4", price: 599 }, { label: "Set of 6", price: 899 }],
  },
  {
    sku: "DC-COAS-MAN", name: "Mandala Coasters",
    description: "Intricate mandala-pattern Eco-Resin coasters. Hand-detailed with geometric precision — a centrepiece for any table.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: true, sort_order: 203,
    images: ["Mandala coasters.png"],
    variants: [{ label: "Set of 4", price: 699 }, { label: "Set of 6", price: 1099 }],
  },
  {
    sku: "DC-COAS-EVI", name: "Evil Eye Coasters",
    description: "Protective and beautiful — these evil eye motif Eco-Resin coasters add a spiritual, boho touch to your home. Heat-resistant and easy to clean.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 204,
    images: ["Evil eye coasters.png"],
    variants: [{ label: "Set of 4", price: 699 }, { label: "Set of 6", price: 1099 }],
  },
  {
    sku: "DC-COAS-HEX", name: "Hexagon Coasters",
    description: "Modern hexagonal Eco-Resin coasters with a geometric edge — minimal, stylish, and fully customisable in colour and finish.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 205,
    images: ["Hexagon coasters.png"],
    variants: [{ label: "Set of 4", price: 599 }, { label: "Set of 6", price: 899 }],
  },
  {
    sku: "DC-COAS-OCE", name: "Ocean Theme Coasters",
    description: "Deep ocean-inspired Eco-Resin coasters — every coaster captures the motion of the sea in miniature.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 206,
    images: ["Ocean theme coasters.png"],
    variants: [{ label: "Set of 4", price: 699 }, { label: "Set of 6", price: 1099 }],
  },
  {
    sku: "DC-COAS-REC", name: "Rectangle Arched Coasters",
    description: "Rectangle Eco-Resin coasters with a subtle arched top — a sleek, modern form that works with any interior style.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 207,
    images: ["Rectangle arched coasters.png"],
    variants: [{ label: "Set of 4", price: 599 }, { label: "Set of 6", price: 899 }],
  },
  {
    sku: "DC-COAS-BLU", name: "Blue Coasters",
    description: "Serene Eco-Resin coasters — handpoured with smooth, swirling colour blends for a calming table setting.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 208,
    images: ["Blue coasters.png"],
    variants: [{ label: "Set of 4", price: 599 }, { label: "Set of 6", price: 899 }],
  },
  {
    sku: "DC-COAS-OVA", name: "Oval Arch Coaster",
    description: "Smooth oval arch Eco-Resin coasters with a clean, contemporary silhouette. A subtle, refined choice for everyday use.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 209,
    images: ["Oval arch coaster.png"],
    variants: [{ label: "Set of 4", price: 599 }, { label: "Set of 6", price: 899 }],
  },
  {
    sku: "DC-COAS-COF", name: "Coffee & Books Coaster",
    description: "A charming Eco-Resin coaster for the book lover — personalised with a coffee-and-books motif. The perfect desk companion.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 210,
    images: ["Coffee & Books coaster.png"],
    variants: [{ label: "Set of 2", price: 699 }, { label: "Set of 4", price: 1099 }],
  },
  {
    sku: "DC-COAS-STA", name: "Coaster with Stand",
    description: "A complete coaster set with a matching Eco-Resin stand — keep your table organised and your coasters on display between uses.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 211,
    images: ["coaster with stand.png"],
    variants: [{ label: "Set of 4 + Stand", price: 799 }, { label: "Set of 6 + Stand", price: 1199 }],
  },
  {
    sku: "DC-COAS-MUL", name: "Mixed Coaster Set",
    description: "A curated mixed set of Eco-Resin coasters in complementary colours and finishes — ideal as a housewarming or wedding gift.",
    category: "resin-decor", subcategory: "coasters", is_bestseller: false, sort_order: 212,
    images: ["Multiple coasters (2).png"],
    variants: [{ label: "Set of 6", price: 899 }, { label: "Set of 8", price: 1299 }],
  },

  // ── VASES ──────────────────────────────────────────────────────────────────
  {
    sku: "DC-VASE-RIB", name: "Ribbed Vase",
    description: "A textured ribbed Eco-Resin vase with a tactile, sculptural quality. Stunning as a standalone piece or filled with dried botanicals.",
    category: "resin-decor", subcategory: "vases", is_bestseller: true, sort_order: 301,
    images: ["Ribbed Vases.png", "Ribbed vase.png"],
    variants: [{ label: "Small (15 cm)", price: 599 }, { label: "Large (25 cm)", price: 1199 }],
  },
  {
    sku: "DC-VASE-SPI", name: "Spiral Vase",
    description: "A graceful spiral-form Eco-Resin vase — the twisting silhouette creates beautiful shadow play in natural light. A true statement piece.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 302,
    images: ["Spiral Vases.png", "Spiral vases (2).png"],
    variants: [{ label: "Small (15 cm)", price: 699 }, { label: "Large (25 cm)", price: 1299 }],
  },
  {
    sku: "DC-VASE-DON", name: "Donut Vase",
    description: "A quirky donut-shaped Eco-Resin vase with a wide opening for blooms or dried stems. Playful, modern, and entirely handmade.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 303,
    images: ["Donut vases.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-VASE-TES", name: "Test Tube Vase",
    description: "A cluster of slim test-tube Eco-Resin vases on a shared base — perfect for single-stem flowers, air plants, or as a desk ornament.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 304,
    images: ["Test tube vases.png"],
    variants: [{ label: "Set of 3", price: 599 }, { label: "Set of 5", price: 999 }],
  },
  {
    sku: "DC-VASE-FIN", name: "Fingers Vase",
    description: "An artistic hand-shaped Eco-Resin vase — slender fingers form the vessel, making this as much a sculpture as a functional piece.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 305,
    images: ["Fingers vase.png"],
    variants: [{ label: "Single", price: 799 }, { label: "Set of 2", price: 1299 }],
  },
  {
    sku: "DC-VASE-PIN", name: "Pine Cone Vase",
    description: "A textured pine-cone Eco-Resin vase that blends nature and craft. The scaled surface catches light beautifully — a unique décor accent.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 306,
    images: ["pine cone vase.png"],
    variants: [{ label: "Small (12 cm)", price: 699 }, { label: "Large (20 cm)", price: 1099 }],
  },
  {
    sku: "DC-VASE-SUN", name: "Sunflower Vase",
    description: "A sunflower-inspired Eco-Resin vase with petal-moulded details — cheerful, handmade, and perfect for a window sill or kitchen shelf.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 307,
    images: ["sunflower vase.png"],
    variants: [{ label: "Small (15 cm)", price: 699 }, { label: "Large (22 cm)", price: 1099 }],
  },
  {
    sku: "DC-VASE-RSN", name: "Ribbed Small Neck Vase",
    description: "A compact ribbed Eco-Resin vase with a narrow neck — ideal for a single dried stem or as part of a shelfie arrangement.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 308,
    images: ["Ribbed small neck vase.png"],
    variants: [{ label: "Single", price: 599 }, { label: "Set of 2", price: 999 }],
  },
  {
    sku: "DC-VASE-MBL", name: "Marble & Block Colour Vase",
    description: "A versatile Eco-Resin vase available in either a swirling marble finish or a solid block colour — choose your palette to match your space.",
    category: "resin-decor", subcategory: "vases", is_bestseller: false, sort_order: 309,
    images: ["Marble and Block colors.png"],
    variants: [{ label: "Small (15 cm)", price: 699 }, { label: "Large (25 cm)", price: 1299 }],
  },

  // ── PLANTERS ───────────────────────────────────────────────────────────────
  {
    sku: "DC-PLAN-GEN", name: "Decorative Resin Planter",
    description: "A smooth, handpoured Eco-Resin planter in your choice of colour — perfect for succulents, cacti, or trailing plants. Durable and water-resistant.",
    category: "resin-decor", subcategory: "planters", is_bestseller: false, sort_order: 401,
    images: ["Planters.png"],
    variants: [{ label: "Small (10 cm)", price: 799 }, { label: "Large (16 cm)", price: 1499 }],
  },
  {
    sku: "DC-PLAN-TRE", name: "Tree Stump Planter",
    description: "A charming tree-stump Eco-Resin planter with a realistic wood-grain texture. A playful nature-themed home for your favourite plant.",
    category: "resin-decor", subcategory: "planters", is_bestseller: false, sort_order: 402,
    images: ["Tree stump planter.png"],
    variants: [{ label: "Small (10 cm)", price: 899 }, { label: "Large (16 cm)", price: 1499 }],
  },
  {
    sku: "DC-PLAN-LAD", name: "Lady Face Planter",
    description: "A sculpted lady-face Eco-Resin planter — the flower crown opening holds succulents, air plants, or dried blooms.",
    category: "resin-decor", subcategory: "planters", is_bestseller: true, sort_order: 403,
    images: ["ChatGPT Image Jun 5, 2026, 02_29_40 PM.png", "ChatGPT Image Jun 5, 2026, 02_42_24 PM.png"],
    variants: [{ label: "Single", price: 999 }],
  },
  {
    sku: "DC-PLAN-CUP", name: "Cupped Hands Planter",
    description: "Two cupped hands cast in smooth Eco-Resin — a poetic planter for air plants, pebbles, or small succulents. A truly meaningful gift.",
    category: "resin-decor", subcategory: "planters", is_bestseller: false, sort_order: 404,
    images: ["ChatGPT Image Jun 5, 2026, 03_36_28 PM.png", "ChatGPT Image Jun 5, 2026, 03_36_28 PM (1).png"],
    variants: [{ label: "Single", price: 999 }, { label: "Set of 2", price: 1799 }],
  },

  // ── FIGURINES ──────────────────────────────────────────────────────────────
  {
    sku: "DC-FIG-LST", name: "Lady Statue",
    description: "An elegant slim lady statue in matte Eco-Resin — minimal and modern, perfect for a shelf, mantle, or console table.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 501,
    images: ["Lady statue.png"],
    variants: [{ label: "Small (15 cm)", price: 899 }, { label: "Large (25 cm)", price: 1699 }],
  },
  {
    sku: "DC-FIG-CST", name: "Couple Statue",
    description: "A romantic couple figurine in smooth Eco-Resin — a timeless symbol of love, perfect as a wedding, anniversary, or Valentine's gift.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: true, sort_order: 502,
    images: ["Couple statue.png"],
    variants: [{ label: "Small (15 cm)", price: 1199 }, { label: "Large (25 cm)", price: 1999 }],
  },
  {
    sku: "DC-FIG-BFL", name: "Blindfold Lady",
    description: "A serene Eco-Resin sculpture of a blindfolded lady — capturing stillness, intuition, and inner vision. A thought-provoking art piece for any room.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 503,
    images: ["Blind fold lady.png"],
    variants: [{ label: "Small (15 cm)", price: 799 }, { label: "Large (25 cm)", price: 1299 }],
  },
  {
    sku: "DC-FIG-LHG", name: "Long Haired Girl",
    description: "A graceful long-haired girl Eco-Resin figurine — flowing hair, gentle pose, and a serene expression. A beautiful sculptural gift for her.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 504,
    images: ["Long haired girl.png"],
    variants: [{ label: "Small (15 cm)", price: 799 }, { label: "Large (25 cm)", price: 1299 }],
  },
  {
    sku: "DC-FIG-LDS", name: "Ladies Set",
    description: "A curated set of lady figurines in complementary poses — perfect as a shelf arrangement or gifted as a group for a collector.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 505,
    images: ["Ladies.png"],
    variants: [{ label: "Set of 2", price: 999 }, { label: "Set of 3", price: 1699 }],
  },
  {
    sku: "DC-FIG-ABL", name: "Abstract Lady",
    description: "A minimalist abstract lady Eco-Resin figurine — smooth curves and a clean silhouette that fits effortlessly into modern or Scandi-inspired interiors.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 506,
    images: ["Lady.png"],
    variants: [{ label: "Small (15 cm)", price: 799 }, { label: "Large (25 cm)", price: 1299 }],
  },
  {
    sku: "DC-FIG-ABF", name: "Abstract Faces",
    description: "A set of abstract face Eco-Resin sculptures inspired by modern art — expressive, minimalist, and endlessly conversation-worthy.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 507,
    images: ["Abstract faces.png"],
    variants: [{ label: "Set of 2", price: 799 }, { label: "Set of 3", price: 1299 }],
  },
  {
    sku: "DC-FIG-TED", name: "3D Teddy Bear",
    description: "A three-dimensional Eco-Resin teddy bear — chunky, adorable, and fully handmade. A sweet gift for a child's room or a nostalgic adult.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 508,
    images: ["3D teddy Bear (1).png"],
    variants: [{ label: "Small (10 cm)", price: 899 }, { label: "Large (18 cm)", price: 1499 }],
  },
  {
    sku: "DC-FIG-BAL", name: "Balloon Dogs",
    description: "Playful Eco-Resin balloon-dog figurines inspired by Jeff Koons — bold, colourful, and a delightful pop-art accent for any shelf.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 509,
    images: ["Balloon Dogs.png"],
    variants: [{ label: "Small (10 cm)", price: 799 }, { label: "Large (18 cm)", price: 1299 }],
  },
  {
    sku: "DC-FIG-LAF", name: "La Familia",
    description: "A touching family figurine set in smooth Eco-Resin — parents and children in a warm embrace. The ultimate heartfelt gift for a family.",
    category: "resin-decor", subcategory: "figurines", is_bestseller: false, sort_order: 510,
    images: ["La familia.png"],
    variants: [{ label: "Set of 3", price: 1299 }, { label: "Set of 5", price: 2199 }],
  },

  // ── DESK ORGANISERS ────────────────────────────────────────────────────────
  {
    sku: "DC-ORG-RIN", name: "Rings Stand",
    description: "A sleek Eco-Resin ring stand — keep your rings, bracelets, and small earrings neatly displayed and easy to reach.",
    category: "resin-decor", subcategory: "desk-organisers", is_bestseller: false, sort_order: 601,
    images: ["Rings stand.png"],
    variants: [{ label: "Single", price: 499 }, { label: "Set of 2", price: 799 }],
  },
  {
    sku: "DC-ORG-JEF", name: "Jewelry Frames",
    description: "A wall-mountable or standing Eco-Resin jewellery frame with hooks for necklaces and earrings — declutter your dressing table beautifully.",
    category: "resin-decor", subcategory: "desk-organisers", is_bestseller: false, sort_order: 602,
    images: ["Jewelry frames.png"],
    variants: [{ label: "Small", price: 699 }, { label: "Large", price: 1099 }],
  },
  {
    sku: "DC-ORG-JEO", name: "Jewelry Organiser",
    description: "A multi-compartment Eco-Resin jewellery organiser — trays, hooks, and slots for rings, earrings, bracelets, and more, all in one elegant piece.",
    category: "resin-decor", subcategory: "desk-organisers", is_bestseller: false, sort_order: 603,
    images: ["Jewelry organiser.png"],
    variants: [{ label: "Compact", price: 799 }, { label: "Full Size", price: 1299 }],
  },
  {
    sku: "DC-ORG-DSK", name: "Desk Organiser",
    description: "A handcrafted Eco-Resin desk organiser with compartments for pens, cards, and stationery — elevate your workspace with something truly unique.",
    category: "resin-decor", subcategory: "desk-organisers", is_bestseller: false, sort_order: 604,
    images: ["Desk organiser.png"],
    variants: [{ label: "Compact", price: 899 }, { label: "Large", price: 1499 }],
  },

  // ── JAR CANDLES ────────────────────────────────────────────────────────────
  {
    sku: "DC-CAN-CON", name: "Constellation Candle Jar",
    description: "Soy wax candles in embossed constellation jars. Burn time up to 50 hours. A gift that lights up the room.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: true, sort_order: 701,
    images: ["ChatGPT Image Jun 6, 2026, 10_45_22 PM.png", "ChatGPT Image Jun 6, 2026, 10_45_22 PM (1).png"],
    variants: [
      { label: "100 g (≈ 25 hr)", price: 349 },
      { label: "200 g (≈ 50 hr)", price: 599 },
      { label: "300 g (≈ 80 hr)", price: 849 },
    ],
  },
  {
    sku: "DC-CAN-MAR", name: "Marble Sphere Candle",
    description: "Hand-poured soy wax sphere candles in a stunning marble finish, displayed on a matching oblong Eco-Resin tray. A statement centrepiece.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: true, sort_order: 702,
    images: ["ChatGPT Image Jun 7, 2026, 12_30_31 PM.png", "ChatGPT Image Jun 7, 2026, 12_30_31 PM (1).png"],
    variants: [{ label: "Single Sphere", price: 499 }, { label: "Duo Set + Tray", price: 999 }],
  },
  {
    sku: "DC-CAN-MAN", name: "Mandala Candle Jar",
    description: "Soy wax jar candles with hand-etched mandala motifs. Pair beautifully with the matching mandala coasters.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 703,
    images: ["ChatGPT Image Jun 6, 2026, 10_56_19 PM.png", "ChatGPT Image Jun 6, 2026, 10_56_19 PM (1).png"],
    variants: [
      { label: "100 g (≈ 25 hr)", price: 399 },
      { label: "200 g (≈ 50 hr)", price: 699 },
    ],
  },
  {
    sku: "DC-CAN-MUS", name: "Handmade Mushroom Soy Candle Jar",
    description: "A whimsical mushroom-shaped soy wax candle jar — cute, clean-burning, and purely handmade. A perfect desk companion or gift for a nature lover.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 704,
    images: ["Handmade Mushroom Soy Candle Jar.jpeg"],
    variants: [
      { label: "Small (80 g)", price: 399 },
      { label: "Large (160 g)", price: 699 },
    ],
  },
  {
    sku: "DC-CAN-DAI", name: "Daisy Flower Jar Candle",
    description: "A daisy-shaped soy wax candle jar — cheerful, fragrant, and handpoured. Fills any room with warmth and a sweet floral scent.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 705,
    images: ["Daisy flower jar.png"],
    variants: [{ label: "100 g", price: 349 }, { label: "200 g", price: 599 }],
  },
  {
    sku: "DC-CAN-FLJ", name: "Flower Jar Candle",
    description: "A botanical flower-embellished soy wax jar candle — the sculptural bloom lid doubles as a beautiful decorative element even after the candle is spent.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 706,
    images: ["Flower Jar candle.png"],
    variants: [{ label: "100 g", price: 349 }, { label: "200 g", price: 599 }],
  },
  {
    sku: "DC-CAN-LOT", name: "Lotus Candle",
    description: "A hand-sculpted lotus soy wax candle — delicate petals bloom as the candle burns. Meditative, serene, and entirely one of a kind.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 707,
    images: ["Lotus candle.png"],
    variants: [{ label: "Small", price: 399 }, { label: "Large", price: 699 }],
  },
  {
    sku: "DC-CAN-SEA", name: "Sea Theme Candle",
    description: "Ocean-inspired soy wax candles with seashell and wave motifs — the perfect gift for anyone who loves the sea.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 708,
    images: ["Sea Theme Candle.png"],
    variants: [{ label: "100 g", price: 399 }, { label: "200 g", price: 699 }],
  },
  {
    sku: "DC-CAN-VIN", name: "Vintage Jar Candle",
    description: "Soy wax candle in a textured vintage-style Eco-Resin jar — classic, warm, and beautifully made. The jar becomes a keepsake long after the candle is finished.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 709,
    images: ["Vintage Jar.png", "Vintage Jar (1).png"],
    variants: [{ label: "100 g (≈ 25 hr)", price: 449 }, { label: "200 g (≈ 50 hr)", price: 749 }],
  },
  {
    sku: "DC-CAN-CAR", name: "Carousel Jar Candle",
    description: "A soy wax candle in a ribbed carousel-style Eco-Resin jar with a lid — elegant, gift-ready, and available in multiple scents.",
    category: "soy-candles", subcategory: "jar-candles", is_bestseller: false, sort_order: 710,
    images: ["Carousel Jar.png", "Carousel Jar (1).png"],
    variants: [{ label: "100 g (≈ 25 hr)", price: 449 }, { label: "200 g (≈ 50 hr)", price: 749 }],
  },

  // ── TEALIGHT HOLDERS ───────────────────────────────────────────────────────
  {
    sku: "DC-TEA-CUS", name: "Cushion Tealight Holder",
    description: "Smooth pebble-shaped Eco-Resin tealight holder with a matte finish for a soft, natural ambiance. Minimalist and beautiful.",
    category: "soy-candles", subcategory: "tea-lights", is_bestseller: false, sort_order: 801,
    images: ["Cushion tealight.png", "ChatGPT Image Jun 3, 2026, 11_46_41 AM.png"],
    variants: [{ label: "Single", price: 299 }],
  },
  {
    sku: "DC-TEA-HOL", name: "Tealight Holder",
    description: "A classic Eco-Resin tealight holder — clean lines, smooth finish, and a warm amber glow when lit. Available in a range of colours.",
    category: "soy-candles", subcategory: "tea-lights", is_bestseller: false, sort_order: 802,
    images: ["Tealight holder.png"],
    variants: [{ label: "Single", price: 299 }, { label: "Set of 4", price: 499 }],
  },
  {
    sku: "DC-TEA-GEO", name: "Geometric Tealight Holder",
    description: "Angular geometric Eco-Resin tealight holder — sharp facets create a dramatic pattern of light and shadow when lit. A modern décor statement.",
    category: "soy-candles", subcategory: "tea-lights", is_bestseller: false, sort_order: 803,
    images: ["Geometric tealight holder.png"],
    variants: [{ label: "Single", price: 399 }],
  },
  {
    sku: "DC-TEA-POT", name: "Tealight Pot & Tray Set",
    description: "A coordinated tealight pot and matching Eco-Resin tray — light the pot, place it on the tray, and create an instant centrepiece.",
    category: "soy-candles", subcategory: "tea-lights", is_bestseller: false, sort_order: 804,
    images: ["Tealight Pot and Tray.png"],
    variants: [{ label: "Single Set", price: 499 }, { label: "Pair + Tray", price: 799 }],
  },

  // ── DIFFUSERS ──────────────────────────────────────────────────────────────
  {
    sku: "DC-DIF-CAR", name: "Carnation Diffuser",
    description: "Handmade carnation-shaped Eco-Resin aroma diffuser cards — heart, hibiscus, butterfly, flower, and shell designs. Add a few drops of essential oil and let your space breathe.",
    category: "soy-candles", subcategory: "diffusers", is_bestseller: false, sort_order: 901,
    images: ["Carnation diffuser.png", "8614450a-771c-4037-8a6d-61920e30208a.png"],
    variants: [
      { label: "Set of 3 (+ 10 ml oil)", price: 499 },
      { label: "Set of 5 (+ 10 ml oil)", price: 799 },
    ],
  },
  {
    sku: "DC-DIF-FLT", name: "Carnation Flower Tray with Essential Oil",
    description: "A full carnation diffuser set — a sculptural flower-shaped Eco-Resin tray with a hand-sculpted carnation, paired with a 10 ml lavender essential oil bottle.",
    category: "soy-candles", subcategory: "diffusers", is_bestseller: false, sort_order: 902,
    images: ["ChatGPT Image Jun 5, 2026, 05_33_14 PM.png", "ChatGPT Image Jun 5, 2026, 05_35_16 PM.png"],
    variants: [
      { label: "Single Flower + 10 ml Oil", price: 599 },
      { label: "Duo Flowers + 10 ml Oil",   price: 999 },
    ],
  },

  // ── GIFT COMBOS ────────────────────────────────────────────────────────────
  {
    sku: "DC-COM-001", name: "Gift Combo Set 1",
    description: "A thoughtfully curated Dreamcraft gift combo — combining our best-loved Eco-Resin décor pieces and soy wax candles in a beautiful presentation box.",
    category: "gifts", subcategory: null, is_bestseller: false, sort_order: 1001,
    images: ["Combo1.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-002", name: "Gift Combo Set 2",
    description: "A lovingly assembled Dreamcraft gift combo with handpicked Eco-Resin and candle pieces — perfect for birthdays, housewarmings, or just because.",
    category: "gifts", subcategory: null, is_bestseller: false, sort_order: 1002,
    images: ["Combo 2.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-003", name: "Gift Combo Set 3",
    description: "A Dreamcraft combo set featuring complementary Eco-Resin décor and candle pieces — makes gifting effortless and beautiful.",
    category: "gifts", subcategory: null, is_bestseller: false, sort_order: 1003,
    images: ["Combo 3.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-004", name: "Gift Combo Set 4",
    description: "A curated Dreamcraft gift combo — handpicked Eco-Resin and candle pieces presented together for a ready-to-gift experience.",
    category: "gifts", subcategory: null, is_bestseller: false, sort_order: 1004,
    images: ["combo 4.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-005", name: "Gift Combo Set 5",
    description: "Dreamcraft at its best — a carefully chosen set of handmade Eco-Resin and candle pieces for someone you love.",
    category: "gifts", subcategory: null, is_bestseller: false, sort_order: 1005,
    images: ["combo 5.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-006", name: "Gift Combo Set 6",
    description: "A premium Dreamcraft gift combo with a selection of our most popular Eco-Resin décor and candle pieces — wrapped and ready to delight.",
    category: "gifts", subcategory: null, is_bestseller: true, sort_order: 1006,
    images: ["combo 6.png"],
    variants: [{ label: "Standard", price: 1099 }, { label: "Premium", price: 1699 }],
  },
  {
    sku: "DC-COM-007", name: "Gift Combo Set 7",
    description: "The ultimate Dreamcraft gift set — a generous selection of handmade pieces spanning Eco-Resin décor and soy candles. For the person who deserves the very best.",
    category: "gifts", subcategory: null, is_bestseller: true, sort_order: 1007,
    images: ["combo 7.png"],
    variants: [{ label: "Standard", price: 1299 }, { label: "Deluxe", price: 1999 }],
  },
  {
    sku: "DC-COM-RIB", name: "Ribbed Essentials Gift Set",
    description: "A beautifully cohesive set: a ribbed vase, two ribbed jar candles, and a shell trinket tray. The perfect all-in-one lifestyle gift.",
    category: "gifts", subcategory: null, is_bestseller: true, sort_order: 1008,
    images: ["ChatGPT Image Jun 2, 2026, 04_49_41 PM.png"],
    variants: [{ label: "Standard Set", price: 1499 }, { label: "Deluxe Set", price: 1999 }],
  },
];

// ── 6. Upsert products + images + variants ────────────────────────────────────

let totalInserted = 0;
let totalImages   = 0;

for (const p of PRODUCTS) {
  process.stdout.write(`\n  📦 ${p.name} (${p.sku})\n`);

  // a) Upload images
  const uploadedUrls = [];
  for (const filename of p.images) {
    const url = await img(p.sku.toLowerCase(), filename);
    if (url) uploadedUrls.push(url);
  }

  // b) Upsert product row
  const productRow = {
    name:         p.name,
    sku:          p.sku,
    description:  p.description,
    category_id:  catId[p.category],
    subcategory_id: p.subcategory ? (subId[p.subcategory] ?? null) : null,
    is_active:    true,
    is_bestseller:p.is_bestseller,
    sort_order:   p.sort_order,
  };

  const { data: prodRows, error: prodErr } = await supabase
    .from("products")
    .upsert(productRow, { onConflict: "sku", ignoreDuplicates: false })
    .select("id, sku");

  if (prodErr) {
    console.error(`    ❌  product upsert: ${prodErr.message}`);
    continue;
  }

  const productId = prodRows[0].id;
  totalInserted++;

  // c) Replace variants
  await supabase.from("product_variants").delete().eq("product_id", productId);
  const { error: varErr } = await supabase.from("product_variants").insert(
    p.variants.map(v => ({ product_id: productId, label: v.label, price: v.price }))
  );
  if (varErr) console.error(`    ❌  variants: ${varErr.message}`);

  // d) Replace images
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (uploadedUrls.length) {
    const { error: imgErr } = await supabase.from("product_images").insert(
      uploadedUrls.map((url, i) => ({ product_id: productId, url, sort_order: i }))
    );
    if (imgErr) console.error(`    ❌  images: ${imgErr.message}`);
    else totalImages += uploadedUrls.length;
  }

  process.stdout.write(`    ✓  ${uploadedUrls.length} image(s), ${p.variants.length} variant(s)\n`);
}

// ── 7. Upload and upsert logo in banners bucket ───────────────────────────────

console.log("\n🖼   Uploading logo to storage…");
const logoUrl = await uploadFile(
  "banners",
  "brand/logo.jpg",
  resolve(ROOT, "assets", "For Website", "Playful Dreamcraft Logo with Fairy and Decor_20260324_130426_0000.jpg")
);
if (logoUrl) console.log("  ✓  Logo:", logoUrl);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log(`\n✅  Seed complete! ${totalInserted} products, ${totalImages} images uploaded.\n`);
