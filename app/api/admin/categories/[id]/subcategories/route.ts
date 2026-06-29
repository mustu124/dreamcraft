import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// ── POST /api/admin/categories/[id]/subcategories ─────────────────────────────
// Body: { name, slug }

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, slug } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (typeof slug !== "string" || !slug.trim())
    return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: last } = await admin
    .from("subcategories")
    .select("sort_order")
    .eq("category_id", params.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data: subcategory, error } = await admin
    .from("subcategories")
    .insert({
      category_id: params.id,
      name: name.trim(),
      slug: slug.trim(),
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "A subcategory with this slug already exists."
      : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ subcategory }, { status: 201 });
}

// ── PATCH /api/admin/categories/[id]/subcategories ────────────────────────────
// Body: { ids: string[] }  — batch sort_order update

export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { ids } = body as { ids: unknown };
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string"))
    return NextResponse.json({ error: "ids must be string[]" }, { status: 400 });

  const admin = createAdminClient();
  await Promise.all(
    ids.map((id: string, i: number) =>
      admin.from("subcategories").update({ sort_order: i }).eq("id", id),
    ),
  );

  return NextResponse.json({ success: true });
}
