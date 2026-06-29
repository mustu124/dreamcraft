"use client";

import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export type Subcategory = { id: string; name: string; slug: string };
export type CategoryWithSubs = {
  id: string;
  name: string;
  slug: string;
  icon_image_url: string | null;
  subcategories: Subcategory[];
};

export default function ShopByCategory({
  categories,
  categoryImages = {},
}: {
  categories: CategoryWithSubs[];
  categoryImages?: Record<string, string>;
}) {
  if (!categories.length) return null;

  return (
    <section className="bg-ivory py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <Reveal className="mb-12 text-center">
          <p className="mb-2 font-body text-[11px] uppercase tracking-[0.22em] text-terracotta">
            Explore
          </p>
          <h2 className="font-heading italic text-3xl text-navy md:text-4xl">
            Shop by Category
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-terracotta/40" />
        </Reveal>

        {/* Card grid — 1 col mobile, 3 cols sm+ */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {categories.map((cat, i) => {
            const imageUrl = categoryImages[cat.id] ?? cat.icon_image_url ?? null;
            return (
              <Reveal key={cat.id} delay={i * 130}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-md transition-shadow duration-300 hover:shadow-xl"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 639px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blush/40">
                      <span className="font-heading italic text-5xl text-terracotta/60">
                        {cat.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/25 to-transparent transition-opacity duration-300 group-hover:from-navy/85" />

                  {/* Text */}
                  <div className="absolute inset-x-0 bottom-0 p-5 transition-transform duration-300 group-hover:-translate-y-2">
                    <p className="font-heading italic text-xl text-ivory drop-shadow md:text-2xl">
                      {cat.name}
                    </p>
                    {cat.subcategories.length > 0 && (
                      <p className="mt-0.5 font-body text-xs text-ivory/70">
                        {cat.subcategories.length} collections
                      </p>
                    )}
                  </div>

                  {/* Hover pill */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-end p-5 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span className="rounded-full bg-terracotta px-4 py-1.5 font-body text-xs font-semibold text-ivory shadow-md translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      Shop Now →
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
