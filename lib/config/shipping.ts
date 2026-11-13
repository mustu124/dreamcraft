// Shipping fee rules — imported by both client components (display) and
// the /api/orders Route Handler (server-side recomputation).

// Flat fee by destination, no free-shipping threshold: Bangalore addresses
// pay the local rate, everywhere else in India the standard rate.
export const BANGALORE_SHIPPING_FEE_INR = 120;
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

// Without a destination (e.g. the cart page) this returns the standard rate.
export function calcShipping(_subtotalInr: number, destination?: ShippingDestination): number {
  return destination && isBangalore(destination)
    ? BANGALORE_SHIPPING_FEE_INR
    : STANDARD_SHIPPING_FEE_INR;
}

export function rupee(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
