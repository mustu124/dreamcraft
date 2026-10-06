"use client";

import { useCallback, useState } from "react";
import ProductGallery from "./ProductGallery";
import ProductInfo, { type ProductInfoData } from "./ProductInfo";

// Client wrapper around the two product-page columns. They share one piece of
// state: when the customer picks a variant that has its own picture (set per
// variant in the admin panel), the gallery jumps to that picture.

export default function ProductDetail({ product }: { product: ProductInfoData }) {
  // `n` changes on every pick so re-selecting the same variant re-focuses its
  // picture even after the customer has browsed to another thumbnail.
  const [focus, setFocus] = useState<{ url: string; n: number } | null>(null);
  const focusImage = useCallback(
    (url: string) => setFocus((prev) => ({ url, n: (prev?.n ?? 0) + 1 })),
    [],
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">

      {/* LEFT: Gallery — sticky on desktop so it stays visible while
          the right column scrolls through longer product info */}
      <div className="lg:sticky lg:top-[80px] lg:self-start">
        <ProductGallery images={product.images} name={product.name} focus={focus} />
      </div>

      {/* RIGHT: Product info */}
      <ProductInfo product={product} onVariantImage={focusImage} />
    </div>
  );
}
