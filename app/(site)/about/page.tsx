import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Dreamcraft",
  description:
    "Learn about Dreamcraft — handmade eco-resin home decor and hand-poured soy wax candles made with love in India.",
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
            Crafted to make everyday moments beautiful.
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-base leading-relaxed text-navy/65 md:text-lg">
            Dreamcraft is a handmade home decor brand creating thoughtfully
            designed pieces that add warmth, elegance, and personality to
            everyday living. Every item is handcrafted in India using
            eco-resin and carefully selected materials, blending modern
            aesthetics with timeless craftsmanship.
          </p>
        </div>
      </section>

      {/* ── Craftsmanship & Customization ────────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            <div>
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
                { title: "Eco-Resin",           desc: "Made with high-quality eco-resin, each piece is individually hand-poured, making every creation uniquely yours." },
                { title: "Cured for 24 Hours",  desc: "Each piece is naturally cured for 24 hours to achieve exceptional strength, durability, and a flawless finish." },
                { title: "Protective Coating",  desc: "Sealed with a protective coating for enhanced water resistance, moisture protection, and effortless maintenance." },
                { title: "Long-Lasting Finish", desc: "A durable finish that preserves the beauty of every handcrafted piece for years to come." },
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
                { title: "Custom-Made",         desc: "Every piece is handcrafted just for you—never mass-produced." },
                { title: "100% Soy Wax",        desc: "Our candles are hand-poured with premium soy wax for a clean, even, and long-lasting burn." },
                { title: "Attention to Detail", desc: "Every creation is carefully finished by hand, ensuring exceptional quality and lasting beauty." },
                { title: "Made to Order",       desc: "Each piece is created after your order is placed, ensuring the time and care every handcrafted item deserves." },
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
                From Our Hands To Your Home
              </p>
              <h2 className="mb-5 font-heading italic text-3xl text-navy md:text-4xl">
                Made-to-Order
              </h2>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                At Dreamcraft, every piece is thoughtfully handcrafted once you
                place your order—never mass-produced. This allows us to focus
                on quality, individuality, and the attention to detail that
                makes each creation truly special.
              </p>
              <p className="mb-4 font-body text-base leading-relaxed text-navy/65">
                Our candles are hand-poured using premium soy wax, offering a
                clean, long-lasting burn that brings warmth and comfort to
                your home.
              </p>
              <p className="font-body text-base leading-relaxed text-navy/65">
                Because every order is made by hand, we recommend placing
                your order in advance to allow sufficient time for crafting,
                curing, and finishing each piece.
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
            {["Choice of Colors", "Solid or Marble Finish", "Multi-Color Blends",
              "Personalized Names & Dates", "Corporate Branding & Logos", "Custom Wedding Designs"].map((tag) => (
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
            From thoughtful gifts to bespoke home decor, every piece is
            designed to reflect your style and handcrafted just for you.
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
            From custom creations to timeless designs, every piece is made
            with care, creativity and love in India.
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
