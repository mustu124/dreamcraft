import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// PATCH /api/admin/gallery/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if ("caption" in body)   update.caption   = body.caption   || null;
  if ("alt_text" in body)  update.alt_text  = body.alt_text  || null;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;

  if (!Object.keys(update).length)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("gallery_images").update(update).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/gallery/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await createAdminClient()
    .from("gallery_images").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
