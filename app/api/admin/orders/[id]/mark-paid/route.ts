import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStoreInvoice } from "@/lib/invoice/generate";

// POST /api/admin/orders/[id]/mark-paid
// Admin-only. Used once the admin has manually checked the uploaded payment
// screenshot and confirmed the payment — mirrors what /api/razorpay/verify
// did automatically, minus the signature check (there's no gateway signature
// for a manual UPI payment).

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: order, error: lookupErr } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (lookupErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === "PAID") {
    return NextResponse.json({ success: true, orderId: order.id });
  }

  const { error: updateErr } = await admin
    .from("orders")
    .update({ status: "PAID" })
    .eq("id", order.id);

  if (updateErr) {
    console.error("[mark-paid] Order update error:", updateErr.message);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }

  await generateAndStoreInvoice(order.id).catch((err) =>
    console.error("[mark-paid] Invoice generation failed:", err),
  );

  return NextResponse.json({ success: true, orderId: order.id });
}
