import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Order Detail | Dreamcraft Admin" };

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function orderRef(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  PAID:    "bg-green-50  text-green-700  border border-green-200",
  FAILED:  "bg-red-50    text-red-600    border border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
      ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ── Detail field ───────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{value || <span className="italic text-gray-300">—</span>}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Props = { params: { id: string } };

export default async function OrderDetailPage({ params }: Props) {
  const admin = createAdminClient();

  // Fetch order + items (service-role, bypasses RLS)
  const { data: order } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.id)
    .single();

  if (!order) notFound();

  // Invoice (may not exist yet for recent orders)
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, invoice_number, storage_path")
    .eq("order_id", params.id)
    .maybeSingle();

  type Item = {
    id: string;
    product_name: string;
    variant_label: string;
    unit_price: number;
    quantity: number;
  };

  const items: Item[] = (order.order_items ?? []) as Item[];
  const lineTotal = (item: Item) => item.unit_price * item.quantity;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-gray-900">{orderRef(order.id)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-400">{fmtDatetime(order.created_at)}</p>
        </div>

        {/* Invoice download — only for PAID orders */}
        {order.status === "PAID" && (
          <a
            href={`/api/invoice/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Invoice
            {invoice?.invoice_number && (
              <span className="ml-0.5 font-mono text-xs text-gray-400">{invoice.invoice_number}</span>
            )}
          </a>
        )}
      </div>

      {/* ── Customer + Shipping ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Customer */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</h2>
          <Field label="Name"  value={order.customer_name} />
          <Field label="Email" value={order.email} />
          <Field label="Phone" value={order.phone} />
        </div>

        {/* Shipping address */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Shipping Address</h2>
          <Field label="Line 1" value={order.address_line1} />
          {order.address_line2 && <Field label="Line 2" value={order.address_line2} />}
          <Field label="City / State"
            value={`${order.city}, ${order.state} – ${order.pincode}`} />
        </div>
      </div>

      {/* ── Order items ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Items ({items.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500">{item.variant_label}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-gray-400">Unit</p>
                  <p className="text-sm text-gray-700">{fmt(item.unit_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Qty</p>
                  <p className="text-sm text-gray-700">{item.quantity}</p>
                </div>
                <div className="w-20">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(lineTotal(item))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping</span>
            {(() => { const s = order.total - order.subtotal; return <span>{s === 0 ? "Free" : fmt(s)}</span>; })()}
          </div>
          <div className="flex justify-between pt-2 text-base font-bold text-gray-900 border-t border-gray-200">
            <span>Total</span>
            <span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" value={<StatusBadge status={order.status} />} />
          <Field label="Razorpay Order ID"   value={
            order.razorpay_order_id
              ? <span className="font-mono text-xs">{order.razorpay_order_id}</span>
              : null
          } />
          <Field label="Razorpay Payment ID" value={
            order.razorpay_payment_id
              ? <span className="font-mono text-xs">{order.razorpay_payment_id}</span>
              : null
          } />
          {invoice && (
            <Field label="Invoice Number"
              value={<span className="font-mono text-xs">{invoice.invoice_number}</span>} />
          )}
        </div>
      </div>

      {/* ── Full order ID ───────────────────────────────────────── */}
      <p className="text-center font-mono text-xs text-gray-300">Order ID: {order.id}</p>
    </div>
  );
}
