import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// PATCH /api/admin/process-clips/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim())
    update.title = body.title.trim();
  if (typeof body.video_url === "string" && body.video_url.trim())
    update.video_url = body.video_url.trim();
  if (typeof body.thumbnail_url === "string" && body.thumbnail_url.trim())
    update.thumbnail_url = body.thumbnail_url.trim();
  if (typeof body.is_active === "boolean")
    update.is_active = body.is_active;

  if (!Object.keys(update).length)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("process_clips").update(update).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/process-clips/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await createAdminClient()
    .from("process_clips").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
