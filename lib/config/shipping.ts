// Shipping fee rules — imported by both client components (display) and
// the /api/orders Route Handler (server-side recomputation).

// No free-shipping threshold. Bangalore addresses always pay the lower rate;
// elsewhere in India a single item ships at the lower rate too, and two or
// more items (total quantity, not distinct products) at the higher one.
export const BANGALORE_SHIPPING_FEE_INR = 120;
export const SINGLE_ITEM_SHIPPING_FEE_INR = 120;
export const STANDARD_SHIPPING_FEE_INR  = 240;

// Optional individual gift box packing, offered at checkout.
export const GIFT_WRAP_FEE_INR = 60;

export type ShippingDestination = { city?: string; pincode?: string };

// Bangalore pincodes all start with 560. The pincode decides once it's fully
// typed; until then the city name is the best guess (common spellings only).
export function isBangalore({ city = "", pincode = "" }: ShippingDestination): boolean {
  const pin = pincode.trim();
  if (/^\d{6}$/.test(pin)) return pin.startsWith("560");
  return /\b(bangalore|bengaluru|banglore|bengalore)\b/i.test(city);
}

// Without a destination (e.g. the cart page) a multi-item order is priced at
// the standard rate, since it may be shipping outside Bangalore.
export function calcShipping(itemCount: number, destination?: ShippingDestination): number {
  if (destination && isBangalore(destination)) return BANGALORE_SHIPPING_FEE_INR;
  return itemCount <= 1 ? SINGLE_ITEM_SHIPPING_FEE_INR : STANDARD_SHIPPING_FEE_INR;
}

// True when the fee can't change with the address — the cart page shows it
// directly instead of "At checkout".
export function shippingKnownWithoutAddress(itemCount: number): boolean {
  return itemCount <= 1;
}

export function rupee(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
