// products.discount_percent — a display-only "% OFF" tag set per product in
// the admin panel. The variant price stays what the customer pays; the struck-
// through "original" price is worked back from it (₹600 at 40% → ₹1,000), so
// cart, checkout and invoices never need to know about the discount.

export const MAX_DISCOUNT_PERCENT = 90;

// Clamps anything the admin form / DB hands us to a whole 0–90 percentage.
export function normaliseDiscount(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_DISCOUNT_PERCENT);
}

// The crossed-out price shown next to `price`, or null when there's no discount.
export function originalPrice(price: number, discountPercent: number): number | null {
  const d = normaliseDiscount(discountPercent);
  if (!d) return null;
  return Math.round((price * 100) / (100 - d));
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
