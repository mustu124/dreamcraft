import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// PATCH /api/admin/testimonials/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.customer_name === "string" && body.customer_name.trim())
    update.customer_name = body.customer_name.trim();
  if (typeof body.customer_city === "string" && body.customer_city.trim())
    update.customer_city = body.customer_city.trim();
  if (typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5)
    update.rating = body.rating;
  if (typeof body.review_text === "string" && body.review_text.trim())
    update.review_text = body.review_text.trim();
  if ("customer_photo_url" in body)
    update.customer_photo_url = body.customer_photo_url || null;
  if (typeof body.is_active === "boolean")
    update.is_active = body.is_active;

  if (!Object.keys(update).length)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("testimonials").update(update).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/testimonials/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await createAdminClient()
    .from("testimonials").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
