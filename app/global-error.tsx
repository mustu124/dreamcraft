"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 text-center">
        <h1 className="font-heading italic text-3xl text-navy">Something went wrong</h1>
        <p className="mt-3 font-body text-sm text-navy/60">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-terracotta px-8 py-3 font-body text-sm font-medium text-ivory hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
