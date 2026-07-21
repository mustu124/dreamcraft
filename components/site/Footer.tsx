import Link from "next/link";
import Image from "next/image";

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
              Your Dreams, Our Craft!! — Beautifully handcrafted decor, made
              to turn everyday moments into something special.
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
                  className="transition-colors hover:text-gold"
                >
                  +91 9008 448040
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@mydreamcraft.com"
                  className="break-all transition-colors hover:text-gold"
                >
                  hello@mydreamcraft.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/Dreamcraft_homedecor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold"
                >
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
