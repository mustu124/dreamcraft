"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

export default function NewsletterSignup() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [agreed,    setAgreed]    = useState(false);
  const [status,    setStatus]    = useState<Status>("idle");
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please check the box to subscribe.");
      return;
    }
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-ivory px-6 py-10 text-center shadow-sm sm:px-10">
        <p className="font-heading italic text-2xl text-navy">You&apos;re on the list!</p>
        <p className="mt-2 font-body text-sm text-navy/60">
          Thank you for subscribing — watch your inbox for updates from Dreamcraft.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-navy/15 bg-blush/20 px-3.5 py-2.5 font-body text-sm text-navy " +
    "placeholder:text-navy/35 transition-colors focus:border-terracotta focus:bg-white focus:outline-none " +
    "disabled:opacity-50";

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-ivory px-6 py-8 shadow-sm sm:px-10 sm:py-10">
      <p className="text-center font-heading italic text-2xl text-navy md:text-3xl">
        Subscribe to get exclusive updates
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <fieldset disabled={status === "submitting"} className="contents">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nl-first" className="mb-1.5 block font-body text-xs text-navy/60">
                First name *
              </label>
              <input
                id="nl-first"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="nl-last" className="mb-1.5 block font-body text-xs text-navy/60">
                Last name
              </label>
              <input
                id="nl-last"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="nl-email" className="mb-1.5 block font-body text-xs text-navy/60">
              Email *
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="nl-email"
                type="email"
                required
                placeholder="e.g., email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls + " sm:flex-1"}
              />
              <button
                type="submit"
                className="flex-shrink-0 whitespace-nowrap rounded-lg bg-navy px-6 py-2.5 font-heading italic text-base text-ivory shadow-sm transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Joining…" : "Join Our Mailing List"}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-terracotta"
            />
            <span className="font-body text-xs text-navy/60">
              I want to subscribe to your mailing list.
            </span>
          </label>

          {error && (
            <p role="alert" className="font-body text-xs text-red-600">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </div>
  );
}
