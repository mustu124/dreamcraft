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
          Drag to reorder. Active images appear in the homepage gallery section.
        </p>
      </div>
      <GalleryManager initialItems={(data ?? []) as GalleryRow[]} />
    </div>
  );
}
