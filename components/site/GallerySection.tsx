"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GalleryImage = {
  id: string;
  image_url: string;
  caption: string | null;
  alt_text?: string | null;
  productSku?: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GallerySection({ images, showAll = false }: { images: GalleryImage[]; showAll?: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = images.length;
  const isOpen = activeIndex !== null;

  const close   = useCallback(() => setActiveIndex(null), []);
  const goPrev  = useCallback(() => setActiveIndex((i) => (i === null ? null : (i - 1 + total) % total)), [total]);
  const goNext  = useCallback(() => setActiveIndex((i) => (i === null ? null : (i + 1) % total)), [total]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close, goPrev, goNext]);

  if (!total) return null;

  // Homepage shows 12; full gallery page shows all
  const gridImages = showAll ? images : images.slice(0, 12);

  return (
    <>
      <section className="py-14 md:py-20 bg-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {!showAll && (
            <Reveal className="mb-10 text-center">
              <p className="mb-2 font-body text-[11px] uppercase tracking-[0.22em] text-terracotta">
                Gallery
              </p>
              <h2 className="font-heading italic text-3xl text-navy md:text-4xl">
                Styled By You
              </h2>
              <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-terracotta/40" />
              <p className="mx-auto mt-3 max-w-xl font-body text-sm text-navy/55 md:text-base">
                Beautiful spaces, thoughtfully styled with Dreamcraft.
              </p>
            </Reveal>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {gridImages.map((img, i) => (
              <Reveal key={img.id} delay={i * 40}>
                <ImageCard
                  img={img}
                  index={i}
                  onOpen={() => setActiveIndex(i)}
                />
              </Reveal>
            ))}
          </div>

          {!showAll && total > 12 && (
            <Reveal className="mt-8 flex justify-center" delay={300}>
              <a
                href="/gallery"
                className="rounded-full border-2 border-navy/25 px-8 py-2.5 font-body text-sm font-medium text-navy transition-all duration-200 hover:border-terracotta hover:text-terracotta hover:scale-105"
              >
                View Full Gallery →
              </a>
            </Reveal>
          )}

        </div>
      </section>

      {/* ── Lightbox ──────────────────────────────────────────────── */}
      {isOpen && activeIndex !== null && (
        <Lightbox
          image={images[activeIndex]}
          index={activeIndex}
          total={total}
          onClose={close}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </>
  );
}

// ── Image card ────────────────────────────────────────────────────────────────

function ImageCard({
  img,
  index,
  onOpen,
}: {
  img: GalleryImage;
  index: number;
  onOpen: () => void;
}) {
  const alt = img.caption ?? `Gallery image ${index + 1}`;

  const photo = (
    <>
      <Image
        src={img.image_url}
        alt={alt}
        fill
        sizes="(max-width: 767px) calc(50vw - 10px), (max-width: 1279px) calc(25vw - 12px), 295px"
        priority={index < 4}
        draggable={false}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
      />

      <div className="pointer-events-none absolute inset-0 bg-navy/0 transition-colors duration-300 group-hover:bg-navy/20" />

      {img.caption && (
        <div className={[
          "pointer-events-none absolute inset-x-0 bottom-0",
          "translate-y-full opacity-0",
          "transition-all duration-300",
          "group-hover:translate-y-0 group-hover:opacity-100",
          "bg-gradient-to-t from-navy/70 via-navy/35 to-transparent",
          "px-3 pb-3 pt-8",
        ].join(" ")}>
          <p className="font-body text-[11px] leading-snug text-ivory line-clamp-2">
            {img.caption}
          </p>
        </div>
      )}
    </>
  );

  const overlayCls = "absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2";

  return (
    <div className="group relative w-full aspect-[4/5] overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
      {img.productSku ? (
        <Link href={`/shop/${img.productSku}`} aria-label={`Shop: ${alt}`} className={overlayCls}>
          {photo}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} aria-label={`Open: ${alt}`} className={overlayCls}>
          {photo}
        </button>
      )}

      {/* Zoom icon — sibling of the link/button above, not nested inside it,
          so it opens the lightbox without navigating away and without
          creating invalid interactive-in-interactive HTML nesting. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${alt} full size`}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ivory/0 transition-all duration-300 group-hover:bg-ivory/80 group-hover:scale-100 scale-75 opacity-0 group-hover:opacity-100"
      >
        <svg className="h-3.5 w-3.5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </button>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  image, index, total, onClose, onPrev, onNext,
}: {
  image: GalleryImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const alt = image.caption ?? "Gallery image";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <button type="button" aria-label="Close lightbox"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/15 text-ivory transition-colors hover:bg-ivory/30">
        <XIcon />
      </button>

      <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 font-body text-xs text-ivory/55 tabular-nums">
        {index + 1} / {total}
      </p>

      <button type="button" aria-label="Previous image"
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/15 text-ivory transition-colors hover:bg-ivory/30 md:left-6">
        <ChevronLeft />
      </button>

      <div
        key={image.id}
        className="relative mx-14 animate-fade-up md:mx-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image_url}
          alt={alt}
          draggable={false}
          className="block max-h-[82vh] max-w-[85vw] w-auto h-auto rounded-xl object-contain shadow-2xl md:max-w-[78vw]"
        />
        {image.caption && (
          <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-navy/65 via-navy/25 to-transparent px-5 pb-4 pt-10">
            <p className="font-body text-sm text-ivory/90">{image.caption}</p>
          </div>
        )}
      </div>

      <button type="button" aria-label="Next image"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/15 text-ivory transition-colors hover:bg-ivory/30 md:right-6">
        <ChevronRight />
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>;
}
function ChevronLeft() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
    <polyline points="15 18 9 12 15 6" />
  </svg>;
}
function ChevronRight() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
    <polyline points="9 18 15 12 9 6" />
  </svg>;
}
