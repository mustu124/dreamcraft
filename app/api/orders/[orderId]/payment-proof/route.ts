import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/orders/[orderId]/payment-proof
// Body: multipart/form-data — field: file (File)
// Public route (checkout has no session) — scoped tightly to a single order
// that must already exist and be PENDING, so it can't be used to tamper with
// unrelated or already-processed orders.
// Uploads the screenshot to the `payment-screenshots` bucket, stores the URL
// on the order, and flips status PENDING → AWAITING_VERIFICATION so an admin
// can manually confirm the payment before it's marked PAID.

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const admin = createAdminClient();

  const { data: order, error: lookupErr } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", params.orderId)
    .maybeSingle();

  if (lookupErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "This order has already been processed" },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 5 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `orders/${order.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("payment-screenshots")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) {
    console.error("[payment-proof] Storage error:", uploadErr.message);
    return NextResponse.json({ error: "Could not upload screenshot" }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("payment-screenshots").getPublicUrl(filePath);

  const { error: updateErr } = await admin
    .from("orders")
    .update({ payment_screenshot_url: publicUrl, status: "AWAITING_VERIFICATION" })
    .eq("id", order.id);

  if (updateErr) {
    console.error("[payment-proof] Order update error:", updateErr.message);
    return NextResponse.json({ error: "Screenshot uploaded but order update failed" }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}
