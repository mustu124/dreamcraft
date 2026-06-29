import Link from "next/link";
import Image from "next/image";

// ── Server component — no interactivity beyond the Link ───────────────────────

export default function AboutSection() {
  return (
    <section className="bg-ivory py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">

          {/* ── Image ─────────────────────────────────────────────────
           * aspect-[4/3] on mobile keeps it compact when stacked.
           * aspect-[4/5] on desktop gives an elegant portrait ratio
           * beside the text column.
           */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md md:aspect-[4/5]">
            <Image
              src="/lifestyle-candle.jpg"
              alt="Handmade mushroom soy candle by Dreamcraft"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>

          {/* ── Text ──────────────────────────────────────────────── */}
          <div className="flex flex-col justify-center">

            {/* Thin gold rule above heading — typographic accent */}
            <div className="mb-5 h-px w-10 bg-gold" />

            <h2 className="font-heading italic text-3xl text-navy md:text-4xl lg:text-5xl">
              More Than Decor
            </h2>

            <p className="mt-6 font-body text-base leading-relaxed text-navy/68 md:text-lg">
              Dreamcraft was born from a love of beautiful spaces and meaningful
              gifts. Every piece is handcrafted using a premium eco-resin blend,
              cured and sealed by hand for a lasting finish — and every candle
              is hand-poured in soy wax for a warm, clean burn. We don&apos;t
              mass-produce; each creation is made-to-order, with small
              imperfections that make it truly one&nbsp;of&nbsp;a&nbsp;kind.
            </p>

            <div className="mt-8">
              <Link
                href="/founder"
                className="inline-block rounded-full bg-terracotta px-8 py-3 font-body text-sm font-medium text-ivory shadow-sm transition-opacity duration-200 hover:opacity-88"
              >
                Read Our Full Story
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
