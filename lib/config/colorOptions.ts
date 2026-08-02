// Color/finish preference required on every product page except
// Customization (fully bespoke there via Contact/WhatsApp already — that
// category never shows this picker at all). This is a customer preference
// for the artisan — it never affects price or stock, so it deliberately
// isn't modeled as a real product_variant. The choice is carried on the
// cart item as a plain label and passed through to the order as its own
// field (order_items.color_label).
//
// Flow: pick a shade group (Dark or Pastel) -> pick a specific shade in that
// group -> pick a finish (Blocked = solid color, or Marble = marbled
// effect). All three steps are required before the product can be added to
// the cart.

export type ColorShade = { name: string; hex: string };

export const DARK_SHADES: ColorShade[] = [
  { name: "Black",      hex: "#1A1A1A" },
  { name: "Red",        hex: "#B3202A" },
  { name: "Terracotta", hex: "#F07820" },
  { name: "Orange",     hex: "#E8630C" },
  { name: "Brown",      hex: "#5C4033" },
  { name: "Violet",     hex: "#6D3AA8" },
  { name: "Blue",       hex: "#1D4ED8" },
  { name: "Green",      hex: "#1B5E3A" },
  { name: "Yellow",     hex: "#C9971C" },
  { name: "Mocha",      hex: "#6F4E37" },
  { name: "Gold",       hex: "#C9A227" },
];

export const PASTEL_SHADES: ColorShade[] = [
  { name: "Dijon Yellow", hex: "#D4B14A" },
  { name: "Teal",         hex: "#6FB3B0" },
  { name: "Sage green",   hex: "#9CAF88" },
  { name: "Peach",        hex: "#F5C4A0" },
  { name: "Baby Pink",    hex: "#F4C2C2" },
  { name: "Pearl white",  hex: "#F8F6F0" },
  { name: "Beige",        hex: "#E8DCC8" },
  { name: "Cream",        hex: "#FBF3DE" },
  { name: "Warm grey",    hex: "#ABA49C" },
  { name: "Lavender",     hex: "#C6B6E3" },
  { name: "Soft Mauve",   hex: "#D8A7B1" },
  { name: "Ice Blue",     hex: "#D3E7ED" },
];

export type ColorGroup = "dark" | "pastel";

export const COLOR_GROUP_LABELS: Record<ColorGroup, string> = {
  dark:   "Dark Shades",
  pastel: "Pastel Shades",
};

export type ColorFinish = "blocked" | "marble";

export const COLOR_FINISH_LABELS: Record<ColorFinish, string> = {
  blocked: "Blocked",
  marble:  "Marble",
};

// Products in this category get to fully customize color/finish themselves
// via the Contact/WhatsApp flow, so the generic picker doesn't apply.
export const COLOR_PICKER_EXCLUDED_CATEGORY_SLUG = "customization";
