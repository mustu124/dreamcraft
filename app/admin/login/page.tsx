"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Hard navigation so the browser sends fresh auth cookies with the request.
    // The middleware will see the session and allow access to /admin.
    window.location.href = "/admin";
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
    "placeholder:text-gray-400 transition-colors focus:border-navy focus:bg-white " +
    "focus:outline-none disabled:opacity-50";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">

          {/* Logo */}
          <div className="mb-8 text-center">
            <p className="font-heading italic text-3xl text-navy">Dreamcraft</p>
            <p className="mt-1 text-sm font-medium tracking-widest text-gray-400 uppercase">
              Admin Panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <fieldset disabled={loading} className="contents">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-navy py-3.5 text-sm font-semibold text-white
                           transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </fieldset>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Access is restricted to authorised users only.
        </p>
      </div>
    </main>
  );
}
