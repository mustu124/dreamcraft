// Per-SKU product-page option overrides.
//
// A few products need choices the generic product page doesn't model on its
// own. Keeping these keyed by SKU here — rather than inventing new DB columns
// — means the page stays data-driven for the other ~80 products.
//
// Three independent maps:
//
//  1. VARIANT_AXIS_LABELS — renames the variant button group. The picker is
//     labelled "Size" by default; for products whose variants are really
//     shapes or styles (same price, different look) that heading is wrong.
//
//  2. MULTI_COLOR_SLOTS — when a specific variant bundles several pieces that
//     are each coloured separately (e.g. Ladies Statue "Set of 3": one colour
//     per style), this lists the slot names. The page then shows one full
//     colour/finish picker per slot instead of a single shared one. Keyed by
//     SKU, then by the exact variant label.
//
//  3. CHOICE_AXES — extra required "pick one" selectors that aren't priced
//     variants and aren't colours (e.g. the coaster shape on the Customization
//     sets, which don't show the colour picker at all). The selected value is
//     carried to the cart/order as part of the artisan note, exactly like the
//     colour label.

import { COLOR_PICKER_EXCLUDED_CATEGORY_SLUG } from "./colorOptions";

export const VARIANT_AXIS_LABELS: Record<string, string> = {
  "DC-CJ-004": "Type",  // Ocean Theme Candle — shell shapes
  "DC-TT-022": "Style", // Victorian Trinkets — Style 1 / Style 2
  "DC-SS-002": "Style", // Ladies Statue — Style 1 / 2 / 3 / Set of 3
};

export const MULTI_COLOR_SLOTS: Record<string, Record<string, string[]>> = {
  "DC-SS-002": {
    "Set of 3": ["Style 1", "Style 2", "Style 3"],
  },
};

export type ChoiceAxis = { name: string; options: string[] };

export const CHOICE_AXES: Record<string, ChoiceAxis[]> = {
  // Customization sets — no colour picker, but the customer still picks a shape.
  "DC-CC-005": [{ name: "Shape", options: ["Round", "Square", "Hexagon"] }],
  "DC-CC-002": [{ name: "Shape", options: ["Hexagon", "Square", "Round"] }],
};

// ── Admin on/off switches for the required pickers ───────────────────────────
// products.disabled_options (text[]) lists the pickers the admin has switched
// off for that product: "color" (shade group + shade), "finish" (Blocked /
// Marble) and "choice:<axis name>" for a CHOICE_AXES entry (e.g.
// "choice:Shape"). NULL means "never set" and falls back to the defaults
// below, so products that predate the column behave exactly as before.

export const OPTION_COLOR  = "color";
export const OPTION_FINISH = "finish";
export const choiceOptionKey = (axisName: string) => `choice:${axisName}`;

// Customization products are fully bespoke via Contact/WhatsApp, so the
// colour/finish pickers start switched off there.
export function defaultDisabledOptions(categorySlug: string): string[] {
  return categorySlug === COLOR_PICKER_EXCLUDED_CATEGORY_SLUG ? [OPTION_COLOR, OPTION_FINISH] : [];
}

export function resolveDisabledOptions(
  stored: string[] | null | undefined,
  categorySlug: string,
): string[] {
  return Array.isArray(stored) ? stored : defaultDisabledOptions(categorySlug);
}
