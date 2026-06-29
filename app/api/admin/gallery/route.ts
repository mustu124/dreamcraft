import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// POST /api/admin/gallery — bulk insert
// Body: { images: { image_url, caption? }[] }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { images } = body as { images: { image_url: string; caption?: string }[] };

  if (!Array.isArray(images) || images.length === 0)
    return NextResponse.json({ error: "images array required" }, { status: 400 });
  if (images.some((img) => !img.image_url))
    return NextResponse.json({ error: "Each image needs an image_url" }, { status: 400 });

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("gallery_images").select("sort_order").order("sort_order", { ascending: false })
    .limit(1).maybeSingle<{ sort_order: number }>();

  const base = (last?.sort_order ?? -1) + 1;
  const rows = images.map((img, i) => ({
    image_url:  img.image_url,
    caption:    img.caption?.trim() || null,
    sort_order: base + i,
    is_active:  true,
  }));

  const { data, error } = await admin.from("gallery_images").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data }, { status: 201 });
}

// PATCH /api/admin/gallery — reorder: { ids: string[] }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const admin = createAdminClient();
  await Promise.all(ids.map((id: string, i: number) =>
    admin.from("gallery_images").update({ sort_order: i }).eq("id", id),
  ));
  return NextResponse.json({ success: true });
}
