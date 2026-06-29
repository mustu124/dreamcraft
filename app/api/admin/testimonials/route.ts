import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

// POST /api/admin/testimonials
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { customer_name, customer_city, rating, review_text, customer_photo_url } = body;

  if (typeof customer_name !== "string" || !customer_name.trim())
    return NextResponse.json({ error: "customer_name is required" }, { status: 400 });
  if (typeof customer_city !== "string" || !customer_city.trim())
    return NextResponse.json({ error: "customer_city is required" }, { status: 400 });
  if (typeof rating !== "number" || rating < 1 || rating > 5)
    return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
  if (typeof review_text !== "string" || !review_text.trim())
    return NextResponse.json({ error: "review_text is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("testimonials").select("sort_order").order("sort_order", { ascending: false })
    .limit(1).maybeSingle<{ sort_order: number }>();

  const { data, error } = await admin.from("testimonials").insert({
    customer_name: customer_name.trim(),
    customer_city: customer_city.trim(),
    rating,
    review_text: review_text.trim(),
    customer_photo_url: typeof customer_photo_url === "string" && customer_photo_url ? customer_photo_url : null,
    sort_order: (last?.sort_order ?? -1) + 1,
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testimonial: data }, { status: 201 });
}

// PATCH /api/admin/testimonials — reorder: { ids: string[] }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!(await getUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const admin = createAdminClient();
  await Promise.all(ids.map((id: string, i: number) =>
    admin.from("testimonials").update({ sort_order: i }).eq("id", id),
  ));
  return NextResponse.json({ success: true });
}
