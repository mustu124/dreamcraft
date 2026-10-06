"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { PRICE_UNIT_LABELS } from "@/lib/config/priceUnitLabels";
import {
  VARIANT_AXIS_LABELS,
  MULTI_COLOR_SLOTS,
  CHOICE_AXES,
  OPTION_COLOR,
  OPTION_FINISH,
  choiceOptionKey,
} from "@/lib/config/productOptions";
import {
  DARK_SHADES,
  PASTEL_SHADES,
  COLOR_GROUP_LABELS,
  COLOR_FINISH_LABELS,
  type ColorGroup,
  type ColorFinish,
} from "@/lib/config/colorOptions";

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
  // `image` — optional photo tied to this variant (admin panel, per variant).
  variants: { id: string; label: string; price: number; image?: string | null }[];
  isCandleCategory: boolean;
  showPlantsNote: boolean;
  // Pickers the admin switched off for this product (see productOptions.ts).
  disabledOptions: string[];
};

// One colour/finish selection. A product normally has a single one of these;
// certain "set" variants have one per bundled piece (see MULTI_COLOR_SLOTS).
type ShadeSel = { group: ColorGroup | null; shade: string | null; finish: ColorFinish | null };
const emptyShade = (): ShadeSel => ({ group: null, shade: null, finish: null });

// Which parts of the colour flow this product asks for — either can be
// switched off from the admin panel.
type ShadeParts = { color: boolean; finish: boolean };

function isShadeDone(s: ShadeSel, parts: ShadeParts): boolean {
  return (!parts.color || (!!s.group && !!s.shade)) && (!parts.finish || !!s.finish);
}

function formatShade(s: ShadeSel, parts: ShadeParts): string | null {
  if (!isShadeDone(s, parts)) return null;
  if (parts.color && parts.finish)
    return `${s.shade} (${COLOR_GROUP_LABELS[s.group!]}, ${COLOR_FINISH_LABELS[s.finish!]})`;
  if (parts.color) return `${s.shade} (${COLOR_GROUP_LABELS[s.group!]})`;
  if (parts.finish) return `${COLOR_FINISH_LABELS[s.finish!]} finish`;
  return null;
}

// ── Description formatting ────────────────────────────────────────────────────
// Breaks the description onto a new line right before "Size:"/"Sizes:" (with
// or without an "Available" prefix), so the dimensions read as their own line
// instead of running on from the marketing copy.

