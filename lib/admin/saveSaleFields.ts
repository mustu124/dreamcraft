import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseDiscount } from "@/lib/config/pricing";

// Writes products.discount_percent and products.in_stock. Kept as its own
// update (like saveDisabledOptions) so a database that hasn't had the columns
// added yet still saves every other field — the caller gets a warning instead.
//
//   alter table products add column if not exists discount_percent int not null default 0;
//   alter table products add column if not exists in_stock boolean not null default true;

export const SALE_COLUMNS_SQL =
  "alter table products add column if not exists discount_percent int not null default 0; " +
  "alter table products add column if not exists in_stock boolean not null default true;";

export function isMissingSaleColumn(error: { message: string } | null): boolean {
  return !!error && /discount_percent|in_stock/.test(error.message);
}

export async function saveSaleFields(
  admin: SupabaseClient,
  productId: string,
  discountPercent: unknown,
  inStock: unknown,
): Promise<string | null> {
  const { error } = await admin
    .from("products")
    .update({
      discount_percent: normaliseDiscount(discountPercent),
      in_stock:         inStock !== false,
    })
    .eq("id", productId);

  if (!error) return null;
  if (isMissingSaleColumn(error)) {
    return "Product saved, but the discount / stock settings couldn't be stored — the " +
      "columns are missing. Run in the Supabase SQL editor: " + SALE_COLUMNS_SQL;
  }
  return `Product saved, but the discount / stock settings failed to save: ${error.message}`;
}
