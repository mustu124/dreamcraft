import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/orders/[orderId]/payment-sent
// Public route (checkout has no session) — scoped tightly to a single order
// that must already exist and not yet be finalized, so it can't be used to
// tamper with unrelated or already-resolved orders.
// Called when the customer taps "Confirm Order via WhatsApp" after paying by
// UPI. Sets status to AWAITING_VERIFICATION so an admin can manually confirm
// the payment before it's marked PAID.

export async function POST(
  _req: NextRequest,
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
  if (order.status === "AWAITING_VERIFICATION") {
    return NextResponse.json({ success: true });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "This order has already been processed" },
      { status: 409 },
    );
  }

  const { error: updateErr } = await admin
    .from("orders")
    .update({ status: "AWAITING_VERIFICATION" })
    .eq("id", order.id);

  if (updateErr) {
    console.error("[payment-sent] Order update error:", updateErr.message);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
