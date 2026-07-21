import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Dreamcraft for orders, custom requests, corporate gifting, or any questions.",
};

export default function ContactPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-blush/30 py-16 md:py-24">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="mb-4 font-body text-[11px] uppercase tracking-[0.2em] text-terracotta">
            Say Hello
          </p>
          <h1 className="font-heading italic text-4xl text-navy md:text-5xl">
            We'd love to hear from you
          </h1>
          <p className="mt-6 font-body text-base leading-relaxed text-navy/65 md:text-lg">
            Whether you have a question about an order, want to discuss a custom piece,
            or are exploring corporate gifting — we're happy to help.
          </p>
        </div>
      </section>

      {/* ── Contact cards ─────────────────────────────────────────────────────── */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {/* WhatsApp / Phone */}
            <a
              href="https://wa.me/919008448040"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-7
                         shadow-sm transition-all hover:border-terracotta/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                <WhatsAppIcon />
              </div>
              <div>
                <p className="mb-1 font-body text-sm font-semibold text-navy">WhatsApp / Phone</p>
                <p className="font-body text-base text-terracotta group-hover:underline">
                  +91 9008 448040
                </p>
                <p className="mt-1 font-body text-xs text-navy/50">
                  Mon – Sat, 10 am – 7 pm IST
                </p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:hello@mydreamcraft.com"
              className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-7
                         shadow-sm transition-all hover:border-terracotta/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush/40">
                <MailIcon />
              </div>
              <div>
                <p className="mb-1 font-body text-sm font-semibold text-navy">Email</p>
                <p className="font-body text-base text-terracotta group-hover:underline break-all">
                  hello@mydreamcraft.com
                </p>
                <p className="mt-1 font-body text-xs text-navy/50">
                  We reply within 24 hours
                </p>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/Dreamcraft_homedecor"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-7
                         shadow-sm transition-all hover:border-terracotta/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50">
                <InstagramIcon />
              </div>
              <div>
                <p className="mb-1 font-body text-sm font-semibold text-navy">Instagram</p>
                <p className="font-body text-base text-terracotta group-hover:underline">
                  @Dreamcraft_homedecor
                </p>
                <p className="mt-1 font-body text-xs text-navy/50">
                  DMs open for custom requests
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ strip ─────────────────────────────────────────────────────────── */}
      <section className="bg-blush/20 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="mb-8 text-center font-heading italic text-3xl text-navy md:text-4xl">
            Common Questions
          </h2>
          <div className="space-y-5">
            {[
              {
                q: "How long does an order take to ship?",
                a: "As every piece is handmade, we require 4 business days to craft your order. Once ready, shipping within India typically takes 5–7 business days.",
              },
              {
                q: "Can I request a fully custom design?",
                a: "Absolutely. We love custom orders — colours, names, dates, logos, and one-of-a-kind concepts. Just reach out via WhatsApp or Instagram DM with your idea.",
              },
              {
                q: "Do you accept bulk / corporate gifting orders?",
                a: "Yes! For bulk orders, corporate, and event gifting, contact us directly at 9008448040.",
              },
              {
                q: "What is your return or exchange policy?",
                a: "Because each piece is handmade to order, we do not accept returns. However, if your order arrives damaged, please reach out within 48 hours with photos and we'll make it right.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl border border-blush/60 bg-white px-6 py-5 shadow-sm"
              >
                <p className="mb-2 font-body text-sm font-semibold text-navy">{q}</p>
                <p className="font-body text-sm leading-relaxed text-navy/60">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-navy py-14 md:py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-ivory/50">
            Ready to order?
          </p>
          <h2 className="mt-3 font-heading italic text-2xl text-ivory md:text-3xl">
            Browse the full collection
          </h2>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full bg-terracotta px-8 py-3 font-body
                       text-sm font-medium text-ivory transition-all hover:bg-terracotta/90"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-green-500" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-terracotta" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-pink-500" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
