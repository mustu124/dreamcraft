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

      {/* ── Craftsmanship & Customization ────────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div>
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
                Our Craft
              </p>
              <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
                Craftsmanship &amp; Customization
              </h2>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                At Dreamcraft, every piece begins as an idea and is thoughtfully
                brought to life through a meticulous handcrafted process.
              </p>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                Our creations are made using a premium Eco-Resin casting blend,
                carefully poured, shaped, and finished by hand. Each piece is
                allowed to cure naturally for 24 hours to ensure strength,
                durability, and a flawless finish.
              </p>
              <p className="font-body text-base leading-relaxed text-navy/65">
                Once fully set, every creation is sealed with a specialized
                protective coating that enhances its beauty while making it
                water-resistant, moisture-resistant, and easy to maintain. This
                finishing process also provides a long-lasting, elegant shine
                that preserves the charm of each piece for years to come.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { title: "Eco-Resin",         desc: "Premium casting blend, carefully poured and shaped by hand." },
                { title: "Cured 24 Hours",    desc: "Natural curing ensures strength, durability, and a flawless finish." },
                { title: "Protective Coating", desc: "Water-resistant, moisture-resistant, and easy to maintain." },
                { title: "Long-Lasting Shine", desc: "A finish that preserves the charm of each piece for years to come." },
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

      {/* ── Made-to-Order ─────────────────────────────────────────────────────── */}
      <section className="bg-blush/20 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div className="order-2 md:order-1 flex flex-col gap-4">
              {[
                { title: "Custom-Made",     desc: "Every creation is crafted especially for you — never mass-produced." },
                { title: "100% Soy Wax",    desc: "All candles are hand-poured using premium soy wax for a clean, long-lasting burn." },
                { title: "Attention to Detail", desc: "Small-batch production keeps the focus on quality and individuality." },
                { title: "Advance Ordering", desc: "As each piece is handmade, we kindly request advance ordering." },
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
                How We Work
              </p>
              <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
                Made-to-Order
              </h2>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                Every Dreamcraft creation is custom-made and crafted especially for
                you. We do not mass-produce our collections, allowing us to focus
                on quality, individuality, and attention to detail.
              </p>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                All our candles are hand-poured using premium soy wax, ensuring a
                clean, long-lasting burn while bringing warmth, fragrance, and
                elegance to your home.
              </p>
              <p className="font-body text-base leading-relaxed text-navy/65">
                As each piece is handmade, we kindly request advance ordering to
                allow sufficient production time and ensure every creation
                receives the care it deserves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Personalization & Customization ──────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="mb-4 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Made Just for You
          </p>
          <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
            Personalization &amp; Customization
          </h2>
          <p className="mx-auto mb-8 max-w-xl font-body text-base leading-relaxed text-navy/65">
            Your story is unique, and your decor should be too. We offer a
            variety of customization options, including:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Choice of Colors", "Solid or Marble-Effect Finish", "Multi-Color Blends",
              "Personalized Names & Dates", "Brand Logos for Corporate Gifting", "Custom Wedding Designs"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-terracotta/25 bg-blush/30 px-4 py-1.5
                           font-body text-sm text-navy/70"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl font-body text-base leading-relaxed text-navy/65">
            Whether you are creating a meaningful gift, commemorating a
            milestone, or designing a piece that perfectly complements your
            space, we will work with you to bring your vision to life.
          </p>
        </div>
      </section>

      {/* ── Thoughtfully Handmade ─────────────────────────────────────────────── */}
      <section className="bg-blush/20 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="font-body text-base leading-relaxed text-navy/65 md:text-lg">
            Small imperfections, subtle variations, and unique patterns are
            natural characteristics of handcrafted products and are part of what
            makes each Dreamcraft creation truly one of a kind.
          </p>
          <p className="mt-6 font-heading italic text-xl text-navy md:text-2xl">
            Because beautiful things shouldn&apos;t just decorate a space —
            they should tell a story.
          </p>
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
