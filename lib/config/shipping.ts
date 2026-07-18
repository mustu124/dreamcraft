// Shipping fee rules — imported by both client components (display) and
// the /api/orders Route Handler (server-side recomputation).

// Flat shipping fee — applies to every order, no free-shipping threshold.
export const FLAT_SHIPPING_FEE_INR = 150;

// Optional individual gift box packing, offered at checkout.
export const GIFT_WRAP_FEE_INR = 60;

export function calcShipping(_subtotalInr: number): number {
  return FLAT_SHIPPING_FEE_INR;
}

export function rupee(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
