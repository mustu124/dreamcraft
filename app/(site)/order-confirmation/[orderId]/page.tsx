import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { rupee } from "@/lib/config/shipping";

export const metadata: Metadata = {
  title: "Order Confirmed | Dreamcraft",
};

// ── Raw Supabase shapes ───────────────────────────────────────────────────────

type OrderRow = {
  id:                  string;
  status:              string;
  total:               number;
  customer_name:       string;
  email:               string;
  city:                string;
  state:               string;
  created_at:          string;
  razorpay_payment_id: string | null;
  payment_screenshot_url: string | null;
};

type InvoiceRow = {
  invoice_number: string;
  storage_path:   string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OrderConfirmationPage({
  params,
}: {
  params: { orderId: string };
}) {
  // Service-role client: readable by server component; never exposes the key to the browser.
  const supabase = createAdminClient();

  // Fetch order + invoice status in parallel
  const [orderResult, invoiceResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total, customer_name, email, city, state, created_at, razorpay_payment_id, payment_screenshot_url")
      .eq("id", params.orderId)
      .single<OrderRow>(),
    supabase
      .from("invoices")
      .select("invoice_number, storage_path")
      .eq("order_id", params.orderId)
      .maybeSingle<InvoiceRow>(),
  ]);

  const order = orderResult.data;

  // Guard: show this page once the order has been placed (PAID, or
  // AWAITING_VERIFICATION while we manually confirm the payment screenshot)
  const visibleStatuses = ["PAID", "AWAITING_VERIFICATION"];
  if (!order || !visibleStatuses.includes(order.status)) notFound();

  const invoice  = invoiceResult.data;
  const shortId  = order.id.slice(-8).toUpperCase();
  const date     = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Invoice is "ready" when storage_path is a non-empty string.
  // If it's null or '' the verify endpoint's async generation is still
  // in flight — the /api/invoice route handles lazy generation on first click.
  const invoiceReady = !!invoice?.storage_path;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 py-20">

      {/* ── Checkmark ─────────────────────────────────────── */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <CheckCircleIcon />
      </div>

      {/* ── Heading ───────────────────────────────────────── */}
      <h1 className="mt-5 font-heading italic text-3xl text-navy md:text-4xl">
        {order.status === "PAID" ? "Order Confirmed!" : "Order Received!"}
      </h1>
      <p className="mt-1 max-w-sm text-center font-body text-sm text-navy/50">
        {order.status === "PAID"
          ? `Thank you, ${order.customer_name.split(" ")[0]}. Your pieces are being made.`
          : `Thank you, ${order.customer_name.split(" ")[0]}. We've received your payment screenshot and will confirm your order on WhatsApp shortly.`}
      </p>

      {/* ── Order card ────────────────────────────────────── */}
      <div className="mt-7 w-full max-w-sm rounded-2xl border border-navy/8 bg-white p-6 shadow-sm">

        {/* Order ref + date */}
        <div className="flex items-baseline justify-between">
          <span className="font-body text-xs uppercase tracking-widest text-navy/40">
            Order #{shortId}
          </span>
          <span className="font-body text-xs text-navy/40">{date}</span>
        </div>

        <div className="my-4 h-px w-full bg-gold/40" />

        {/* Amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading italic text-2xl text-navy">{rupee(order.total)}</p>
            <p className="mt-0.5 font-body text-[11px] text-navy/40">
              {order.status === "PAID" ? "Paid" : "Awaiting payment confirmation"}
            </p>
          </div>
          <div className={[
            "flex h-9 w-9 items-center justify-center rounded-full",
            order.status === "PAID" ? "bg-terracotta/8 text-terracotta" : "bg-yellow-50 text-yellow-600",
          ].join(" ")}>
            {order.status === "PAID" ? <PaidIcon /> : <ClockIcon />}
          </div>
        </div>

        <div className="my-4 h-px w-full bg-navy/8" />

        {/* Shipping destination */}
        <div className="space-y-0.5">
          <p className="font-body text-xs uppercase tracking-widest text-navy/45">Shipping to</p>
          <p className="font-body text-sm text-navy/80">{order.customer_name}</p>
          <p className="font-body text-xs text-navy/55">{order.city}, {order.state}</p>
        </div>

        {/* Invoice — only once the order is confirmed PAID */}
        {order.status === "PAID" && invoice?.invoice_number && (
          <>
            <div className="my-4 h-px w-full bg-navy/8" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-xs uppercase tracking-widest text-navy/45">Invoice</p>
                <p className="font-body text-xs text-navy/70">{invoice.invoice_number}</p>
              </div>
              <InvoiceDownloadLink orderId={order.id} ready={invoiceReady} />
            </div>
          </>
        )}

        {order.status === "PAID" && !invoice && (
          <>
            <div className="my-4 h-px w-full bg-navy/8" />
            <div className="flex items-center justify-between">
              <p className="font-body text-xs text-navy/45">Invoice</p>
              <InvoiceDownloadLink orderId={order.id} ready={false} />
            </div>
          </>
        )}
      </div>

      {/* ── CTAs ──────────────────────────────────────────── */}
      <div className="mt-6 flex w-full max-w-sm gap-3">
        <Link
          href="/shop"
          className="flex-1 rounded-full border border-navy/20 py-3 text-center font-body text-sm text-navy/65 transition-colors hover:border-terracotta hover:text-terracotta"
        >
          Keep Shopping
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-full bg-terracotta py-3 text-center font-body text-sm font-medium text-ivory shadow-sm transition-colors hover:bg-terracotta/90"
        >
          Back to Home
        </Link>
      </div>

      {/* Payment ref (smallest possible — for customer support) */}
      {order.razorpay_payment_id && (
        <p className="mt-6 font-body text-[11px] text-navy/25">
          Payment ref: {order.razorpay_payment_id}
        </p>
      )}
    </div>
  );
}

// ── Invoice download link ─────────────────────────────────────────────────────
// Always renders as an <a> — works even if JavaScript is disabled.
// The Route Handler at /api/invoice/[orderId] generates a signed URL
// and redirects to it. The `ready` prop only affects the tooltip/label.

function InvoiceDownloadLink({
  orderId,
  ready,
}: {
  orderId: string;
  ready:   boolean;
}) {
  return (
    <a
      href={`/api/invoice/${orderId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={ready ? "Download invoice PDF" : "Invoice being prepared — click to generate"}
      className={[
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
        "font-body text-xs transition-colors",
        ready
          ? "border-terracotta/40 text-terracotta hover:bg-terracotta hover:text-ivory"
          : "border-navy/20 text-navy/50 hover:border-terracotta/40 hover:text-terracotta",
      ].join(" ")}
    >
      <DownloadIcon />
      {ready ? "Download PDF" : "Get Invoice"}
    </a>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PaidIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
