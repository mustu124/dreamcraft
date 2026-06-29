import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// POST /api/admin/process-clips
// Body: { title, video_url, thumbnail_url }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, video_url, thumbnail_url } = body as Record<string, string>;

  if (!title?.trim())         return NextResponse.json({ error: "title is required" },         { status: 400 });
  if (!video_url?.trim())     return NextResponse.json({ error: "video_url is required" },     { status: 400 });
  if (!thumbnail_url?.trim()) return NextResponse.json({ error: "thumbnail_url is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("process_clips").select("sort_order").order("sort_order", { ascending: false })
    .limit(1).maybeSingle<{ sort_order: number }>();

  const { data, error } = await admin.from("process_clips").insert({
    title:         title.trim(),
    video_url:     video_url.trim(),
    thumbnail_url: thumbnail_url.trim(),
    sort_order:    (last?.sort_order ?? -1) + 1,
    is_active:     true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clip: data }, { status: 201 });
}

// PATCH /api/admin/process-clips — reorder: { ids: string[] }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const admin = createAdminClient();
  await Promise.all(ids.map((id: string, i: number) =>
    admin.from("process_clips").update({ sort_order: i }).eq("id", id),
  ));
  return NextResponse.json({ success: true });
}
