import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── CSV builder ───────────────────────────────────────────────────────────────

type OrderRow = {
  id: string; created_at: string; status: string;
  customer_name: string; phone: string; email: string;
  city: string; state: string; pincode: string;
  address_line1: string; address_line2: string | null;
  subtotal: number; total: number;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
};

function csvCell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(orders: OrderRow[]): string {
  const HEADERS = [
    "Ref", "Date", "Time", "Name", "Phone", "Email",
    "City", "State", "Pincode",
    "Subtotal (₹)", "Shipping (₹)", "Total (₹)",
    "Status", "Razorpay Order ID", "Razorpay Payment ID",
  ];

  const rows = orders.map((o) => {
    const d        = new Date(o.created_at);
    const shipping = o.total - o.subtotal;
    return [
      o.id.slice(0, 8).toUpperCase(),
      d.toLocaleDateString("en-GB"),
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      o.customer_name, o.phone, o.email,
      o.city, o.state, o.pincode,
      o.subtotal, shipping, o.total,
      o.status,
      o.razorpay_order_id  ?? "",
      o.razorpay_payment_id ?? "",
    ].map(csvCell).join(",");
  });

  // UTF-8 BOM so Excel opens correctly
  return "﻿" + [HEADERS.join(","), ...rows].join("\r\n");
}

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
// Query params: search, status, from_date, to_date, format (json|csv), limit

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp        = req.nextUrl.searchParams;
  const search    = sp.get("search")    ?? "";
  const status    = sp.get("status")    ?? "";
  const fromDate  = sp.get("from_date") ?? "";
  const toDate    = sp.get("to_date")   ?? "";
  const format    = sp.get("format")    ?? "json";
  const limitRaw  = parseInt(sp.get("limit") ?? "200", 10);
  const limit     = Math.min(isNaN(limitRaw) ? 200 : limitRaw, 10_000);

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search.trim()) {
    const s = search.trim();
    query = query.or(
      `customer_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,razorpay_order_id.ilike.%${s}%`,
    );
  }
  if (status)   query = query.eq("status", status);
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate)   query = query.lte("created_at", `${toDate}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []) as OrderRow[];

  if (format === "csv") {
    const filename = `dreamcraft-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(buildCsv(orders), {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ orders });
}
