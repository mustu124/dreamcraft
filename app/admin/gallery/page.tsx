import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GalleryManager } from "./_components/GalleryManager";

export const metadata: Metadata = { title: "Gallery | Dreamcraft Admin" };

export type GalleryRow = {
  id:         string;
  image_url:  string;
  caption:    string | null;
  alt_text:   string | null;
  sort_order: number;
  is_active:  boolean;
};

export default async function GalleryPage() {
  const { data } = await createClient()
    .from("gallery_images")
    .select("*")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          The website gallery is built automatically from your active products, so it
          always matches the shop. Photos here set the order (drag to reorder) and
          caption for a product; switching one off hides that product from the gallery.
          Photos that don&apos;t belong to an active product are not shown.
        </p>
      </div>
      <GalleryManager initialItems={(data ?? []) as GalleryRow[]} />
    </div>
  );
}
