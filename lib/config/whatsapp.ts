// Business WhatsApp number — same one shown on the Contact page.
// Format: countrycode + number, no symbols (matches wa.me's expected format).
export const WHATSAPP_NUMBER = "919008448040";

export type WhatsAppOrderItem = {
  name: string;
  variantLabel: string;
  qty: number;
  price: number;
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
  screenshotUrl: string;
};

function rupee(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

// Builds a wa.me deep link pre-filled with the order summary and the payment
// screenshot URL, so the store owner receives everything needed to confirm
// the order in one WhatsApp message.
export function buildOrderWhatsAppLink(order: WhatsAppOrderDetails): string {
  const lines = [
    `New order #${order.orderNumber}`,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    "",
    "Items:",
    ...order.items.map(
      (i) => `- ${i.name} (${i.variantLabel}) x${i.qty} — ${rupee(i.price * i.qty)}`,
    ),
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
    `Payment screenshot: ${order.screenshotUrl}`,
  ];

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
