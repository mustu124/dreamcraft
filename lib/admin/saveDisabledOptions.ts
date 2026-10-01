import type { SupabaseClient } from "@supabase/supabase-js";

// Writes products.disabled_options (the admin on/off switches for the
// product-page pickers). Kept as its own update so a database that hasn't had
// the column added yet still saves every other field — the caller gets a
// warning string back instead of a failed save.
//
//   alter table products add column if not exists disabled_options text[];

export async function saveDisabledOptions(
  admin: SupabaseClient,
  productId: string,
  value: unknown,
): Promise<string | null> {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;

  const { error } = await admin
    .from("products")
    .update({ disabled_options: value })
    .eq("id", productId);

  if (!error) return null;
  if (error.message.includes("disabled_options")) {
    return "Product saved, but the option on/off switches couldn't be stored — the " +
      "disabled_options column is missing. Run in the Supabase SQL editor: " +
      "alter table products add column if not exists disabled_options text[];";
  }
  return `Product saved, but the option switches failed to save: ${error.message}`;
}
