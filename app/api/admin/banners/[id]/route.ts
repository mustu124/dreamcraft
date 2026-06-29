import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── PATCH /api/admin/banners/[id] ────────────────────────────────────────────
// Body: { is_active: boolean }
// Toggles a single banner's active state.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { is_active } = body as { is_active: unknown };

  if (typeof is_active !== "boolean") {
    return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("banners")
    .update({ is_active })
    .eq("id", params.id);

  if (error) {
    console.error("[banners] toggle error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/admin/banners/[id] ───────────────────────────────────────────
// Removes a banner row. Storage objects are not deleted here — the bucket
// can be cleaned up manually or with a future scheduled job.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("banners")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[banners] delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
