import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStoreInvoice } from "@/lib/invoice/generate";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    console.error("RAZORPAY_KEY_SECRET not set");
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
  }

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as {
    razorpay_order_id:   unknown;
    razorpay_payment_id: unknown;
    razorpay_signature:  unknown;
  };

  if (
    typeof razorpay_order_id   !== "string" || !razorpay_order_id ||
    typeof razorpay_payment_id !== "string" || !razorpay_payment_id ||
    typeof razorpay_signature  !== "string" || !razorpay_signature
  ) {
    return NextResponse.json({ error: "Missing or invalid payment fields" }, { status: 400 });
  }

  // ── HMAC SHA256 signature verification ───────────────────
  // Razorpay signs: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // Constant-time comparison prevents timing-based signature inference
  const receivedBuf = Buffer.from(razorpay_signature, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");

  const isValid =
    receivedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(receivedBuf, expectedBuf);

  // ── Look up our order by the Razorpay order ID ───────────
  // We look up via razorpay_order_id (not trusting a client-sent orderId)
  // because the razorpay_order_id was written to the row by our own server.
  const supabase = createAdminClient();

  const { data: order, error: lookupErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();

  if (lookupErr || !order) {
    return NextResponse.json({ error: "Order not found for this payment" }, { status: 404 });
  }

  if (!isValid) {
    // Signature mismatch — possible tampering. Mark as FAILED.
    await supabase
      .from("orders")
      .update({ status: "FAILED" })
      .eq("id", order.id);

    console.error(
      `Signature mismatch for order ${order.id}. ` +
      `Expected: ${expectedSig}. Received: ${razorpay_signature}`,
    );

    return NextResponse.json({ error: "Payment signature invalid" }, { status: 400 });
  }

  // ── Idempotency guard — don't double-update ───────────────
  if (order.status === "PAID") {
    return NextResponse.json({ success: true, orderId: order.id });
  }

  // ── Mark as PAID ──────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status:              "PAID",
      razorpay_payment_id: razorpay_payment_id,
    })
    .eq("id", order.id);

  if (updateErr) {
    console.error("Order status update error:", updateErr);
    return NextResponse.json({ error: "Payment verified but order update failed" }, { status: 500 });
  }

  // ── Generate invoice ──────────────────────────────────────
  // Awaited so the invoice is ready before the customer hits the
  // confirmation page. Failure is logged but does NOT fail the response —
  // the /api/invoice/[orderId] endpoint will regenerate on first download.
  await generateAndStoreInvoice(order.id).catch((err) =>
    console.error("[verify] Invoice generation failed:", err),
  );

  return NextResponse.json({ success: true, orderId: order.id });
}
