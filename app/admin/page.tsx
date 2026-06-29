import { createClient } from "@/lib/supabase/server";
import { rupee } from "@/lib/config/shipping";
import type { ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecentOrder = {
  id:         string;
  full_name:  string;
  total:      number;
  status:     string;
  created_at: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Parallel fetch: counts + revenue + recent orders
  const [
    ordersCountRes,
    paidOrdersRes,
    pendingCountRes,
    productsCountRes,
    recentOrdersRes,
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("total").eq("status", "PAID"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("orders")
      .select("id, full_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentOrder[]>(),
  ]);

  const totalOrders   = ordersCountRes.count   ?? 0;
  const pendingOrders = pendingCountRes.count   ?? 0;
  const totalProducts = productsCountRes.count  ?? 0;
  const recentOrders  = recentOrdersRes.data    ?? [];
  const totalRevenue  = (paidOrdersRes.data ?? []).reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* ── Page title ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Welcome back — here's what's happening at Dreamcraft.
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString("en-IN")}
          icon={<OrderIcon />}
          color="blue"
        />
        <StatCard
          label="Revenue (Paid)"
          value={rupee(totalRevenue)}
          icon={<RevenueIcon />}
          color="green"
        />
        <StatCard
          label="Active Products"
          value={totalProducts.toLocaleString("en-IN")}
          icon={<ProductIcon />}
          color="purple"
        />
        <StatCard
          label="Pending Orders"
          value={pendingOrders.toLocaleString("en-IN")}
          icon={<PendingIcon />}
          color={pendingOrders > 0 ? "amber" : "gray"}
        />
      </div>

      {/* ── Recent orders table ──────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <a
            href="/admin/orders"
            className="text-sm font-medium text-terracotta hover:underline"
          >
            View all →
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-400">No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {["Order", "Customer", "Amount", "Status", "Date"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => {
                  const shortId = order.id.slice(-8).toUpperCase();
                  const date    = new Date(order.created_at).toLocaleDateString("en-IN", {
                    day:   "numeric",
                    month: "short",
                  });

                  return (
                    <tr key={order.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-gray-700">
                          #{shortId}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-900">{order.full_name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {rupee(order.total)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-400">{date}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Quick links ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: "/admin/products/new",    label: "Add Product",    emoji: "📦" },
            { href: "/admin/categories/new",  label: "Add Category",   emoji: "🏷️" },
            { href: "/admin/banners/new",     label: "New Banner",     emoji: "🖼️" },
            { href: "/admin/testimonials/new",label: "Add Review",     emoji: "⭐" },
            { href: "/admin/gallery/new",     label: "Upload Photo",   emoji: "📸" },
            { href: "/admin/orders",          label: "View Orders",    emoji: "🧾" },
            { href: "/admin/process-clips/new", label: "Add Clip",     emoji: "🎬" },
            { href: "/admin/bestsellers",     label: "Bestsellers",    emoji: "🔥" },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4
                         shadow-sm transition-all hover:border-terracotta/40 hover:shadow-md"
            >
              <span className="text-xl">{action.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

const colorMap = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   value: "text-blue-900"   },
  green:  { bg: "bg-green-50",  icon: "text-green-500",  value: "text-green-900"  },
  purple: { bg: "bg-purple-50", icon: "text-purple-500", value: "text-purple-900" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-500",  value: "text-amber-900"  },
  gray:   { bg: "bg-gray-50",   icon: "text-gray-400",   value: "text-gray-700"   },
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon:  ReactNode;
  color: keyof typeof colorMap;
}) {
  const c = colorMap[color];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.bg} ${c.icon}`}>
        <span className="h-5 w-5">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${c.value}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID:    "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED:  "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold
                  ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

// ── Stat icons ────────────────────────────────────────────────────────────────

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
