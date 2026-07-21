import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Story | Dreamcraft",
  description:
    "Meet Ashima, the creator behind Dreamcraft — handcrafted eco-resin home decor and soy wax candles made with love.",
};

// Tailwind class string shared across all body paragraphs — defined once
// outside the component so it isn't recreated on every render.
const PROSE =
  "mb-7 font-body text-base leading-[1.85] text-navy/68 md:text-lg";

export default function FounderPage() {
  return (
    <>
      {/* ── Editorial article ───────────────────────────────────────── */}
      <article className="bg-ivory py-16 md:py-24">
        <div className="mx-auto max-w-[680px] px-5">

          {/* ── Portrait ──────────────────────────────────────────── */}
          <div className="relative mx-auto mb-8 h-32 w-32 overflow-hidden rounded-full shadow-md ring-2 ring-gold/40 ring-offset-[6px] ring-offset-ivory">
            <Image
              src="/founder.png"
              alt="Ashima, founder of Dreamcraft"
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
          </div>

          {/* ── Eyebrow + title ───────────────────────────────────── */}
          <p className="mb-4 text-center font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Meet the Founder
          </p>
          <h1 className="mb-16 text-center font-heading italic text-4xl text-navy md:text-5xl">
            Our Story
          </h1>

          {/* ── Act I — The love ──────────────────────────────────── */}
          <p className={PROSE}>
            Dreamcraft was born from two things I have always loved deeply —
            creating beautiful spaces and finding meaningful gifts for the people
            I cherish.
          </p>

          <p className={PROSE}>
            For as long as I can remember, I have been drawn to decor that
            brings a sense of warmth, calm, and character to a home.
          </p>

          <PullQuote>
            I was never fascinated by mass-produced pieces that looked like they
            belonged everywhere and nowhere at the same time.
          </PullQuote>

          <p className={PROSE}>
            Instead, I found myself searching for objects with soul — pieces that
            felt personal, unique, and capable of telling a story.
          </p>

          <Divider />

          {/* ── Act II — The collecting ───────────────────────────── */}
          <p className={PROSE}>
            Whenever I travelled, I would wander through local markets, artisan
            stalls, and hidden little shops, collecting treasures that spoke to
            me.
          </p>

          <PullQuote>
            Each piece carried a memory, a place, a feeling.
          </PullQuote>

          <p className={PROSE}>
            Over time, I realized that what I truly loved wasn&apos;t just
            decorating a space; it was surrounding myself with things that made
            a house feel lived in, loved, and uniquely mine.
          </p>

          <Divider />

          {/* ── Act III — The beginning ───────────────────────────── */}
          <PullQuote>
            When the idea of starting my own brand began to take shape, I knew
            exactly what I wanted it to be.
          </PullQuote>

          <p className={PROSE}>
            Dreamcraft became a place where imagination could become reality. A
            place where thoughtful home decor, meaningful gifting, and
            handcrafted keepsakes could come together. Every creation begins as
            an idea, an inspiration, or sometimes even a story shared by a
            customer. Through customization and craftsmanship, those stories are
            transformed into pieces that become part of everyday life.
          </p>

          <p className={PROSE}>
            Whether it is a cozy corner of your home, a special gift for someone
            you love, or a keepsake that marks a meaningful moment, each
            Dreamcraft creation is designed to be cherished for years to come.
          </p>

          <Divider />

          {/* ── Manifesto ─────────────────────────────────────────── */}
          <PullQuote>
            More than decor, these are pieces that hold memories, spark
            conversations, and bring beauty into the spaces where life unfolds
            every day.
          </PullQuote>

          {/* ── Closing ───────────────────────────────────────────── */}
          <p className={PROSE}>
            Thank you for being a part of the Dreamcraft story. I hope our
            creations find a special place in yours.
          </p>

          {/* Signature — italic script feel via font-heading */}
          <p className="mt-10 font-heading italic text-2xl text-navy">
            — Ashima, Creator, Dreamcraft
          </p>

        </div>
      </article>

      {/* ── CTA band ────────────────────────────────────────────────── */}
      <section className="bg-terracotta py-16 md:py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="mb-5 font-body text-[11px] uppercase tracking-[0.18em] text-ivory/60">
            Handcrafted with love
          </p>
          <h2 className="font-heading italic text-3xl text-ivory md:text-4xl">
            Explore the Collection
          </h2>
          <p className="mt-4 font-body text-sm text-ivory/75 md:text-base">
            From custom creations to timeless designs, every piece is made
            with care, creativity and love in India.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-block rounded-full border-2 border-ivory px-8 py-3 font-body text-sm font-medium text-ivory transition-all duration-200 hover:bg-ivory hover:text-terracotta"
          >
            Shop the Collection
          </Link>
        </div>
      </section>
    </>
  );
}

// ── Pull-quote ────────────────────────────────────────────────────────────────
// Gold rules above and below; quote marks added in JSX so screen readers
// skip them (aria-hidden on the figures if we wanted, but blockquote
// is already semantically sufficient).

function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="my-11">
      <div className="mx-auto mb-5 h-px w-10 bg-gold" />
      <blockquote className="text-center font-heading italic text-xl leading-snug text-navy/78 md:text-2xl">
        &ldquo;{children}&rdquo;
      </blockquote>
      <div className="mx-auto mt-5 h-px w-10 bg-gold" />
    </figure>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
// Three small terracotta dots signal a narrative shift without a hard line.

function Divider() {
  return (
    <div aria-hidden className="my-12 flex justify-center gap-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-terracotta/35"
        />
      ))}
    </div>
  );
}
