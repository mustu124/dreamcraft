import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_BUCKETS = new Set([
  "banners", "categories", "avatars", "gallery", "clips", "product-images",
]);

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

  const ext      = file.name.split(".").pop() ?? "bin";
  const filePath = pathHint ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[upload] Storage error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
