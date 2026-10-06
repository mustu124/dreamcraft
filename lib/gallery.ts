import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryImage } from "@/components/site/GallerySection";

// The public gallery is derived from the live catalogue, so it can never show
// a photo of something that isn't for sale: one tile per active product,
// linking to its product page. Adding, deactivating or deleting a product is
// reflected here automatically.
//
// The gallery_images table (admin → Gallery) only curates that list:
//   • a row whose photo belongs to an active product pins that photo, caption
//     and position for the product;
//   • switching such a row off hides the product from the gallery;
//   • rows whose photo no longer belongs to any active product are ignored.
// Products without a row follow the curated ones, newest first, using their
// primary photo.

type GalleryRow = { id: string; image_url: string; caption: string | null; is_active: boolean };
type ProductRow = {
  id: string;
  sku: string;
  name: string;
  product_images: { url: string; sort_order: number }[];
};

export async function getProductGallery(
  supabase: SupabaseClient,
  limit?: number,
): Promise<GalleryImage[]> {
  const [{ data: rawRows }, { data: rawProducts }] = await Promise.all([
    supabase
      .from("gallery_images")
      .select("id, image_url, caption, is_active")
      .order("sort_order"),
    supabase
      .from("products")
      .select("id, sku, name, product_images(url, sort_order)")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const rows     = (rawRows ?? []) as GalleryRow[];
  const products = (rawProducts ?? []) as ProductRow[];

  const productByUrl = new Map<string, ProductRow>();
  for (const p of products) {
    for (const img of p.product_images ?? []) productByUrl.set(img.url, p);
  }

  const images: GalleryImage[] = [];
  const placed = new Set<string>(); // product ids already shown or hidden

  for (const row of rows) {
    const product = productByUrl.get(row.image_url);
    if (!product || placed.has(product.id)) continue;
    placed.add(product.id);
    if (!row.is_active) continue;
    images.push({
      id:         row.id,
      image_url:  row.image_url,
      caption:    row.caption ?? product.name,
      productSku: product.sku,
    });
  }

  for (const product of products) {
    if (placed.has(product.id)) continue;
    const primary = [...(product.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    if (!primary) continue;
    images.push({
      id:         `product-${product.id}`,
      image_url:  primary.url,
      caption:    product.name,
      productSku: product.sku,
    });
  }

  return limit ? images.slice(0, limit) : images;
}
