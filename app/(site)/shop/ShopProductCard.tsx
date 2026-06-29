"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

// ── Types ─────────────────────────────────────────────────────────────────────
// Exported so page.tsx can build this shape server-side.

export type ShopVariant = { id: string; label: string; price: number };

export type ShopProduct = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  categorySlug: string;
  images: string[];          // sorted by sort_order; [0] = primary, [1] = hover
  minPrice: number | null;
  variants: ShopVariant[];
  hasMultipleVariants: boolean;
};

// ── Card ──────────────────────────────────────────────────────────────────────

export default function ShopProductCard({ product }: { product: ShopProduct }) {
  const { addItem } = useCart();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const primaryImg    = product.images[0] ?? null;
  const secondImg     = product.images[1] ?? null;
  const isPlaceholder = !primaryImg || primaryImg === "/placeholder-product.jpg";

  const priceLabel = product.minPrice != null
    ? `${product.hasMultipleVariants ? "From " : ""}₹${product.minPrice.toLocaleString("en-IN")}`
    : null;

  // Close popover when clicking outside
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  // Close popover on Escape
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setPopoverOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [popoverOpen]);

  function addSingle() {
    const v = product.variants[0];
    if (!v) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      sku: product.sku,
      name: product.name,
      variantLabel: v.label,
      price: v.price,
      image: primaryImg ?? "",
    });
  }

  function addVariant(v: ShopVariant) {
    addItem({
      productId: product.id,
      variantId: v.id,
      sku: product.sku,
      name: product.name,
      variantLabel: v.label,
      price: v.price,
      image: primaryImg ?? "",
    });
    setPopoverOpen(false);
  }

  return (
    /*
     * Outer div: unnamed `group` — controls cart-button visibility.
     * Image wrapper: named `group/img` — controls the hover image swap.
     * Two named groups let each hover zone respond independently.
     */
    <div className="group relative flex flex-col">

      {/* ── Image wrapper ──────────────────────────────────────────── */}
      <div className="group/img relative aspect-square overflow-hidden rounded-2xl bg-blush/25">

        {/* Clickable image area — entire rounded square links to PDP */}
        <Link
          href={`/shop/${product.sku}`}
          aria-label={product.name}
          tabIndex={-1}
          className="absolute inset-0"
        >
          {isPlaceholder ? (
            <div className="flex h-full w-full items-center justify-center">
              <span className="select-none font-heading italic text-4xl text-terracotta/45">
                {product.name.charAt(0)}
              </span>
            </div>
          ) : (
            <>
              {/* Primary image — fades out on image-area hover */}
              <Image
                src={primaryImg!}
                alt={product.name}
                fill
                sizes="(max-width: 639px) calc(50vw - 12px), (max-width: 1023px) calc(33vw - 20px), calc(25vw - 24px)"
                draggable={false}
                className={[
                  "object-cover",
                  "transition-opacity duration-500",
                  secondImg ? "group-hover/img:opacity-0" : "",
                ].join(" ")}
              />

              {/* Secondary image — fades in on image-area hover */}
              {secondImg && (
                <Image
                  src={secondImg}
                  alt=""
                  fill
                  sizes="(max-width: 639px) calc(50vw - 12px), (max-width: 1023px) calc(33vw - 20px), calc(25vw - 24px)"
                  draggable={false}
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover/img:opacity-100"
                />
              )}
            </>
          )}
        </Link>

        {/* ── Cart / variant button — appears on card hover ──────── */}
        {/*
         * Positioned inside the image wrapper for correct bottom-right
         * alignment. z-10 keeps it above the image layers.
         * ref is on the wrapper so click-outside detection works for the
         * popover (which is a child of this same div).
         */}
        <div
          ref={popoverRef}
          className="absolute bottom-2 right-2 z-10"
        >
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={product.hasMultipleVariants
              ? () => setPopoverOpen((o) => !o)
              : addSingle}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-full",
              "bg-ivory shadow-md",
              "transition-all duration-200",
              // Fade in when any part of the card is hovered
              "opacity-0 group-hover:opacity-100",
              "hover:bg-terracotta hover:text-ivory hover:scale-105",
            ].join(" ")}
          >
            <BagPlusIcon />
          </button>

          {/* Variant quick-pick popover */}
          {popoverOpen && (
            <div
              role="listbox"
              aria-label="Select size"
              className="absolute bottom-full right-0 z-20 mb-2 w-52 overflow-hidden rounded-xl border border-navy/10 bg-ivory shadow-lg"
            >
              <p className="px-3 pb-2 pt-3 font-body text-[10px] uppercase tracking-widest text-navy/40">
                Select size
              </p>
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => addVariant(v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 font-body text-sm text-navy transition-colors hover:bg-blush/35 last:rounded-b-xl"
                >
                  <span>{v.label}</span>
                  <span className="text-navy/50">
                    ₹{v.price.toLocaleString("en-IN")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Text info ──────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-col gap-0.5">
        {product.categoryName && (
          <span className="font-body text-[10px] uppercase tracking-widest text-navy/40">
            {product.categoryName}
          </span>
        )}

        <Link
          href={`/shop/${product.sku}`}
          className="font-heading italic text-[15px] leading-snug text-navy line-clamp-2 transition-colors duration-200 hover:text-terracotta"
        >
          {product.name}
        </Link>

        {priceLabel && (
          <span className="mt-0.5 font-body text-sm font-semibold text-navy">
            {priceLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────

function BagPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  );
}
