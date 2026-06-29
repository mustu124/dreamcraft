"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed]       = useState(false);
  const touchStartX               = useRef(0);

  const isPlaceholder = images.length === 0 || images[0] === "/placeholder-product.jpg";
  const activeImg     = images[activeIdx] ?? "";

  // Body scroll lock while zoom lightbox is open
  useEffect(() => {
    if (!zoomed) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [zoomed]);

  // Escape closes lightbox
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomed(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomed]);

  // Touch swipe — 40 px threshold, same pattern as the homepage carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) < 40) return;
      setActiveIdx((i) =>
        delta > 0
          ? Math.max(0, i - 1)
          : Math.min(images.length - 1, i + 1),
      );
    },
    [images.length],
  );

  if (isPlaceholder) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-blush/30 flex items-center justify-center">
        <span className="select-none font-heading italic text-[8rem] leading-none text-terracotta/25">
          {name.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Main image ────────────────────────────────────────────── */}
      <div
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-blush/20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setZoomed(true)}
        role="button"
        tabIndex={0}
        aria-label="Click to zoom image"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setZoomed(true); }}
      >
        {/*
         * key={activeImg} remounts Image on slide change → re-triggers
         * animate-fade-up. priority on the first image targets LCP.
         * The parent is aspect-square + position:relative → fill works.
         */}
        <Image
          key={activeImg}
          src={activeImg}
          alt={`${name} — image ${activeIdx + 1} of ${images.length}`}
          fill
          sizes="(max-width: 1023px) calc(100vw - 32px), 576px"
          priority={activeIdx === 0}
          draggable={false}
          className="object-contain transition-opacity duration-300 animate-fade-up"
        />

        {/* Zoom hint badge — visible on desktop hover */}
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ivory/80 px-2.5 py-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <ZoomIcon />
          <span className="font-body text-[10px] text-navy/70">Click to zoom</span>
        </div>
      </div>

      {/* ── Thumbnail strip (desktop ≥ md) ───────────────────────── */}
      {images.length > 1 && (
        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View image ${i + 1}`}
              className={[
                "relative h-16 w-16 overflow-hidden rounded-xl transition-all duration-200",
                i === activeIdx
                  ? "ring-2 ring-terracotta ring-offset-2 ring-offset-ivory"
                  : "ring-1 ring-navy/15 hover:ring-navy/35",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── Dot indicators (mobile < md) ─────────────────────────── */}
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 md:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View image ${i + 1}`}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIdx ? "w-4 bg-terracotta" : "w-1.5 bg-navy/25",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {/* ── Zoom lightbox ─────────────────────────────────────────── */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-navy/92 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            aria-label="Close zoom"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/15 text-ivory transition-colors hover:bg-ivory/30"
          >
            <XIcon />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImg}
            alt={name}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] cursor-default rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-navy/60" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" className="h-5 w-5" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
