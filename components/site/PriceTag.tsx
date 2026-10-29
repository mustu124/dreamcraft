import type { ReactNode } from "react";
import { formatINR, normaliseDiscount, originalPrice } from "@/lib/config/pricing";

// Selling price, with the struck-through original and a "% OFF" tag when the
// product has a discount set (see lib/config/pricing.ts).

const SIZES = {
  sm: { price: "text-sm",  was: "text-xs",   off: "text-[10px]" },
  lg: { price: "text-2xl", was: "text-base", off: "text-xs" },
} as const;

export default function PriceTag({
  price,
  discountPercent,
  prefix,
  size = "sm",
  className = "",
  children,
}: {
  price: number;
  discountPercent: number;
  prefix?: string;
  size?: keyof typeof SIZES;
  className?: string;
  children?: ReactNode;
}) {
  const off = normaliseDiscount(discountPercent);
  const was = originalPrice(price, off);
  const s   = SIZES[size];

  return (
    <span className={`flex flex-wrap items-baseline gap-x-1.5 font-body ${className}`}>
      {was != null && (
        <span className={`${s.was} font-normal text-navy/40 line-through`}>
          <span className="sr-only">Original price </span>{formatINR(was)}
        </span>
      )}
      <span className={`${s.price} font-semibold text-navy`}>
        {prefix}{formatINR(price)}
      </span>
      {children}
      {was != null && (
        <span className={`${s.off} font-semibold uppercase tracking-wide text-terracotta`}>
          {off}% off
        </span>
      )}
    </span>
  );
}
