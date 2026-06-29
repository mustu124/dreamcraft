"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import MobileMenu from "./MobileMenu";
import type { NavLink } from "./MobileMenu";

const NAV: NavLink[] = [
  { label: "Home",           href: "/" },
  { label: "Shop",           href: "/shop" },
  { label: "Candles",        href: "/shop?category=soy-candles" },
  { label: "Founder's Story",href: "/founder" },
  { label: "About",          href: "/about" },
  { label: "Gallery",        href: "/gallery" },
  { label: "Contact",        href: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-in-out ${
          scrolled ? "bg-ivory shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">

            {/* Logo */}
            <Link
              href="/"
              aria-label="Dreamcraft — home"
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.jpg"
                alt="Dreamcraft logo"
                width={46}
                height={46}
                className="rounded-full object-cover ring-2 ring-purple/30"
                priority
              />
              <span className="font-heading italic text-3xl tracking-wide text-navy">
                Dreamcraft
              </span>
            </Link>

            {/* Desktop nav (hidden on mobile/tablet) */}
            <nav
              className="hidden lg:flex items-center gap-8"
              aria-label="Main navigation"
            >
              {NAV.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={`font-body text-[15px] transition-colors duration-150 ${
                    pathname === href
                      ? "font-medium text-terracotta"
                      : "text-navy hover:text-terracotta"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right-side actions */}
            <div className="flex items-center gap-1">
              {/* Cart */}
              <Link
                href="/cart"
                aria-label={`Cart — ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors hover:text-terracotta"
              >
                <BagIcon />
                {totalItems > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-terracotta px-1 font-body text-[10px] font-semibold leading-none text-ivory">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Hamburger — mobile/tablet only */}
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors hover:text-terracotta"
              >
                <HamburgerIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu links={NAV} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function BagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
