/**
 * Re-compresses every image already in Supabase Storage and creates the
 * smaller w960/ and w480/ copies the site loads (see lib/images/variants.ts).
 *
 * Files are overwritten in place so the URLs saved in the database keep
 * working. Each original is first saved to the backup folder, and a file that
 * already has its copies is skipped, so the script is safe to re-run — do so
 * after any seed script, since those upload unoptimized files.
 *
 * Usage:
 *   npx tsx scripts/optimize-storage.mts --dry-run     # report only
 *   npx tsx scripts/optimize-storage.mts               # back up + optimize
 *   npx tsx scripts/optimize-storage.mts --backup-dir D:/some/folder
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { buildImageSet } from "../lib/images/optimize";
import {
  CACHE_SECONDS, IMAGE_BUCKETS, VARIANT_WIDTHS, isOptimizablePath, variantPath,
} from "../lib/images/variants";

// ── Env ───────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes("--dry-run");
const dirFlag    = args.indexOf("--backup-dir");
const BACKUP_DIR = resolve(dirFlag >= 0 ? args[dirFlag + 1] : resolve(homedir(), "dreamcraft-storage-backup"));

// ── Helpers ───────────────────────────────────────────────────────────────────

type StoredFile = { path: string; size: number };

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + " MB";
const smallest = VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];

async function listAll(bucket: string, prefix = ""): Promise<StoredFile[]> {
  const out: StoredFile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`List ${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...await listAll(bucket, path)); // folder
      else out.push({ path, size: entry.metadata?.size ?? 0 });
    }
    if (data.length < 1000) break;
  }
  return out;
}

async function put(bucket: string, path: string, data: Buffer, contentType: string) {
  const { error } = await supabase.storage.from(bucket)
    .upload(path, data, { contentType, cacheControl: CACHE_SECONDS, upsert: true });
  if (error) throw new Error(`Upload ${bucket}/${path}: ${error.message}`);
}

// The backup, once written, is the source of truth for the original: a re-run
// after a half-finished file must not re-encode (or back up) the optimized copy.
async function loadOriginal(bucket: string, path: string): Promise<{ data: Buffer; type: string }> {
  const { data: blob, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`Download ${bucket}/${path}: ${error.message}`);

  const backupFile = resolve(BACKUP_DIR, bucket, path);
  if (existsSync(backupFile)) return { data: readFileSync(backupFile), type: blob.type };

  const data = Buffer.from(await blob.arrayBuffer());
  mkdirSync(dirname(backupFile), { recursive: true });
  writeFileSync(backupFile, data);
  return { data, type: blob.type };
}

async function optimizeFile(bucket: string, file: StoredFile): Promise<number> {
  const original = await loadOriginal(bucket, file.path);
  const set = await buildImageSet(original.data);

  if (!set) {
    // Can't be re-encoded: keep the file, but still give it the copies the
    // site will ask for.
    for (const w of VARIANT_WIDTHS) {
      await put(bucket, variantPath(file.path, w), original.data, original.type || "application/octet-stream");
    }
    console.log(`  ⚠  ${file.path} — kept as-is (could not re-encode)`);
    return file.size;
  }

  // The smallest copy goes last: its presence marks the file as done.
  await put(bucket, file.path, set.main, "image/webp");
  for (const v of set.variants) {
    await put(bucket, variantPath(file.path, v.width), v.data, "image/webp");
  }
  console.log(`  ✓  ${file.path}  ${mb(original.data.length)} → ${mb(set.main.length)}`);
  return set.main.length;
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log(DRY_RUN ? "\n🔍  Dry run — nothing will be changed" : `\n💾  Originals are backed up to ${BACKUP_DIR}`);

let before = 0, after = 0, failed = 0;

for (const bucket of IMAGE_BUCKETS) {
  let files: StoredFile[];
  try {
    files = await listAll(bucket);
  } catch (e) {
    console.warn(`\n⚠  ${bucket}: ${(e as Error).message}`);
    continue;
  }

  const paths   = new Set(files.map((f) => f.path));
  const sources = files.filter((f) => !/^w\d+\//.test(f.path));
  const todo    = sources.filter((f) => isOptimizablePath(f.path) && !paths.has(variantPath(f.path, smallest)));
  const other   = sources.filter((f) => !isOptimizablePath(f.path));

  const total = sources.reduce((n, f) => n + f.size, 0);
  console.log(
    `\n📦  ${bucket}: ${sources.length} files, ${mb(total)} — ${todo.length} to optimize` +
    (other.length ? `, ${other.length} not images (${mb(other.reduce((n, f) => n + f.size, 0))})` : ""),
  );

  if (DRY_RUN) {
    for (const f of [...todo].sort((a, b) => b.size - a.size).slice(0, 5)) {
      console.log(`     ${mb(f.size).padStart(9)}  ${f.path}`);
    }
    continue;
  }

  // A few at a time keeps memory flat and stays clear of Storage rate limits.
  const queue = [...todo];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      before += f.size;
      try {
        after += await optimizeFile(bucket, f);
      } catch (e) {
        failed++;
        after += f.size;
        console.error(`  ✗  ${f.path}: ${(e as Error).message}`);
      }
    }
  }));
}

if (!DRY_RUN) {
  console.log(`\n✅  Full-size images: ${mb(before)} → ${mb(after)}` + (failed ? `  (${failed} failed — re-run to retry)` : ""));
}
if (failed) process.exit(1);
