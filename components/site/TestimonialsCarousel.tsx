"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Testimonial = {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_photo_url: string | null;
  review_text: string;
  rating: number;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TestimonialsCarousel({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const total = testimonials.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => setCurrent(((next % total) + total) % total),
    [total],
  );
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);
  const next = useCallback(() => goTo(current + 1), [goTo, current]);

  // Auto-advance every 6 s; pause on hover
  useEffect(() => {
    if (paused || total === 0) return;
    const id = setInterval(() => goTo(current + 1), 6000);
    return () => clearInterval(id);
  }, [paused, current, goTo, total]);

  if (!total) return null;

  // Always prepare 3 cards; the 2nd and 3rd are hidden on mobile via CSS.
  const visible: [Testimonial, Testimonial, Testimonial] = [
    testimonials[current % total],
    testimonials[(current + 1) % total],
    testimonials[(current + 2) % total],
  ];

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Heading ───────────────────────────────────────────────── */}
        <div className="mb-12 text-center">
          <h2 className="font-heading italic text-3xl text-navy md:text-4xl">
            What Our Customers Say
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-sm text-navy/55 md:text-base">
            Every review is a story — and we&apos;re grateful for each one.
          </p>
        </div>

        {/* ── Cards + controls ──────────────────────────────────────── */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/*
           * key={current} forces React to unmount + remount this div whenever
           * the active slide changes, which re-triggers the CSS animation.
           * This gives a clean fade-up without a JS animation library.
           */}
          <div
            key={current}
            className="grid grid-cols-1 gap-6 md:grid-cols-3 animate-fade-up"
          >
            {visible.map((t, i) => (
              <div key={t.id} className={i > 0 ? "hidden md:block" : ""}>
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>

          {/* ── Prev / dots / Next ────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <NavButton onClick={prev} direction="left" />

            {/* Dots — one per testimonial, active dot widens into a pill */}
            <div className="flex items-center gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={[
                    "h-2 rounded-full transition-all duration-300",
                    i === current
                      ? "w-5 bg-terracotta"
                      : "w-2 bg-navy/25 hover:bg-navy/45",
                  ].join(" ")}
                />
              ))}
            </div>

            <NavButton onClick={next} direction="right" />
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Testimonial card ──────────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl bg-blush/30 p-6 shadow-sm">
      <StarRow rating={t.rating} />

      <blockquote className="flex-1 font-heading italic text-base leading-relaxed text-navy/80">
        &ldquo;{t.review_text}&rdquo;
      </blockquote>

      {/* Customer info */}
      <div className="flex items-center gap-3">
        <Avatar name={t.customer_name} photoUrl={t.customer_photo_url} />
        <div>
          <p className="font-body text-sm font-semibold text-navy">
            {t.customer_name}
          </p>
          <p className="font-body text-xs text-navy/50">{t.customer_city}</p>
        </div>
      </div>
    </div>
  );
}

// ── Star row ──────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${
            star <= rating ? "text-gold fill-current" : "fill-current text-navy/15"
          }`}
          aria-hidden
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ── Circular avatar ───────────────────────────────────────────────────────────

// Deterministic palette — same name always gets the same color.
const AVATAR_PALETTES = [
  "bg-terracotta/70 text-ivory",
  "bg-gold/40 text-navy",
  "bg-blush text-terracotta",
  "bg-navy/20 text-navy",
] as const;

function Avatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const palette = AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${palette}`}
    >
      <span className="font-heading italic text-base font-semibold leading-none">
        {name.charAt(0)}
      </span>
    </div>
  );
}

// ── Nav button (prev / next) ──────────────────────────────────────────────────

function NavButton({
  onClick,
  direction,
}: {
  onClick: () => void;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous testimonial" : "Next testimonial"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-navy/20 text-navy/60 transition-colors hover:border-terracotta hover:text-terracotta"
    >
      {direction === "left" ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
