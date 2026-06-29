import Link from "next/link";
import ProductCard from "./ProductCard";
import Reveal from "@/components/Reveal";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BestsellerProduct = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  categorySlug: string;
  image: string | null;
  minPrice: number | null;
  hasMultipleVariants: boolean;
};

// ── Section ───────────────────────────────────────────────────────────────────

export default function BestsellersSection({
  products,
}: {
  products: BestsellerProduct[];
}) {
  if (!products.length) return null;

  return (
    <section className="bg-blush/20 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Heading ──────────────────────────────────────────────── */}
        <Reveal className="mb-10 text-center">
          <p className="mb-2 font-body text-[11px] uppercase tracking-[0.22em] text-terracotta">
            Fan Favourites
          </p>
          <h2 className="font-heading italic text-3xl text-navy md:text-4xl">
            Our Bestsellers
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-terracotta/40" />
          <p className="mx-auto mt-3 max-w-xl font-body text-sm text-navy/55 md:text-base">
            Loved again and again — the pieces our customers keep coming back for.
          </p>
        </Reveal>

        {/* ── Card grid ────────────────────────────────────────────── */}
        <div
          className={[
            "flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2",
            "md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0",
            "lg:grid-cols-5",
          ].join(" ")}
        >
          {products.map((product, i) => (
            <Reveal
              key={product.id}
              delay={i * 60}
              className="w-[200px] flex-none snap-start md:w-auto"
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <Reveal className="mt-10 flex justify-center" delay={200}>
          <Link
            href="/shop"
            className="rounded-full border-2 border-terracotta px-8 py-2.5 font-body text-sm font-medium text-terracotta transition-all duration-200 hover:bg-terracotta hover:text-ivory hover:scale-105"
          >
            View All Products
          </Link>
        </Reveal>

      </div>
    </section>
  );
}
