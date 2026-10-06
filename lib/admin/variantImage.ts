// product_variants.image_url — the optional picture shown on the product page
// when a customer picks that variant. Helpers so the admin product routes keep
// saving everything else on a database that hasn't had the column added yet.
//
//   alter table product_variants add column if not exists image_url text;

export function isMissingVariantImageColumn(error: { message: string } | null): boolean {
  return !!error && error.message.includes("image_url");
}

export const VARIANT_IMAGE_WARNING =
  "Product saved, but the option pictures couldn't be stored — the image_url column is " +
  "missing. Run in the Supabase SQL editor: " +
  "alter table product_variants add column if not exists image_url text;";
