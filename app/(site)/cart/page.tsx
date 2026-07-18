"use client";

import Link from "next/link";
import type { CartItem } from "@/contexts/CartContext";
import { useCart } from "@/contexts/CartContext";
import { calcShipping, rupee } from "@/lib/config/shipping";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { items, totalPrice, setQty, removeItem } = useCart();

  const subtotal = totalPrice;
  const shipping = calcShipping(subtotal);
  const total    = subtotal + shipping;
  const isEmpty  = items.length === 0;

  return (
    <div className="min-h-screen bg-ivory">

      {/* ── Page heading ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 md:pt-8 lg:px-8">
        <h1 className="font-heading italic text-4xl text-navy md:text-5xl">
          Cart
          {!isEmpty && (
            <span className="ml-3 font-heading not-italic text-2xl text-navy/35">
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          )}
        </h1>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {isEmpty ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:gap-x-12">

            {/* LEFT: line items ─────────────────────────────────── */}
            <div>
              {items.map((item) => (
                <CartLineItem
                  key={item.variantId}
                  item={item}
                  onQtyChange={(qty) => setQty(item.variantId, qty)}
                  onRemove={() => removeItem(item.variantId)}
                />
              ))}
            </div>

            {/* RIGHT: order summary (sticky on desktop) ─────────── */}
            <div className="lg:sticky lg:top-[80px] lg:self-start">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty cart ────────────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blush/35 text-terracotta">
        <EmptyBagIcon />
      </div>
      <h2 className="mt-6 font-heading italic text-2xl text-navy">Your cart is empty</h2>
      <p className="mt-2 max-w-[22rem] font-body text-sm text-navy/55">
        You haven't added anything yet. Explore our handcrafted collection to find something beautiful.
      </p>
      <Link
        href="/shop"
        className="mt-7 rounded-full bg-terracotta px-8 py-3 font-body text-sm font-medium text-ivory shadow-sm transition-colors hover:bg-terracotta/90"
      >
        Browse Collection
      </Link>
    </div>
  );
}

// ── Cart line item ────────────────────────────────────────────────────────────

function CartLineItem({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}) {
  const isPlaceholder = !item.image || item.image === "/placeholder-product.jpg";
  const lineTotal = item.price * item.qty;

  return (
    <div className="flex items-start gap-4 border-b border-navy/8 py-5 first:pt-0 last:border-b-0">

      {/* Thumbnail */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-blush/25">
        {isPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="select-none font-heading italic text-2xl text-terracotta/35">
              {item.name.charAt(0)}
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" draggable={false} />
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/shop/${item.sku}`}
          className="font-heading italic text-base leading-snug text-navy transition-colors hover:text-terracotta"
        >
          {item.name}
        </Link>
        <p className="font-body text-xs text-navy/45">{item.variantLabel}</p>
        <p className="font-body text-xs text-navy/50">{rupee(item.price)} each</p>

        {/* Bottom row: qty stepper + total + remove */}
        <div className="mt-3 flex items-center gap-4">
          <InlineQtyPicker qty={item.qty} onChange={onQtyChange} />

          <div className="ml-auto flex items-center gap-3">
            <span className="font-body text-sm font-semibold text-navy">
              {rupee(lineTotal)}
            </span>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${item.name} from cart`}
              className="text-navy/30 transition-colors hover:text-terracotta"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order summary card ────────────────────────────────────────────────────────

function OrderSummary({
  items,
  subtotal,
  shipping,
  total,
}: {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-sm">
      <h2 className="mb-5 font-heading italic text-xl text-navy">Order Summary</h2>

      {/* Compact item list */}
      <div className="mb-4 space-y-2 border-b border-navy/8 pb-4">
        {items.map((item) => (
          <div key={item.variantId} className="flex justify-between gap-2 font-body text-sm text-navy/65">
            <span className="min-w-0 truncate">
              {item.name}
              {item.qty > 1 && <span className="text-navy/40"> ×{item.qty}</span>}
            </span>
            <span className="flex-shrink-0">{rupee(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      {/* Subtotal + shipping */}
      <div className="space-y-2.5">
        <SummaryRow label="Subtotal" value={rupee(subtotal)} />
        <SummaryRow
          label="Shipping"
          value={shipping === 0 ? "Free" : rupee(shipping)}
          valueClass={shipping === 0 ? "text-green-600" : undefined}
        />
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t border-navy/8 pt-4">
        <span className="font-body text-base font-semibold text-navy">Total</span>
        <span className="font-body text-lg font-bold text-navy">{rupee(total)}</span>
      </div>

      {/* Shipping nudge */}
      {/* CTA */}
      <Link
        href="/checkout"
        className="mt-5 block rounded-full bg-terracotta py-3.5 text-center font-body text-sm font-medium text-ivory shadow-sm transition-colors hover:bg-terracotta/90"
      >
        Proceed to Checkout
      </Link>

      <p className="mt-3 text-center font-body text-[11px] text-navy/40">
        Secure payments · Made to order
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between font-body text-sm">
      <span className="text-navy/60">{label}</span>
      <span className={valueClass ?? "text-navy/75"}>{value}</span>
    </div>
  );
}

// ── Inline qty picker (used only in this file) ────────────────────────────────

function InlineQtyPicker({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-navy/18 text-navy/60">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="Decrease quantity"
        className="flex w-7 items-center justify-center text-sm transition-colors hover:bg-blush/30 hover:text-terracotta"
      >
        −
      </button>
      <div
        className="flex w-7 items-center justify-center border-x border-navy/18 font-body text-xs text-navy select-none"
        aria-label={`Quantity: ${qty}`}
      >
        {qty}
      </div>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
        className="flex w-7 items-center justify-center text-sm transition-colors hover:bg-blush/30 hover:text-terracotta"
      >
        +
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function EmptyBagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10" aria-hidden>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
