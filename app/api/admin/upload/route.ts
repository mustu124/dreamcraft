import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { buildImageSet } from "@/lib/images/optimize";
import {
  CACHE_SECONDS, IMAGE_BUCKETS, VARIANT_WIDTHS, isOptimizablePath, variantPath,
} from "@/lib/images/variants";

const ALLOWED_BUCKETS = new Set<string>(IMAGE_BUCKETS);

const RESIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

// POST /api/admin/upload
// Body: multipart/form-data — fields: file (File), bucket (string), path? (string)
// Returns: { url: string }
//
// Uploads directly from the server using the service-role key, so no Storage
// INSERT policy is needed on the bucket. The admin auth check still happens
// server-side via the SSR session.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file   = formData.get("file");
  const bucket = formData.get("bucket");
  const pathHint = formData.get("path") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (typeof bucket !== "string" || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid or missing bucket" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Only image and video files are allowed" }, { status: 400 });
  }

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Photos are re-encoded as WebP and stored at three sizes (see
  // lib/images/variants.ts) — originals straight off a phone are several MB
  // each and every page view is billed against Storage egress.
  const set = RESIZABLE_TYPES.has(file.type) ? await buildImageSet(buffer) : null;

  const ext      = set ? "webp" : file.name.split(".").pop() ?? "bin";
  const filePath = pathHint ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const type     = set ? "image/webp" : file.type;

  // The site requests the smaller copies for any path with an image
  // extension, so they must exist even when the file couldn't be re-encoded.
  const copies = isOptimizablePath(filePath)
    ? VARIANT_WIDTHS.map((width, i) => ({
        path: variantPath(filePath, width),
        body: set ? set.variants[i].data : buffer,
      }))
    : [];

  const admin = createAdminClient();
  const store = (path: string, body: Buffer) =>
    admin.storage.from(bucket).upload(path, body, {
      contentType: type, cacheControl: CACHE_SECONDS, upsert: false,
    });

  for (const copy of copies) {
    const { error } = await store(copy.path, copy.body);
    if (error) {
      console.error("[upload] Storage error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data, error } = await store(filePath, set ? set.main : buffer);

  if (error) {
    console.error("[upload] Storage error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
