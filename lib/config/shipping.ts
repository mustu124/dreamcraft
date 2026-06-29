// Shipping fee rules — imported by both client components (display) and
// the /api/orders Route Handler (server-side recomputation).

export const FREE_SHIPPING_ABOVE_INR = 999;
export const FLAT_SHIPPING_FEE_INR   = 79;

export function calcShipping(subtotalInr: number): number {
  return subtotalInr >= FREE_SHIPPING_ABOVE_INR ? 0 : FLAT_SHIPPING_FEE_INR;
}

export function rupee(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