function formatDescription(description: string) {
  const parts = description.split(/(?=(?:Available\s+)?[Ss]izes?:)/);
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {part.trim()}
    </span>
  ));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductInfo({
  product,
  onVariantImage,
}: {
  product: ProductInfoData;
  onVariantImage?: (url: string) => void;
}) {
  const { addItem }      = useCart();
  const router           = useRouter();
  const [variantIdx, setVariantIdx] = useState(0);
  const [qty, setQty]               = useState(1);

  const variant = product.variants[variantIdx];

  // Colour and finish are required preferences unless switched off for this
  // product in the admin panel — a note for the artisan, not a real priced
  // variant, so they never change price/stock.
  const disabled = new Set(product.disabledOptions);
  const shadeParts: ShadeParts = {
    color:  !disabled.has(OPTION_COLOR),
    finish: !disabled.has(OPTION_FINISH),
  };
  const requiresColor = shadeParts.color || shadeParts.finish;

  const variantAxisLabel = VARIANT_AXIS_LABELS[product.sku] ?? "Size";

  // Colour slots for the *current* variant. `[""]` = one shared, unnamed
  // picker (the common case); named slots (e.g. "Style 1"/"Style 2"/"Style 3")
  // show one full picker each.
  const colorSlots = useMemo<string[]>(() => {
    if (!requiresColor) return [];
    return MULTI_COLOR_SLOTS[product.sku]?.[variant?.label ?? ""] ?? [""];
  }, [requiresColor, product.sku, variant?.label]);

  // Extra required "pick one" axes (e.g. coaster Shape) — not priced, not colour.
  const choiceAxes = useMemo(
    () =>
      (CHOICE_AXES[product.sku] ?? []).filter(
        (ax) => !product.disabledOptions.includes(choiceOptionKey(ax.name)),
      ),
    [product.sku, product.disabledOptions],
  );

  const [shades, setShades]   = useState<ShadeSel[]>([emptyShade()]);
  const [axisSel, setAxisSel] = useState<(string | null)[]>(() => choiceAxes.map(() => null));

  // Re-size the shade array whenever the slot count changes (variant switch).
  useEffect(() => {
    setShades((prev) => {
      const next = colorSlots.map((_, i) => prev[i] ?? emptyShade());
      return next.length ? next : [emptyShade()];
    });
  }, [colorSlots]);

  function patchShade(idx: number, patch: Partial<ShadeSel>) {
    setShades((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const merged = { ...s, ...patch };
        // Selecting a group clears the shade+finish below it; a shade clears finish.
        if ("group" in patch)  { merged.shade = null; merged.finish = null; }
        if ("shade" in patch)  { merged.finish = null; }
        return merged;
      }),
    );
  }

  // ── Derived: is the selection complete, and what's the artisan note? ───────
  const activeShades = shades.slice(0, Math.max(1, colorSlots.length));

  const shadesDone =
    !requiresColor || activeShades.every((s) => isShadeDone(s, shadeParts));
  const axesDone = choiceAxes.every((_, i) => !!axisSel[i]);

  const noteSegments: string[] = [];
  choiceAxes.forEach((ax, i) => {
    if (axisSel[i]) noteSegments.push(`${ax.name}: ${axisSel[i]}`);
  });
  if (requiresColor && shadesDone) {
    if (colorSlots.length <= 1 && colorSlots[0] === "") {
      const f = formatShade(activeShades[0], shadeParts);
      if (f) noteSegments.push(f);
    } else {
      colorSlots.forEach((name, i) => {
        const f = formatShade(activeShades[i], shadeParts);
        if (f) noteSegments.push(`${name}: ${f}`);
      });
    }
  }
  const colorLabel = noteSegments.length ? noteSegments.join("; ") : null;

  const canSubmit = !!variant && shadesDone && axesDone;

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
      image:        variant!.image ?? product.images[0] ?? "",
      ...(colorLabel ? { colorLabel } : {}),
    };
  }

  function handleAddToCart() {
    if (!canSubmit) return;
    const base = buildCartBase();
    for (let i = 0; i < qty; i++) addItem(base);
  }

  function handleBuyNow() {
    if (!canSubmit) return;
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
            {variantAxisLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantIdx(i);
                  if (v.image) onVariantImage?.(v.image);
                }}
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

      {/* ── Extra choice axes (e.g. Shape) ─────────────────────── */}
      {choiceAxes.map((ax, i) => (
        <div key={ax.name}>
          <p className="mb-2.5 font-body text-[10px] uppercase tracking-widest text-navy/40">
            {ax.name} *
          </p>
          <div className="flex flex-wrap gap-2">
            {ax.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setAxisSel((prev) => prev.map((v, n) => (n === i ? opt : v)))
                }
                aria-pressed={axisSel[i] === opt}
                className={[
                  "rounded-xl border px-3.5 py-2 font-body text-sm transition-all duration-200",
                  axisSel[i] === opt
                    ? "border-terracotta bg-terracotta/8 text-terracotta shadow-sm"
                    : "border-navy/18 text-navy/65 hover:border-navy/45",
                ].join(" ")}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* ── Colour selector(s) ─────────────────────────────────── */}
      {requiresColor && (
        <div className="flex flex-col gap-5">
          {colorSlots.map((slotName, i) => (
            <ShadePicker
              key={slotName || "color"}
              heading={`${shadeParts.color ? "Color" : "Finish"}${slotName ? ` — ${slotName}` : ""} *`}
              parts={shadeParts}
              value={activeShades[i] ?? emptyShade()}
              onChange={(patch) => patchShade(i, patch)}
            />
          ))}
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

        {product.showPlantsNote && (
          <p className="font-body text-xs italic text-navy/45">
            Prices mentioned are exclusive of flowers and plants
          </p>
        )}

        {/* Add to Cart — primary */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleAddToCart}
          className="w-full rounded-full bg-terracotta py-3.5 font-body text-sm font-medium text-ivory shadow-sm transition-all duration-200 hover:bg-terracotta/90 hover:shadow-md disabled:opacity-40"
        >
          Add to Cart
        </button>

        {/* Buy Now — secondary */}
        <button
          type="button"
          disabled={!canSubmit}
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
          {formatDescription(product.description)}
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
        <TrustItem icon={<LockIcon />} label="Order confirmed personally on WhatsApp" />
      </div>
    </div>
  );
}

// ── Shade picker ──────────────────────────────────────────────────────────────
// One colour group -> shade -> finish flow. Rendered once for a normal
// product, and once per bundled piece for multi-colour "set" variants.

function ShadePicker({
  heading,
  parts,
  value,
  onChange,
}: {
  heading: string;
  parts: ShadeParts;
  value: ShadeSel;
  onChange: (patch: Partial<ShadeSel>) => void;
}) {
  const label = formatShade(value, parts);
  // With colour switched off, the finish buttons are the whole picker.
  const showFinish = parts.finish && (!parts.color || !!value.shade);

  return (
    <div>
      <p className="mb-2.5 font-body text-[10px] uppercase tracking-widest text-navy/40">
        {heading}
      </p>
      {parts.color && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COLOR_GROUP_LABELS) as ColorGroup[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ group: g })}
              aria-pressed={value.group === g}
              className={[
                "rounded-xl border px-3.5 py-2 font-body text-sm transition-all duration-200",
                value.group === g
                  ? "border-terracotta bg-terracotta/8 text-terracotta shadow-sm"
                  : "border-navy/18 text-navy/65 hover:border-navy/45",
              ].join(" ")}
            >
              {COLOR_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      )}

      {parts.color && value.group && (
        <div className="mt-3 flex flex-wrap gap-3">
          {(value.group === "dark" ? DARK_SHADES : PASTEL_SHADES).map((shade) => (
            <button
              key={shade.name}
              type="button"
              onClick={() => onChange({ shade: shade.name })}
              aria-pressed={value.shade === shade.name}
              aria-label={shade.name}
              title={shade.name}
              className={[
                "h-8 w-8 flex-shrink-0 rounded-full transition-all duration-200",
                value.shade === shade.name
                  ? "ring-2 ring-terracotta ring-offset-2 scale-110"
                  : "hover:scale-105",
              ].join(" ")}
              style={{ backgroundColor: shade.hex, boxShadow: "inset 0 0 0 1px rgba(43,58,130,0.15)" }}
            />
          ))}
        </div>
      )}

      {showFinish && (
        <div className={parts.color ? "mt-3" : ""}>
          {parts.color && (
            <p className="mb-2 font-body text-[10px] uppercase tracking-widest text-navy/40">
              Finish *
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(COLOR_FINISH_LABELS) as ColorFinish[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ finish: f })}
                aria-pressed={value.finish === f}
                className={[
                  "rounded-xl border px-3.5 py-2 font-body text-sm transition-all duration-200",
                  value.finish === f
                    ? "border-terracotta bg-terracotta/8 text-terracotta shadow-sm"
                    : "border-navy/18 text-navy/65 hover:border-navy/45",
                ].join(" ")}
              >
                {COLOR_FINISH_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      {label && (
        <p className="mt-2.5 font-body text-xs text-navy/50">
          Selected: {label}
        </p>
      )}
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
