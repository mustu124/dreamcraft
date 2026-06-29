import { createClient } from "@/lib/supabase/server";
import HeroCarousel from "@/components/site/HeroCarousel";
import ShopByCategory from "@/components/site/ShopByCategory";
import BestsellersSection from "@/components/site/BestsellersSection";
import BehindTheCraft from "@/components/site/BehindTheCraft";
import TestimonialsCarousel from "@/components/site/TestimonialsCarousel";
import GallerySection from "@/components/site/GallerySection";
import AboutSection from "@/components/site/AboutSection";
import type { Banner } from "@/components/site/HeroCarousel";
import type { CategoryWithSubs } from "@/components/site/ShopByCategory";
import type { BestsellerProduct } from "@/components/site/BestsellersSection";
import type { ProcessClip } from "@/components/site/BehindTheCraft";
import type { Testimonial } from "@/components/site/TestimonialsCarousel";
import type { GalleryImage } from "@/components/site/GallerySection";

// Raw shape returned by the Supabase bestsellers joined query
type ProductRaw = {
  id: string;
  name: string;
  sku: string;
  categories: { name: string; slug: string } | null;
  product_images: { url: string; sort_order: number }[];
  product_variants: { price: number }[];
};

type CatImageRaw = {
  category_id: string;
  product_images: { url: string; sort_order: number }[];
};

export default async function HomePage() {
  const supabase = createClient();

  // All fetches run in parallel — no waterfall
  const [
    { data: banners },
    { data: categories },
    { data: rawBestsellers },
    { data: rawClips },
    { data: rawTestimonials },
    { data: rawGallery },
    { data: rawCatImages },
  ] = await Promise.all([
    supabase
      .from("banners")
      .select("id, image_url, mobile_image_url, link_url")
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("categories")
      .select("id, name, slug, icon_image_url, subcategories(id, name, slug, sort_order)")
      .order("sort_order")
      .order("sort_order", { referencedTable: "subcategories" }),

    supabase
      .from("products")
      .select("id, name, sku, categories(name, slug), product_images(url, sort_order), product_variants(price)")
      .eq("is_bestseller", true)
      .eq("is_active", true)
      .order("sort_order")
      .limit(10),

    // process_clips schema: id, title, thumbnail_url, video_url, sort_order, is_active
    supabase
      .from("process_clips")
      .select("id, title, thumbnail_url, video_url")
      .eq("is_active", true)
      .order("sort_order"),

    // testimonials schema: id, customer_name, customer_city, customer_photo_url,
    //                       review_text, rating, sort_order, is_active
    supabase
      .from("testimonials")
      .select("id, customer_name, customer_city, customer_photo_url, review_text, rating")
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("gallery_images")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order"),

    // One product image per category — used to fill category cards
    supabase
      .from("products")
      .select("category_id, product_images(url, sort_order)")
      .eq("is_active", true)
      .order("sort_order")
      .limit(60),
  ]);

  // Shape the raw response into what BestsellersSection expects.
  // Supabase's generic type infers the FK join (categories) as an array; we
  // cast via unknown to override it with our narrower ProductRaw type.
  const bestsellers: BestsellerProduct[] = ((rawBestsellers ?? []) as unknown as ProductRaw[]).map((p) => {
    const firstImage = [...p.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    const prices = p.product_variants.map((v) => v.price);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryName: p.categories?.name ?? "",
      categorySlug: p.categories?.slug ?? "",
      image: firstImage,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      hasMultipleVariants: prices.length > 1,
    };
  });

  const clips: ProcessClip[]       = (rawClips        ?? []) as ProcessClip[];
  const testimonials: Testimonial[] = (rawTestimonials ?? []) as Testimonial[];
  const gallery: GalleryImage[]     = (rawGallery      ?? []) as GalleryImage[];

  // Build { categoryId → firstProductImageUrl } for the category cards
  const categoryImages: Record<string, string> = {};
  for (const prod of ((rawCatImages ?? []) as unknown as CatImageRaw[])) {
    const catId = prod.category_id;
    if (catId && !categoryImages[catId] && prod.product_images?.length) {
      const sorted = [...prod.product_images].sort((a, b) => a.sort_order - b.sort_order);
      if (sorted[0]?.url) categoryImages[catId] = sorted[0].url;
    }
  }

  return (
    <>
      <div className="-mt-20">
        <HeroCarousel banners={(banners ?? []) as Banner[]} />
      </div>
      <ShopByCategory
        categories={(categories ?? []) as CategoryWithSubs[]}
        categoryImages={categoryImages}
      />
      <BestsellersSection products={bestsellers} />
      <BehindTheCraft clips={clips} />
      <TestimonialsCarousel testimonials={testimonials} />
      <GallerySection images={gallery} />
      <AboutSection />
    </>
  );
}
