import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// ── PATCH /api/admin/categories/[id]/subcategories/[subId] ───────────────────
// Body: { name?, slug? }

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; subId: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.slug === "string" && body.slug.trim()) update.slug = body.slug.trim();

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("subcategories")
    .update(update)
    .eq("id", params.subId)
    .eq("category_id", params.id); // double-key guard

  if (error) {
    const msg = error.code === "23505"
      ? "A subcategory with this slug already exists."
      : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/admin/categories/[id]/subcategories/[subId] ──────────────────
// Blocked if any products are still filed under this subcategory.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; subId: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { count } = await admin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("subcategory_id", params.subId);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `This subcategory has ${count} product${count === 1 ? "" : "s"}. ` +
               "Move or delete its products first.",
      },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("subcategories")
    .delete()
    .eq("id", params.subId)
    .eq("category_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
