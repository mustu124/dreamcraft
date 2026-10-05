// Business WhatsApp number — same one shown on the Contact page.
// Format: countrycode + number, no symbols (matches wa.me's expected format).
export const WHATSAPP_NUMBER = "919008448040";

export type WhatsAppOrderItem = {
  name: string;
  variantLabel: string;
  colorLabel?: string;
  qty: number;
  price: number;
  url?: string; // product page link
};

export type WhatsAppOrderDetails = {
  orderNumber: string | number;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  items: WhatsAppOrderItem[];
  subtotal: number;
  shipping: number;
  giftWrap?: boolean;
  giftWrapFee?: number;
  total: number;
};

function rupee(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

// Builds a wa.me deep link pre-filled with the order summary (each item with
// a link to its product page), so the store owner receives everything needed
// to confirm the order and arrange payment in one WhatsApp message.
export function buildOrderWhatsAppLink(order: WhatsAppOrderDetails): string {
  const lines = [
    `New order #${order.orderNumber}`,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    "",
    "Items:",
    ...order.items.flatMap((i) => [
      `- ${i.name} (${i.variantLabel}${i.colorLabel ? `, ${i.colorLabel}` : ""}) x${i.qty} — ${rupee(i.price * i.qty)}`,
      ...(i.url ? [`  ${i.url}`] : []),
    ]),
    "",
    `Subtotal: ${rupee(order.subtotal)}`,
    `Shipping: ${order.shipping === 0 ? "Free" : rupee(order.shipping)}`,
    ...(order.giftWrap ? [`Gift box packing: ${rupee(order.giftWrapFee ?? 0)}`] : []),
    `Total: ${rupee(order.total)}`,
    "",
    "Delivery address:",
    order.addressLine1,
    ...(order.addressLine2 ? [order.addressLine2] : []),
    `${order.city}, ${order.state} - ${order.pincode}`,
    "",
    "Please confirm my order and share the payment details.",
  ];

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
