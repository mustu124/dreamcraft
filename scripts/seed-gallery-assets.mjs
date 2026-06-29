/**
 * Uploads all product/candle images from assets/For Website/ to the
 * Supabase `gallery` bucket and inserts them into the gallery_images table.
 *
 * Safe to run multiple times — clears and re-seeds the table each run.
 *
 * Usage: node scripts/seed-gallery-assets.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { extname, join, basename } from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL        = "https://skfenguqikdmrwbefntt.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrZmVuZ3VxaWtkbXJ3YmVmbnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYyMTM5NiwiZXhwIjoyMDk4MTk3Mzk2fQ.E9aqwxM2OoYyg_jOHkx_NUPef2O1iBweze_7vL9RI00";

const ASSETS_DIR = new URL("../assets/For%20Website/", import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, "$1")  // fix Windows path
  .replace(/%20/g, " ");            // decode URL-encoded spaces

const BUCKET = "gallery";
const STORAGE_PREFIX = "assets";

// Files to exclude from gallery
const EXCLUDE_PATTERNS = [
  /Playful Dreamcraft Logo/i,  // logo
  /^1000242069_/,              // random photo
];

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Caption map for ChatGPT-generated candle images
function makeCaption(filename) {
  const name = basename(filename, extname(filename));

  if (/^ChatGPT Image/i.test(name)) {
    return "Handcrafted Soy Candle";
  }
  if (/^8614450a|^file_/i.test(name)) {
    return "Dreamcraft Creation";
  }

  return name
    .replace(/\s*\(\d+\)\s*$/, "")    // remove trailing (1), (2) etc.
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

console.log("📁 Reading assets from:", ASSETS_DIR);

const allFiles = readdirSync(ASSETS_DIR);
const imageFiles = allFiles.filter((f) => {
  const ext = extname(f).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  return !EXCLUDE_PATTERNS.some((p) => p.test(f));
});

console.log(`📸 Found ${imageFiles.length} images to process (${allFiles.length - imageFiles.length} excluded)`);

// ── 1. Clear existing gallery_images ─────────────────────────────────────────

console.log("\n🗑️  Clearing existing gallery_images…");
const { error: delErr } = await db
  .from("gallery_images")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
if (delErr) {
  console.error("Failed to clear gallery_images:", delErr.message);
  process.exit(1);
}
console.log("   ✓ Cleared");

// ── 2. Upload images + collect rows ──────────────────────────────────────────

const rows = [];
let uploaded = 0;
let skipped  = 0;

for (let i = 0; i < imageFiles.length; i++) {
  const filename = imageFiles[i];
  const filepath = join(ASSETS_DIR, filename);
  const ext      = extname(filename).toLowerCase();

  // Sanitise storage path: lowercase, spaces → hyphens, keep extension
  const storageName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
  const storagePath = `${STORAGE_PREFIX}/${storageName}`;

  const contentType = ext === ".jpg" || ext === ".jpeg"
    ? "image/jpeg"
    : ext === ".png"
    ? "image/png"
    : "image/webp";

  process.stdout.write(`  [${i + 1}/${imageFiles.length}] ${filename.slice(0, 55).padEnd(55)} `);

  try {
    const fileBuffer = readFileSync(filepath);
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (upErr) {
      console.log("✗ Upload failed:", upErr.message);
      skipped++;
      continue;
    }

    const { data: { publicUrl } } = db.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    rows.push({
      image_url:  publicUrl,
      caption:    makeCaption(filename),
      sort_order: i + 1,
      is_active:  true,
    });

    console.log("✓");
    uploaded++;

  } catch (err) {
    console.log("✗ Error:", err.message);
    skipped++;
  }
}

// ── 3. Insert gallery_images rows ─────────────────────────────────────────────

console.log(`\n💾 Inserting ${rows.length} rows into gallery_images…`);

// Insert in batches of 50
const BATCH = 50;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error: insErr } = await db.from("gallery_images").insert(batch);
  if (insErr) {
    console.error(`  ✗ Batch ${Math.floor(i / BATCH) + 1} failed:`, insErr.message);
  } else {
    inserted += batch.length;
    console.log(`  ✓ Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} rows`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n─────────────────────────────────────────────────");
console.log(`✅ Done!`);
console.log(`   Uploaded : ${uploaded}`);
console.log(`   Skipped  : ${skipped}`);
console.log(`   DB rows  : ${inserted}`);
console.log("─────────────────────────────────────────────────");
