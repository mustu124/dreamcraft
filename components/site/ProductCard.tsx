import Image from "next/image";
import Link from "next/link";
import type { BestsellerProduct } from "./BestsellersSection";

export default function ProductCard({ product }: { product: BestsellerProduct }) {
  const priceLabel = product.minPrice != null
    ? `${product.hasMultipleVariants ? "From " : ""}₹${product.minPrice.toLocaleString("en-IN")}`
    : null;

  return (
    <Link href={`/shop/${product.sku}`} className="group flex flex-col">

      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-blush/25 shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-terracotta/15">
        {product.image && product.image !== "/placeholder-product.jpg" ? (
          <>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 767px) 200px, (max-width: 1023px) 33vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            />
            {/* Warm shimmer overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-terracotta/0 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-transparent group-hover:via-terracotta/8 group-hover:to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blush/40">
            <span className="font-heading italic text-4xl text-terracotta/60">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Quick-view pill on hover */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="rounded-full bg-ivory/90 px-3 py-1 font-body text-[11px] font-semibold text-navy shadow backdrop-blur-sm">
            View Details
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 flex flex-col gap-0.5">
        {product.categoryName && (
          <span className="font-body text-[10px] uppercase tracking-widest text-navy/40">
            {product.categoryName}
          </span>
        )}
        <span className="font-heading italic text-[15px] leading-snug text-navy line-clamp-2 transition-colors duration-200 group-hover:text-terracotta">
          {product.name}
        </span>
        {priceLabel && (
          <span className="font-body text-sm font-semibold text-navy/80">
            {priceLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
