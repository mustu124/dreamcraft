import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Razorpay keys not set in environment");
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
  }

  // ── Parse body ────────────────────────────────────────────
  let orderId: string | undefined;
  try {
    ({ orderId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Fetch our order (re-read total — never trust the client) ──
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: `Order is already ${order.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  // ── Create Razorpay order (amount in paise) ───────────────
  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method:  "POST",
    headers: {
      Authorization:  `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount:          order.total * 100, // INR → paise
      currency:        "INR",
      receipt:         orderId,
      payment_capture: 1,
    }),
  });

  if (!rzpRes.ok) {
    const detail = await rzpRes.text().catch(() => "unknown");
    console.error("Razorpay create-order error:", detail);
    return NextResponse.json({ error: "Could not create payment order" }, { status: 502 });
  }

  const rzpOrder = (await rzpRes.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  // ── Save razorpay_order_id on our row ─────────────────────
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ razorpay_order_id: rzpOrder.id })
    .eq("id", orderId);

  if (updateErr) {
    console.error("Failed to save razorpay_order_id:", updateErr);
    // Non-fatal — verification will still work via the HMAC check
  }

  return NextResponse.json({
    razorpayOrderId: rzpOrder.id,
    amount:          rzpOrder.amount,
    currency:        rzpOrder.currency,
    keyId,
  });
}
