import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Dreamcraft",
  description:
    "Learn about Dreamcraft — handmade eco-resin home décor and hand-poured soy wax candles made with love in India.",
};

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-blush/30 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="mb-4 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Who We Are
          </p>
          <h1 className="font-heading italic text-4xl text-navy md:text-5xl">
            Made with love,<br />made by hand
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-base leading-relaxed text-navy/65 md:text-lg">
            Dreamcraft is a small handmade studio creating eco-resin home décor and
            soy wax candles — each piece thoughtfully crafted to order in India.
          </p>
        </div>
      </section>

      {/* ── What We Make ─────────────────────────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div>
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
                Our Craft
              </p>
              <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
                Eco-Resin Décor
              </h2>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                Every piece is handpoured using a premium eco-resin casting blend,
                shaped with care, cured for 24 hours, and finished with a protective
                water-resistant coating.
              </p>
              <p className="font-body text-base leading-relaxed text-navy/65">
                From serving trays and coaster sets to decorative bowls and photo
                frames — each creation captures a unique pattern of colour and texture
                that can never be perfectly replicated. That is the beauty of
                handmade.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { title: "Eco-Resin",      desc: "Premium, non-toxic casting blend — safe for home use." },
                { title: "Hand-Poured",    desc: "No moulds off a machine. Every piece shaped by hand." },
                { title: "Made to Order",  desc: "Crafted after you place your order — never mass-produced." },
                { title: "Custom Options", desc: "Colors, finishes, names, and logos on request." },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-blush/60 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-terracotta" />
                  <div>
                    <p className="mb-0.5 font-body text-sm font-semibold text-navy">{title}</p>
                    <p className="font-body text-sm text-navy/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Soy Candles ──────────────────────────────────────────────────────── */}
      <section className="bg-blush/20 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div className="order-2 md:order-1 flex flex-col gap-4">
              {[
                { title: "100% Soy Wax",      desc: "Natural, clean-burning, and longer-lasting than paraffin." },
                { title: "Essential Oils",     desc: "Fragranced with pure essential oils — not synthetic." },
                { title: "Lead-Free Cotton Wicks", desc: "Safer to burn, no soot or toxins." },
                { title: "Hand-Poured",        desc: "Small-batch, slow-poured for an even burn." },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-blush/60 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="mb-0.5 font-body text-sm font-semibold text-navy">{title}</p>
                    <p className="font-body text-sm text-navy/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-1 md:order-2">
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-gold">
                Our Candles
              </p>
              <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
                Hand-Poured Soy Wax Candles
              </h2>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                Our soy wax candles are handpoured in small batches using 100% natural
                soy wax and fragranced with pure essential oils. They burn cleaner,
                longer, and more evenly than typical paraffin candles.
              </p>
              <p className="font-body text-base leading-relaxed text-navy/65">
                Whether it's lavender for calm, sandalwood for warmth, or a custom
                scent for a special occasion — our candles fill your space with
                something real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Customisation ─────────────────────────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="mb-4 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Made Just for You
          </p>
          <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
            Fully Customisable
          </h2>
          <p className="mx-auto mb-8 max-w-xl font-body text-base leading-relaxed text-navy/65">
            Every Dreamcraft piece can be personalised. Choose your colours, finish,
            and add a name, date, or message. We also take corporate gifting orders
            with brand logos, and custom designs for weddings and events.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Custom Colours", "Names & Dates", "Marble or Solid Finish",
              "Corporate Logos", "Wedding Favours", "Event Pieces"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-terracotta/25 bg-blush/30 px-4 py-1.5
                           font-body text-sm text-navy/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-terracotta py-16 md:py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="font-heading italic text-3xl text-ivory md:text-4xl">
            Explore the Collection
          </h2>
          <p className="mt-4 font-body text-sm text-ivory/75 md:text-base">
            Each piece is made by hand, made with love, made for you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="inline-block rounded-full bg-ivory px-8 py-3 font-body text-sm
                         font-medium text-terracotta transition-all hover:bg-ivory/90"
            >
              Shop Now
            </Link>
            <Link
              href="/contact"
              className="inline-block rounded-full border-2 border-ivory px-8 py-3
                         font-body text-sm font-medium text-ivory transition-all
                         hover:bg-ivory hover:text-terracotta"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
