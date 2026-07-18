"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { PRICE_UNIT_LABELS } from "@/lib/config/priceUnitLabels";

// ── Types ─────────────────────────────────────────────────────────────────────
// Exported so page.tsx can build this shape server-side.

export type ProductInfoData = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string | null;
  subcategorySlug: string | null;
  images: string[];
  variants: { id: string; label: string; price: number }[];
  isCandleCategory: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductInfo({ product }: { product: ProductInfoData }) {
  const { addItem }      = useCart();
  const router           = useRouter();
  const [variantIdx, setVariantIdx] = useState(0);
  const [qty, setQty]               = useState(1);

  const variant = product.variants[variantIdx];

  // Each addItem increments by 1; calling qty times gives the user-selected count.
  // React 18 applies reducer dispatches sequentially even when batched for rendering.
  function buildCartBase(): Omit<CartItem, "qty"> {
    return {
      productId:    product.id,
      variantId:    variant!.id,
      sku:          product.sku,
      name:         product.name,
      variantLabel: variant!.label,
      price:        variant!.price,
      image:        product.images[0] ?? "",
    };
  }

  function handleAddToCart() {
    if (!variant) return;
    const base = buildCartBase();
    for (let i = 0; i < qty; i++) addItem(base);
  }

  function handleBuyNow() {
    if (!variant) return;
    const base = buildCartBase();
    for (let i = 0; i < qty; i++) addItem(base);
    router.push("/checkout");
  }

  // For a single-variant product, the variant label (e.g. "Per piece",
  // "Set of 2") never appears anywhere else since the size selector only
  // renders when there are multiple variants — so show it next to the price
  // instead, unless it's just the generic "Standard" placeholder. Some
  // multi-variant products (e.g. several tray shapes, all "per tray") also
  // want a qualifier that stays fixed regardless of which one is selected —
  // that comes from PRICE_UNIT_LABELS instead of the variant's own label.
  const priceQualifier =
    PRICE_UNIT_LABELS[product.sku] ??
    (product.variants.length === 1 && variant && variant.label.toLowerCase() !== "standard"
      ? variant.label.toLowerCase()
      : null);

  const priceFormatted = variant
    ? `₹${variant.price.toLocaleString("en-IN")}`
    : null;

  const handcraftedNote = product.isCandleCategory
    ? "Hand-poured in premium soy wax for a clean, long-lasting burn."
    : "Handmade in eco-resin and cured for 24 hours — small variations in texture and color are natural and part of what makes each piece one of a kind.";

  return (
    <div className="flex flex-col gap-6">

      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 font-body text-xs text-navy/45">
          <li>
            <Link href="/shop" className="hover:text-terracotta transition-colors">Shop</Link>
          </li>
          <li aria-hidden className="select-none">/</li>
          <li>
            <Link
              href={`/shop?category=${product.categorySlug}`}
              className="hover:text-terracotta transition-colors"
            >
              {product.categoryName}
            </Link>
          </li>
          {product.subcategoryName && product.subcategorySlug && (
            <>
              <li aria-hidden className="select-none">/</li>
              <li>
                <Link
                  href={`/shop?category=${product.categorySlug}&subcategory=${product.subcategorySlug}`}
                  className="hover:text-terracotta transition-colors"
                >
                  {product.subcategoryName}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* ── Name + SKU ────────────────────────────────────────── */}
      <div>
        <h1 className="font-heading italic text-3xl leading-tight text-navy md:text-4xl">
          {product.name}
        </h1>
        <p className="mt-2 font-body text-xs tracking-widest text-navy/35 uppercase">
          SKU: {product.sku}
        </p>
      </div>

      {/* ── Price ─────────────────────────────────────────────── */}
      {priceFormatted && (
        <p className="font-body text-2xl font-semibold text-navy">
          {priceFormatted}
          {priceQualifier && (
            <span className="ml-1.5 text-base font-normal text-navy/50">{priceQualifier}</span>
          )}
        </p>
      )}

      {/* ── Variant selector (only when multiple variants exist) ─ */}
      {product.variants.length > 1 && (
        <div>
          <p className="mb-2.5 font-body text-[10px] uppercase tracking-widest text-navy/40">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantIdx(i)}
                aria-pressed={i === variantIdx}
                className={[
                  "rounded-xl border px-3.5 py-2 font-body text-sm transition-all duration-200",
                  i === variantIdx
                    ? "border-terracotta bg-terracotta/8 text-terracotta shadow-sm"
                    : "border-navy/18 text-navy/65 hover:border-navy/45",
                ].join(" ")}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Quantity + actions ────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Quantity row */}
        <div className="flex items-center gap-3">
          <span className="w-14 flex-shrink-0 font-body text-xs uppercase tracking-widest text-navy/40">
            Qty
          </span>
          <QtyPicker qty={qty} onChange={setQty} />
        </div>

        {/* Add to Cart — primary */}
        <button
          type="button"
          disabled={!variant}
          onClick={handleAddToCart}
          className="w-full rounded-full bg-terracotta py-3.5 font-body text-sm font-medium text-ivory shadow-sm transition-all duration-200 hover:bg-terracotta/90 hover:shadow-md disabled:opacity-40"
        >
          Add to Cart
        </button>

        {/* Buy Now — secondary */}
        <button
          type="button"
          disabled={!variant}
          onClick={handleBuyNow}
          className="w-full rounded-full border-2 border-navy py-3.5 font-body text-sm font-medium text-navy transition-all duration-200 hover:bg-navy hover:text-ivory disabled:opacity-40"
        >
          Buy Now
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────────────── */}
      <div className="h-px w-full bg-navy/8" />

      {/* ── Description ───────────────────────────────────────── */}
      {product.description && (
        <p className="font-body text-sm leading-relaxed text-navy/65 md:text-base">
          {product.description}
        </p>
      )}

      {/* ── Handcrafted note ──────────────────────────────────── */}
      <div className="rounded-2xl bg-blush/25 px-5 py-4">
        <p className="font-body text-xs leading-relaxed text-navy/60">
          <span className="font-semibold text-navy/80">✦ Handcrafted note: </span>
          {handcraftedNote}
        </p>
      </div>

      {/* ── Trust row ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <TrustItem icon={<MadeToOrderIcon />} label="Made to order" />
        <TrustItem
          icon={<CustomizeIcon />}
          label="Customization available"
          sublabel={<Link href="/contact" className="text-terracotta hover:underline">Contact us</Link>}
        />
        <TrustItem icon={<LockIcon />} label="Secure payments via UPI QR code" />
      </div>
    </div>
  );
}

// ── Qty picker ────────────────────────────────────────────────────────────────

function QtyPicker({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-navy/20">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="Decrease quantity"
        className="flex w-9 items-center justify-center text-navy/60 transition-colors hover:bg-blush/30 hover:text-terracotta"
      >
        <span aria-hidden className="text-lg leading-none">−</span>
      </button>
      <div
        className="flex w-10 items-center justify-center border-x border-navy/20 font-body text-sm text-navy select-none"
        aria-label={`Quantity: ${qty}`}
      >
        {qty}
      </div>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
        className="flex w-9 items-center justify-center text-navy/60 transition-colors hover:bg-blush/30 hover:text-terracotta"
      >
        <span aria-hidden className="text-lg leading-none">+</span>
      </button>
    </div>
  );
}

// ── Trust item ────────────────────────────────────────────────────────────────

function TrustItem({
  icon,
  label,
  sublabel,
}: {
  icon: ReactNode;
  label: string;
  sublabel?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blush/40 text-terracotta">
        {icon}
      </div>
      <div className="font-body text-xs text-navy/60 leading-snug">
        {label}
        {sublabel && <> — {sublabel}</>}
      </div>
    </div>
  );
}

// ── Trust icons ───────────────────────────────────────────────────────────────

function MadeToOrderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CustomizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
