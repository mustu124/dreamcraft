"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export type NavLink = { label: string; href: string };

export default function MobileMenu({
  links,
  open,
  onClose,
}: {
  links: NavLink[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex h-16 items-center justify-between border-b border-blush/40 px-5">
          <span className="font-heading italic text-xl text-navy">Dreamcraft</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors hover:text-terracotta"
          >
            <XIcon />
          </button>
        </div>

        {/* Links — full-width tap targets */}
        <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`block w-full border-b border-blush/25 px-6 py-4 font-body text-base transition-colors ${
                pathname === href
                  ? "bg-blush/30 font-medium text-terracotta"
                  : "text-navy hover:bg-blush/20 hover:text-terracotta"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer note */}
        <p className="border-t border-blush/40 px-6 py-5 font-body text-xs leading-relaxed text-navy/50">
          Handmade eco-resin decor &amp; candles, made with love in India.
        </p>
      </div>
    </>
  );
}

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
