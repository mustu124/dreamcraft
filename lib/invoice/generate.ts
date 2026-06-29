import "server-only";
import { createElement, type ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicePDF, type InvoiceData } from "./InvoicePDF";

// ── Types mirroring Supabase rows ─────────────────────────────────────────────

type OrderRecord = {
  id:            string;
  customer_name: string;
  email:         string;
  phone:         string;
  address_line1: string;
  address_line2: string | null;
  city:          string;
  state:         string;
  pincode:       string;
  subtotal:      number;
  total:         number;
  created_at:    string;
};

type OrderItemRecord = {
  product_name:  string;
  variant_label: string;
  quantity:      number;
  unit_price:    number;
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAndStoreInvoice(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  // ── Idempotency: skip if invoice already fully generated ──────
  const { data: existing } = await supabase
    .from("invoices")
    .select("storage_path")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing?.storage_path) return; // already done

  // ── Fetch order + order_items in parallel ─────────────────────
  const [orderRes, itemsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, customer_name, email, phone, address_line1, address_line2, " +
        "city, state, pincode, subtotal, total, created_at",
      )
      .eq("id", orderId)
      .single<OrderRecord>(),
    supabase
      .from("order_items")
      .select("product_name, variant_label, quantity, unit_price")
      .eq("order_id", orderId)
      .returns<OrderItemRecord[]>(),
  ]);

  if (orderRes.error || !orderRes.data) {
    throw new Error(`Order ${orderId} not found for invoice generation`);
  }

  const order    = orderRes.data;
  const items    = itemsRes.data ?? [];
  const shipping = order.total - order.subtotal;

  // ── Generate invoice number (count of existing rows + 1) ──────
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const year          = new Date(order.created_at).getFullYear();
  const seq           = (count ?? 0) + 1;
  const invoiceNumber = `DC-INV-${year}-${String(seq).padStart(4, "0")}`;

  // ── Build InvoiceData ─────────────────────────────────────────
  const invoiceData: InvoiceData = {
    invoiceNumber,
    date: new Date(order.created_at).toLocaleDateString("en-IN", {
      day:   "numeric",
      month: "long",
      year:  "numeric",
    }),
    customer: {
      fullName:     order.customer_name,
      email:        order.email,
      phone:        order.phone,
      addressLine1: order.address_line1,
      addressLine2: order.address_line2 ?? undefined,
      city:         order.city,
      state:        order.state,
      pincode:      order.pincode,
    },
    items: items.map((it) => ({
      name:         it.product_name,
      variantLabel: it.variant_label,
      qty:          it.quantity,
      unitPrice:    it.unit_price,
    })),
    subtotal: order.subtotal,
    shipping,
    total:    order.total,
  };

  // ── Render PDF to buffer ──────────────────────────────────────
  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePDF, { data: invoiceData }) as ReactElement<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  // ── Upload to private 'invoices' Supabase Storage bucket ──────
  const storagePath = `${invoiceNumber}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert:      true,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // ── Insert complete invoice row ───────────────────────────────
  const { error: insertErr } = await supabase
    .from("invoices")
    .insert({
      order_id:       orderId,
      invoice_number: invoiceNumber,
      storage_path:   storagePath,
    });

  if (insertErr) {
    // 23505 = unique_violation — another request beat us to it, that's fine
    if (insertErr.code !== "23505") {
      throw new Error(`Invoice row insert failed: ${insertErr.message}`);
    }
  }

  // ── Email the PDF to the customer (non-fatal) ─────────────────
  await sendInvoiceEmail(order, invoiceNumber, pdfBuffer).catch((err) =>
    console.error("[invoice] Email send failed:", err),
  );
}

// ── Email via Resend ──────────────────────────────────────────────────────────

async function sendInvoiceEmail(
  order:         OrderRecord,
  invoiceNumber: string,
  pdfBuffer:     Buffer,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[invoice] RESEND_API_KEY not set — skipping invoice email");
    return;
  }

  const { Resend } = await import("resend");
  const resend     = new Resend(apiKey);

  const fromEmail      = process.env.RESEND_FROM_EMAIL ?? "Dreamcraft <onboarding@resend.dev>";
  const firstName      = order.customer_name.split(" ")[0];
  const formattedTotal = `₹${order.total.toLocaleString("en-IN")}`;

  const { error } = await resend.emails.send({
    from:    fromEmail,
    to:      [order.email],
    subject: `Your Dreamcraft invoice — ${invoiceNumber}`,
    html:    buildEmailHtml(firstName, invoiceNumber, formattedTotal),
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }],
  });

  if (error) console.error("[invoice] Resend error:", error);
}

function buildEmailHtml(firstName: string, invoiceNumber: string, formattedTotal: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your Dreamcraft invoice</title></head>
<body style="margin:0;padding:0;background:#FBF6F0;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6F0;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#1F2A52;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:28px;color:#E0825F;">Dreamcraft</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1F2A52;">Order confirmed!</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#5A5E70;line-height:1.65;">
              Hi ${firstName}, your handcrafted pieces are being made with care. Your invoice is attached.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6F0;border-radius:12px;">
              <tr>
                <td style="padding:18px 22px;">
                  <p style="margin:0 0 3px;font-size:10px;color:#8A8D9A;text-transform:uppercase;">Invoice</p>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#1F2A52;">${invoiceNumber}</p>
                </td>
                <td style="padding:18px 22px;text-align:right;">
                  <p style="margin:0 0 3px;font-size:10px;color:#8A8D9A;text-transform:uppercase;">Total paid</p>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#E0825F;">${formattedTotal}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #EEEEF2;text-align:center;">
            <p style="margin:0;font-size:12px;color:#AAAAB5;font-style:italic;">
              Thank you for shopping with Dreamcraft — handmade with love.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
