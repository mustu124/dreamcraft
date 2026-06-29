"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type Banner = {
  id: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string | null;
};

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const count = banners.length;

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + count) % count),
    [count]
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % count),
    [count]
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, count, next]);

  if (!count) return <StaticHero />;

  return (
    <section
      aria-label="Featured banners"
      className="relative w-full overflow-hidden h-screen"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
      }}
    >
      {/* ── Slides ─────────────────────────────────────────────────── */}
      <div
        className="flex h-full will-change-transform transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner, i) => {
          const slideContent = (
            <>
              <picture className="absolute inset-0">
                <source media="(max-width: 767px)" srcSet={banner.mobile_image_url} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              </picture>

              {/* Gradient overlay */}
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

              {/* CTA + text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-4 text-center">
                <p className="mb-2 font-body text-[11px] uppercase tracking-[0.25em] text-ivory/80 animate-hero-in" style={{ animationDelay: "0.1s" }}>
                  Handmade · Made to Order · India
                </p>
                <h2 className="font-heading italic text-4xl text-ivory drop-shadow-lg md:text-6xl animate-hero-in" style={{ animationDelay: "0.25s" }}>
                  Your Dreams, Our Craft
                </h2>
                {banner.link_url && (
                  <span className="mt-6 inline-block rounded-full bg-terracotta px-7 py-2.5 font-body text-sm font-semibold text-ivory shadow-lg transition-all hover:bg-terracotta/90 hover:scale-105 animate-hero-in" style={{ animationDelay: "0.45s" }}>
                    Shop Now →
                  </span>
                )}
              </div>
            </>
          );

          return (
            <div
              key={banner.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-hidden={i !== current}
              className="relative h-full w-full flex-none select-none"
            >
              {banner.link_url ? (
                <Link href={banner.link_url} className="absolute inset-0 block" tabIndex={i !== current ? -1 : undefined}>
                  {slideContent}
                </Link>
              ) : (
                slideContent
              )}
            </div>
          );
        })}
      </div>

      {/* ── Prev / Next ─────────────────────────────────────────────── */}
      {count > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/15 text-ivory backdrop-blur-sm transition-all hover:bg-ivory/35 hover:scale-110 sm:h-11 sm:w-11">
            <ChevronLeft />
          </button>
          <button type="button" onClick={next} aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/15 text-ivory backdrop-blur-sm transition-all hover:bg-ivory/35 hover:scale-110 sm:h-11 sm:w-11">
            <ChevronRight />
          </button>
        </>
      )}

      {/* ── Dots ────────────────────────────────────────────────────── */}
      {count > 1 && (
        <div role="tablist" aria-label="Slides"
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "w-6 h-2 bg-terracotta" : "w-2 h-2 bg-ivory/55 hover:bg-ivory"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Static hero (shown when no banners are in the DB) ────────────────────────

const PARTICLES = [
  { size: 6,  left: "8%",  top: "22%", delay: "0s",    dur: "4s"  },
  { size: 4,  left: "18%", top: "65%", delay: "0.8s",  dur: "5s"  },
  { size: 8,  left: "30%", top: "38%", delay: "1.5s",  dur: "3.5s"},
  { size: 5,  left: "48%", top: "72%", delay: "0.3s",  dur: "4.5s"},
  { size: 7,  left: "62%", top: "25%", delay: "1.1s",  dur: "5s"  },
  { size: 4,  left: "74%", top: "55%", delay: "0.6s",  dur: "3.8s"},
  { size: 9,  left: "85%", top: "35%", delay: "1.9s",  dur: "4.2s"},
  { size: 5,  left: "92%", top: "68%", delay: "0.4s",  dur: "5.5s"},
  { size: 6,  left: "55%", top: "45%", delay: "2.1s",  dur: "3.2s"},
  { size: 3,  left: "38%", top: "80%", delay: "1.3s",  dur: "4.8s"},
  { size: 5,  left: "14%", top: "48%", delay: "0.9s",  dur: "6s"  },
  { size: 7,  left: "70%", top: "78%", delay: "1.7s",  dur: "4s"  },
];

function StaticHero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-purple/70 to-navy" />

      {/* Radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_35%,rgba(77,217,236,0.15),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_75%,rgba(240,120,32,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,rgba(91,79,168,0.25),transparent_60%)]" />

      {/* Floating particles */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width:  p.size,
              height: p.size,
              left:   p.left,
              top:    p.top,
              background: i % 3 === 0
                ? "rgba(77,217,236,0.45)"
                : i % 3 === 1
                ? "rgba(240,120,32,0.35)"
                : "rgba(240,192,32,0.40)",
              animation: `float ${p.dur} ease-in-out ${p.delay} infinite`,
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </div>

      {/* Sparkle stars */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { left: "20%", top: "15%", delay: "0s"   },
          { left: "75%", top: "20%", delay: "0.7s" },
          { left: "40%", top: "82%", delay: "1.4s" },
          { left: "88%", top: "58%", delay: "2s"   },
          { left: "12%", top: "70%", delay: "0.4s" },
        ].map((s, i) => (
          <svg
            key={i}
            className="absolute"
            style={{
              left: s.left,
              top:  s.top,
              animation: `sparkle 2.5s ease-in-out ${s.delay} infinite`,
            }}
            width="12" height="12" viewBox="0 0 24 24" fill="rgba(240,192,32,0.7)"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 text-center">
        <p
          className="mb-4 font-body text-[11px] uppercase tracking-[0.28em] text-cyan/80 animate-hero-in"
          style={{ animationDelay: "0.1s" }}
        >
          Handmade · Made to Order · India
        </p>

        <h1
          className="font-heading italic text-5xl leading-tight text-ivory md:text-7xl animate-hero-in"
          style={{ animationDelay: "0.3s" }}
        >
          Your Dreams,<br />Our Craft
        </h1>

        <p
          className="mx-auto mt-5 max-w-lg font-body text-base leading-relaxed text-ivory/70 md:text-lg animate-hero-in"
          style={{ animationDelay: "0.5s" }}
        >
          Eco-resin home décor &amp; hand-poured soy wax candles —
          each piece made by hand, made with love.
        </p>

        <div
          className="mt-9 flex flex-wrap justify-center gap-4 animate-hero-in"
          style={{ animationDelay: "0.7s" }}
        >
          <a
            href="/shop"
            className="rounded-full bg-terracotta px-8 py-3 font-body text-sm font-semibold text-ivory shadow-lg transition-all duration-300 hover:bg-terracotta/90 hover:shadow-xl hover:scale-105"
          >
            Shop the Collection
          </a>
          <a
            href="/about"
            className="rounded-full border-2 border-ivory/35 px-8 py-3 font-body text-sm font-semibold text-ivory/85 transition-all duration-300 hover:border-ivory hover:text-ivory hover:scale-105"
          >
            Our Story
          </a>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ivory/10 to-transparent" />
    </section>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
