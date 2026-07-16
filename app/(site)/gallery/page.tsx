import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GallerySection from "@/components/site/GallerySection";
import type { GalleryImage } from "@/components/site/GallerySection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "See Dreamcraft's handmade eco-resin décor and soy wax candles — real pieces, real homes.",
};

export default async function GalleryPage() {
  const { data } = await createClient()
    .from("gallery_images")
    .select("id, image_url, caption")
    .eq("is_active", true)
    .order("sort_order");

  const images = (data ?? []) as GalleryImage[];

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-blush/30 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="mb-4 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Our Work
          </p>
          <h1 className="font-heading italic text-4xl text-navy md:text-5xl">
            Gallery
          </h1>
        </div>
      </section>

      {/* ── Gallery grid ─────────────────────────────────────────────────────── */}
      {images.length === 0 ? (
        <section className="bg-ivory py-24 text-center">
          <p className="font-body text-base text-navy/40">
            Gallery coming soon — follow us on Instagram for the latest.
          </p>
          <a
            href="https://instagram.com/Dreamcraft_homedecor"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-body text-sm font-medium text-terracotta hover:underline"
          >
            @Dreamcraft_homedecor →
          </a>
        </section>
      ) : (
        <GallerySection images={images} showAll />
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-terracotta py-14 md:py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="font-heading italic text-2xl text-ivory md:text-3xl">
            Love what you see?
          </h2>
          <p className="mt-3 font-body text-sm text-ivory/75">
            Every piece is made to order — get yours today.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full border-2 border-ivory px-8 py-3
                       font-body text-sm font-medium text-ivory transition-all
                       hover:bg-ivory hover:text-terracotta"
          >
            Shop the Collection
          </Link>
        </div>
      </section>
    </>
  );
}
