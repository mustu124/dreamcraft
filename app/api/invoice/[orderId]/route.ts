import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStoreInvoice } from "@/lib/invoice/generate";

// ── GET /api/invoice/[orderId] ────────────────────────────────────────────────
//
// 1. Verifies the order is PAID (prevents leaking invoices for pending orders).
// 2. Looks up the private storage_path from the invoices table.
// 3. If the invoice hasn't been generated yet (e.g. async generation lagged),
//    generates it on-demand right now.
// 4. Creates a signed URL valid for 1 hour and redirects the browser to it.
//    The PDF is served directly from Supabase Storage — the server never
//    streams the bytes through Next.js, keeping memory usage minimal.

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const supabase  = createAdminClient();
  const { orderId } = params;

  // ── Guard: order must exist and be PAID ───────────────────────
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order || order.status !== "PAID") {
    return NextResponse.json(
      { error: "Order not found or payment not confirmed" },
      { status: 404 },
    );
  }

  // ── Look up invoice ───────────────────────────────────────────
  let { data: invoice } = await supabase
    .from("invoices")
    .select("storage_path")
    .eq("order_id", orderId)
    .maybeSingle<{ storage_path: string }>();

  // ── Lazy generation ───────────────────────────────────────────
  // Covers two cases:
  //   a) No invoice row at all (async generation hasn't run yet).
  //   b) Row exists but storage_path is '' (generation crashed mid-flight
  //      after claiming the slot — the generateAndStoreInvoice idempotency
  //      guard will detect the 23505 duplicate-key error and skip the insert,
  //      so we use upsert:true on the upload step to overwrite safely).
  if (!invoice || !invoice.storage_path) {
    try {
      await generateAndStoreInvoice(orderId);
    } catch (err) {
      console.error("[invoice] On-demand generation failed:", err);
      return NextResponse.json(
        { error: "Could not generate invoice. Please try again or contact us." },
        { status: 500 },
      );
    }

    // Re-fetch after generation
    const { data: fresh } = await supabase
      .from("invoices")
      .select("storage_path")
      .eq("order_id", orderId)
      .maybeSingle<{ storage_path: string }>();

    invoice = fresh;
  }

  if (!invoice?.storage_path) {
    return NextResponse.json({ error: "Invoice not available" }, { status: 404 });
  }

  // ── Sign URL (1-hour TTL) and redirect ───────────────────────
  // The browser follows the redirect and downloads the PDF directly from
  // Supabase Storage. No PDF bytes travel through the Next.js process.
  const { data: urlData, error: signErr } = await supabase.storage
    .from("invoices")
    .createSignedUrl(invoice.storage_path, 3600);

  if (signErr || !urlData?.signedUrl) {
    console.error("[invoice] Signed URL error:", signErr);
    return NextResponse.json(
      { error: "Could not generate download link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(urlData.signedUrl);
}
