import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcShipping } from "@/lib/config/shipping";

// ── Request body shape ────────────────────────────────────────────────────────

type OrderItem = {
  variantId: string;
  productId: string;
  sku:       string;
  name:      string;
  qty:       number;
};

type ShippingAddress = {
  fullName:     string;
  phone:        string;
  email:        string;
  addressLine1: string;
  addressLine2?: string;
  city:         string;
  state:        string;
  pincode:      string;
};

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidAddress(a: unknown): a is ShippingAddress {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.fullName     === "string" && o.fullName.trim().length > 0 &&
    typeof o.phone        === "string" && /^[6-9]\d{9}$/.test(o.phone) &&
    typeof o.email        === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email) &&
    typeof o.addressLine1 === "string" && o.addressLine1.trim().length > 0 &&
    typeof o.city         === "string" && o.city.trim().length > 0 &&
    typeof o.state        === "string" && o.state.trim().length > 0 &&
    typeof o.pincode      === "string" && /^\d{6}$/.test(o.pincode)
  );
}

function isValidItems(items: unknown): items is OrderItem[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (i): i is OrderItem =>
        typeof i?.variantId === "string" &&
        typeof i?.productId === "string" &&
        typeof i?.qty       === "number" &&
        i.qty > 0,
    )
  );
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parse body ────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { items, address } = body as { items: unknown; address: unknown };

    if (!isValidItems(items)) {
      return NextResponse.json({ error: "Items are invalid or empty" }, { status: 400 });
    }
    if (!isValidAddress(address)) {
      return NextResponse.json({ error: "Shipping address is incomplete or invalid" }, { status: 400 });
    }

    // ── 2. Fetch current prices from DB ───────────────────────
    const supabase = createAdminClient();

    const variantIds = items.map((i) => i.variantId);
    const { data: variants, error: variantErr } = await supabase
      .from("product_variants")
      .select("id, price, product_id, label")
      .in("id", variantIds);

    if (variantErr || !variants) {
      console.error("product_variants fetch error:", variantErr);
      return NextResponse.json({ error: "Failed to verify product prices" }, { status: 500 });
    }

    // ── 3. Compute totals server-side ─────────────────────────
    let subtotal = 0;
    const lineItems: {
      product_id:    string;
      variant_id:    string;
      product_name:  string;
      variant_label: string;
      unit_price:    number;
      quantity:      number;
    }[] = [];

    for (const item of items) {
      const v = variants.find((v) => v.id === item.variantId);
      if (!v) {
        return NextResponse.json(
          { error: `Product variant not found: ${item.variantId}` },
          { status: 400 },
        );
      }
      const qty = Math.max(1, Math.floor(Number(item.qty)));
      subtotal += v.price * qty;
      lineItems.push({
        product_id:    v.product_id,
        variant_id:    v.id,
        product_name:  String(item.name ?? ""),
        variant_label: v.label,
        unit_price:    v.price,
        quantity:      qty,
      });
    }

    const shipping = calcShipping(subtotal);
    // total includes shipping — stored in total column; shipping itself has no column
    const total = subtotal + shipping;

    // ── 4. Generate order_number (max existing + 1, starting at 1001) ──────
    const { data: lastOrder } = await supabase
      .from("orders")
      .select("order_number")
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const orderNumber = (lastOrder?.order_number ?? 1000) + 1;

    // ── 5. Insert order ───────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number:  orderNumber,
        customer_name: address.fullName.trim(),
        phone:         address.phone,
        email:         address.email.trim().toLowerCase(),
        address_line1: address.addressLine1.trim(),
        address_line2: address.addressLine2?.trim() || null,
        city:          address.city.trim(),
        state:         address.state.trim(),
        pincode:       address.pincode,
        subtotal,
        total,
        status:        "PENDING",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("orders insert error:", orderErr);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // ── 6. Insert order items ─────────────────────────────────
    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));

    if (itemsErr) {
      console.error("order_items insert error:", itemsErr);
    }

    return NextResponse.json({ orderId: order.id, total }, { status: 201 });

  } catch (err) {
    console.error("POST /api/orders unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
