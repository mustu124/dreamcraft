// A small number of products need a unit qualifier next to the price (e.g.
// "per tray") that stays the same regardless of which size/shape variant is
// selected — unlike the single-variant case, where the variant's own label
// already serves this purpose. Keyed by SKU.
export const PRICE_UNIT_LABELS: Record<string, string> = {
  "DC-TT-025": "per tray",  // Mystic shell Trays — Oval / Round / Big Oval, all per tray
  "DC-TT-022": "per tray",  // Victorian Trinkets — Style 1 / Style 2, all per tray
  "DC-CJ-004": "per piece", // Ocean Theme Candle — five shapes, all per piece
};
