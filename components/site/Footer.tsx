import Link from "next/link";
import Image from "next/image";
import NewsletterSignup from "./NewsletterSignup";

type Category = { name: string; slug: string };

const COMPANY_LINKS = [
  { label: "Founder's Story", href: "/founder" },
  { label: "About",           href: "/about" },
  { label: "Contact",         href: "/contact" },
];

export default function Footer({ categories }: { categories: Category[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy font-body text-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-8">

        {/* Newsletter signup */}
        <div className="mb-14">
          <NewsletterSignup />
        </div>

        {/* Top grid — 1 col on mobile, 2 on sm, 4 on lg */}
        <div className="grid grid-cols-1 gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4 border-b border-ivory/10">

          {/* Brand blurb */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image
                src="/logo.jpg"
                alt="Dreamcraft logo"
                width={36}
                height={36}
                className="rounded-full object-cover ring-2 ring-ivory/20"
              />
              <p className="font-heading italic text-2xl text-ivory">Dreamcraft</p>
            </div>
            <p className="text-sm leading-relaxed text-ivory/70">
              Your Dreams, Our Craft!! — Beautifully handcrafted decor that
              brings affordable luxury, timeless aesthetics, and elegance to
              your everyday spaces.
            </p>
          </div>

          {/* Shop — all 9 categories from Supabase */}
          <div>
            <h3 className="font-heading italic text-lg mb-4 text-ivory">Shop</h3>
            <ul className="space-y-2.5">
              {categories.map(({ name, slug }) => (
                <li key={slug}>
                  <Link
                    href={`/shop?category=${slug}`}
                    className="text-sm text-ivory/70 transition-colors hover:text-gold"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-heading italic text-lg mb-4 text-ivory">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-ivory/70 transition-colors hover:text-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading italic text-lg mb-4 text-ivory">Contact</h3>
            <ul className="space-y-3 text-sm text-ivory/70">
              <li>
                <a
                  href="tel:+919008448040"
                  className="flex items-center gap-2.5 transition-colors hover:text-gold"
                >
                  <PhoneIcon />
                  +91 9008 448040
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@mydreamcraft.com"
                  className="flex items-center gap-2.5 break-all transition-colors hover:text-gold"
                >
                  <MailIcon />
                  hello@mydreamcraft.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/Dreamcraft_homedecor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition-colors hover:text-gold"
                >
                  <InstagramIcon />
                  @Dreamcraft_homedecor
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <p className="pt-7 text-center text-xs text-ivory/40">
          © {year} Dreamcraft Homedecor. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
