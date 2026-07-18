"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderListRow } from "../page";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function orderRef(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:               "bg-yellow-50 text-yellow-700 border border-yellow-200",
  AWAITING_VERIFICATION: "bg-blue-50   text-blue-700   border border-blue-200",
  PAID:                  "bg-green-50  text-green-700  border border-green-200",
  FAILED:                "bg-red-50    text-red-600    border border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
      ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OrdersTable({ initialOrders }: { initialOrders: OrderListRow[] }) {
  const router = useRouter();

  const [orders, setOrders]           = useState<OrderListRow[]>(initialOrders);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");
  const [exporting, setExporting]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback(
    (overrides: Record<string, string> = {}) => {
      const p = new URLSearchParams();
      const s      = overrides.search    ?? search;
      const status = overrides.status    ?? statusFilter;
      const from   = overrides.from_date ?? fromDate;
      const to     = overrides.to_date   ?? toDate;
      if (s)      p.set("search",    s);
      if (status) p.set("status",    status);
      if (from)   p.set("from_date", from);
      if (to)     p.set("to_date",   to);
      return p;
    },
    [search, statusFilter, fromDate, toDate],
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/orders?${buildParams()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchOrders, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchOrders]);

  async function handleExport() {
    setExporting(true);
    const p = buildParams();
    p.set("format", "csv");
    p.set("limit",  "10000");

    const res  = await fetch(`/api/admin/orders?${p}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dreamcraft-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  const totalRevenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-4">
      {/* ── Filters + export ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2">
        {/* Search */}
        <input
          type="search"
          placeholder="Search name, phone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
        </div>

        {/* CSV export */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* ── Summary strip ────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{orders.length}</p>
          <p className="text-xs text-gray-400">orders shown</p>
        </div>
        <div className="h-8 w-px bg-gray-100" />
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400">paid revenue</p>
        </div>
        <div className="h-8 w-px bg-gray-100" />
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-600">
            {orders.filter((o) => o.status === "PENDING").length}
          </p>
          <p className="text-xs text-gray-400">pending</p>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[140px_1fr_130px_110px_110px_110px] items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          {(["Order", "Customer", "Phone", "Total", "Status", "Date"] as const).map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No orders found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className="grid cursor-pointer grid-cols-[140px_1fr_130px_110px_110px_110px] items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors"
              >
                {/* Order ref */}
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-700">{orderRef(o.id)}</p>
                  {o.razorpay_order_id && (
                    <p className="truncate font-mono text-[11px] text-gray-400">{o.razorpay_order_id}</p>
                  )}
                </div>

                {/* Customer */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{o.customer_name}</p>
                  <p className="truncate text-xs text-gray-400">{o.email}</p>
                </div>

                {/* Phone */}
                <p className="font-mono text-sm text-gray-600">{o.phone}</p>

                {/* Total */}
                <p className="text-sm font-semibold text-gray-900">{fmt(o.total)}</p>

                {/* Status */}
                <StatusBadge status={o.status} />

                {/* Date */}
                <p className="text-sm text-gray-500">{fmtDate(o.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {orders.length} order{orders.length !== 1 ? "s" : ""} shown
        {orders.length === 200 && " — showing first 200, use date range to narrow results"}
      </p>
    </div>
  );
}
