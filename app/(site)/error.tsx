"use client";

import Link from "next/link";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading italic text-3xl text-navy">Something went wrong</h1>
      <p className="mt-3 font-body text-sm text-navy/60">
        We hit an unexpected error. Please try again or go back home.
      </p>
      <div className="mt-6 flex gap-4">
        <button
          onClick={reset}
          className="rounded-full border-2 border-terracotta px-6 py-2.5 font-body text-sm font-medium text-terracotta hover:bg-terracotta hover:text-ivory transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full bg-navy px-6 py-2.5 font-body text-sm font-medium text-ivory hover:opacity-90 transition-opacity"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
