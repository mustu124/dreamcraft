import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreamcraft.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  // Fetch all active products and categories in parallel
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("sku, updated_at")
      .eq("is_active", true),
    supabase
      .from("categories")
      .select("slug")
      .order("sort_order"),
  ]);

  // ── Static routes ─────────────────────────────────────────────────────────

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:              SITE_URL,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         1.0,
    },
    {
      url:              `${SITE_URL}/shop`,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         0.9,
    },
    {
      url:              `${SITE_URL}/founder`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.5,
    },
  ];

  // ── Dynamic product pages /shop/[sku] ────────────────────────────────────

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url:             `${SITE_URL}/shop/${p.sku}`,
    lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority:        0.8,
  }));

  // ── Category filter pages /shop?category=[slug] ──────────────────────────
  // These are querystring URLs — useful for crawlers that follow them.

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url:             `${SITE_URL}/shop?category=${c.slug}`,
    lastModified:    new Date(),
    changeFrequency: "weekly" as const,
    priority:        0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
