// Shipping fee rules — imported by both client components (display) and
// the /api/orders Route Handler (server-side recomputation).

export const FREE_SHIPPING_ABOVE_INR = 999;
export const FLAT_SHIPPING_FEE_INR   = 150;

// Optional individual gift box packing, offered at checkout.
export const GIFT_WRAP_FEE_INR = 60;

export function calcShipping(subtotalInr: number): number {
  return subtotalInr >= FREE_SHIPPING_ABOVE_INR ? 0 : FLAT_SHIPPING_FEE_INR;
}

export function rupee(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
