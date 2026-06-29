"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { calcShipping, rupee, FREE_SHIPPING_ABOVE_INR } from "@/lib/config/shipping";

// ── Razorpay SDK types (loaded via script tag — not an npm package) ───────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
};

type RazorpayOptions = {
  key:          string;
  amount:       number;
  currency:     string;
  name:         string;
  description?: string;
  image?:       string;
  order_id:     string;
  prefill?:     { name?: string; email?: string; contact?: string };
  theme?:       { color?: string };
  handler:      (response: RazorpaySuccessResponse) => void;
  modal?:       { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
};

type RazorpayInstance = { open: () => void };

// ── Script loader (idempotent — safe to call multiple times) ──────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load",  () => resolve(true),  { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src    = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Form shape ────────────────────────────────────────────────────────────────

type FormData = {
  fullName:     string;
  phone:        string;
  email:        string;
  addressLine1: string;
  addressLine2: string;
  city:         string;
  state:        string;
  pincode:      string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = {
  fullName: "", phone: "", email: "",
  addressLine1: "", addressLine2: "",
  city: "", state: "", pincode: "",
};

// ── Page state ────────────────────────────────────────────────────────────────

type PageStatus =
  | "idle"              // form ready to submit
  | "submitting"        // POST /api/orders in flight
  | "opening_razorpay" // POST /api/razorpay/create-order + loading SDK + opening modal
  | "verifying"         // POST /api/razorpay/verify in flight
  | "verify_failed"     // signature mismatch or network error after payment
  | "error";            // order creation or Razorpay setup failed

// ── Indian states / UTs ───────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
  "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

// ── Client-side validation ────────────────────────────────────────────────────

function validate(d: FormData): FormErrors {
  const e: FormErrors = {};
  if (!d.fullName.trim())                          e.fullName     = "Name is required";
  if (!/^[6-9]\d{9}$/.test(d.phone))              e.phone        = "Enter a valid 10-digit mobile number";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email       = "Enter a valid email address";
  if (!d.addressLine1.trim())                      e.addressLine1 = "Address is required";
  if (!d.city.trim())                              e.city         = "City is required";
  if (!d.state)                                    e.state        = "Select a state";
  if (!/^\d{6}$/.test(d.pincode))                 e.pincode      = "Enter a valid 6-digit pincode";
  return e;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router           = useRouter();
  const { items, totalPrice, clearCart } = useCart();

  const subtotal = totalPrice;
  const shipping = calcShipping(subtotal);
  const total    = subtotal + shipping;

  // ── Form state ─────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors,   setErrors]   = useState<FormErrors>({});

  // ── Page status ────────────────────────────────────────────
  const [status,       setStatus]       = useState<PageStatus>("idle");
  const [orderId,      setOrderId]      = useState<string | null>(null);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [verifyError,  setVerifyError]  = useState<string | null>(null);

  // Stable ref so Razorpay callbacks close over the latest orderId
  const orderIdRef = useRef<string | null>(null);

  // ── Redirect if cart is empty after hydration ──────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && status === "idle" && items.length === 0) {
      router.replace("/cart");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items.length]);

  // ── Field helpers ──────────────────────────────────────────
  function setField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Payment verification (called by Razorpay handler) ─────
  async function verifyPayment(response: RazorpaySuccessResponse) {
    setStatus("verifying");

    try {
      const res = await fetch("/api/razorpay/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("verify_failed");
        setVerifyError(data.error ?? "Payment could not be verified.");
        return;
      }

      // Payment verified — clear cart, go to confirmation
      clearCart();
      router.push(`/order-confirmation/${orderIdRef.current}`);

    } catch {
      setStatus("verify_failed");
      setVerifyError("Network error during verification. Your payment may have been captured — please contact us with your order number.");
    }
  }

  // ── Razorpay modal opener ──────────────────────────────────
  async function initiateRazorpay(
    ourOrderId: string,
    prefill: { name: string; email: string; phone: string },
  ) {
    setStatus("opening_razorpay");

    try {
      // 1. Create Razorpay order server-side
      const createRes = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: ourOrderId }),
      });

      const rzpData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(rzpData.error ?? "Could not create payment order");
      }

      // 2. Load Razorpay checkout.js
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway. Please check your connection and try again.");

      // 3. Open the modal — Razorpay manages payment retries internally
      const rzp = new window.Razorpay({
        key:         rzpData.keyId,
        amount:      rzpData.amount,
        currency:    rzpData.currency,
        name:        "Dreamcraft",
        description: "Handcrafted home décor",
        order_id:    rzpData.razorpayOrderId,
        prefill: {
          name:    prefill.name,
          email:   prefill.email,
          contact: prefill.phone,
        },
        theme: { color: "#E0825F" }, // terracotta
        handler: verifyPayment,
        modal: {
          // User closed the modal — cart stays intact so they can retry
          ondismiss:     () => setStatus("idle"),
          escape:        false,
          backdropclose: false,
        },
      });

      rzp.open();

    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Could not open payment gateway.");
    }
  }

  // ── Form submit ────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate(formData);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError(null);

    try {
      // Step 1 — create our internal order (server-side price recomputation)
      const ordersRes = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId:    i.variantId,
            productId:    i.productId,
            sku:          i.sku,
            name:         i.name,
            variantLabel: i.variantLabel,
            qty:          i.qty,
          })),
          address: {
            fullName:     formData.fullName,
            phone:        formData.phone,
            email:        formData.email,
            addressLine1: formData.addressLine1,
            addressLine2: formData.addressLine2 || undefined,
            city:         formData.city,
            state:        formData.state,
            pincode:      formData.pincode,
          },
        }),
      });

      const orderData = await ordersRes.json();
      if (!ordersRes.ok) throw new Error(orderData.error ?? "Could not place order.");

      // Store for use in callbacks and error messages
      orderIdRef.current = orderData.orderId;
      setOrderId(orderData.orderId);

      // Step 2 — hand off to Razorpay immediately
      await initiateRazorpay(orderData.orderId, {
        name:  formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });

    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  // ── verify_failed — separate full-page state ───────────────
  if (status === "verify_failed") {
    return (
      <VerifyFailed
        orderId={orderId}
        error={verifyError ?? "Payment could not be verified."}
      />
    );
  }

  // ── Form layout ────────────────────────────────────────────
  const isWorking = (["submitting", "opening_razorpay", "verifying"] as PageStatus[]).includes(status);

  const inputCls = (field: keyof FormData) =>
    [
      "w-full rounded-xl border px-4 py-3 font-body text-sm text-navy",
      "placeholder:text-navy/30 bg-white",
      "transition-colors duration-200 focus:border-terracotta focus:outline-none",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      errors[field] ? "border-red-300 bg-red-50/30" : "border-navy/18",
    ].join(" ");

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 md:pt-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-x-12 lg:px-8">

        {/* ── LEFT: checkout form ────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">

          <div>
            <h1 className="font-heading italic text-4xl text-navy">Checkout</h1>
            <p className="mt-1 font-body text-sm text-navy/45">
              No account needed — just fill in your details.
            </p>
          </div>

          {/* fieldset disabled disables all controls at once */}
          <fieldset disabled={isWorking} className="contents">

            {/* Contact ───────────────────────────────────── */}
            <FormSection title="Contact">
              <Field label="Full name" id="fullName" error={errors.fullName}>
                <input
                  id="fullName" type="text" autoComplete="name"
                  placeholder="Priya Sharma"
                  value={formData.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  className={inputCls("fullName")}
                  aria-describedby={errors.fullName ? "fullName-err" : undefined}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone" id="phone" error={errors.phone}>
                  <input
                    id="phone" type="tel" inputMode="numeric" autoComplete="tel"
                    placeholder="9876543210" maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))}
                    className={inputCls("phone")}
                    aria-describedby={errors.phone ? "phone-err" : undefined}
                  />
                </Field>
                <Field label="Email" id="email" error={errors.email}>
                  <input
                    id="email" type="email" autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className={inputCls("email")}
                    aria-describedby={errors.email ? "email-err" : undefined}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Delivery address ───────────────────────────── */}
            <FormSection title="Delivery Address">
              <Field label="Address line 1" id="addressLine1" error={errors.addressLine1}>
                <input
                  id="addressLine1" type="text" autoComplete="address-line1"
                  placeholder="Flat / House no., Street, Area"
                  value={formData.addressLine1}
                  onChange={(e) => setField("addressLine1", e.target.value)}
                  className={inputCls("addressLine1")}
                  aria-describedby={errors.addressLine1 ? "addressLine1-err" : undefined}
                />
              </Field>

              <Field label="Address line 2" id="addressLine2" optional>
                <input
                  id="addressLine2" type="text" autoComplete="address-line2"
                  placeholder="Landmark, Colony (optional)"
                  value={formData.addressLine2}
                  onChange={(e) => setField("addressLine2", e.target.value)}
                  className={inputCls("addressLine2")}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City" id="city" error={errors.city}>
                  <input
                    id="city" type="text" autoComplete="address-level2"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className={inputCls("city")}
                    aria-describedby={errors.city ? "city-err" : undefined}
                  />
                </Field>
                <Field label="Pincode" id="pincode" error={errors.pincode}>
                  <input
                    id="pincode" type="text" inputMode="numeric" autoComplete="postal-code"
                    placeholder="400001" maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, ""))}
                    className={inputCls("pincode")}
                    aria-describedby={errors.pincode ? "pincode-err" : undefined}
                  />
                </Field>
              </div>

              <Field label="State" id="state" error={errors.state}>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => setField("state", e.target.value)}
                  aria-describedby={errors.state ? "state-err" : undefined}
                  className={[inputCls("state"), "cursor-pointer"].join(" ")}
                >
                  <option value="">Select state / UT</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </FormSection>

          </fieldset>{/* end disabled fieldset */}

          {/* Error banner (order creation / Razorpay setup failure) */}
          {status === "error" && submitError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isWorking}
            className="w-full rounded-full bg-terracotta py-4 font-body text-sm font-medium text-ivory shadow-sm transition-all duration-200 hover:bg-terracotta/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? (
              <span className="flex items-center justify-center gap-2">
                <SpinnerIcon />
                {status === "submitting"        && "Placing Order…"}
                {status === "opening_razorpay"  && "Opening Payment…"}
                {status === "verifying"         && "Verifying Payment…"}
              </span>
            ) : (
              `Place Order · ${rupee(total)}`
            )}
          </button>

          <p className="text-center font-body text-xs text-navy/40">
            By placing an order you agree to our{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-terracotta">terms</Link>.
          </p>
        </form>

        {/* ── RIGHT: sticky order summary ──────────────────── */}
        <aside
          aria-label="Order summary"
          className="mt-10 lg:mt-0 lg:sticky lg:top-[80px] lg:self-start"
        >
          <CheckoutSummary items={items} subtotal={subtotal} shipping={shipping} total={total} />
        </aside>
      </div>
    </div>
  );
}

// ── Verify failed state ───────────────────────────────────────────────────────
// Shown when the HMAC check fails or the verify network call errors.
// The order has been captured by Razorpay but we couldn't confirm it —
// the customer should not retry payment; they should contact support.

function VerifyFailed({ orderId, error }: { orderId: string | null; error: string }) {
  const shortId = orderId ? orderId.slice(-8).toUpperCase() : "—";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-20">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertIcon />
        </div>
        <h2 className="mt-5 font-heading italic text-2xl text-navy">Payment not verified</h2>
        <p className="mt-2 font-body text-sm text-navy/60">
          {error}
        </p>

        <div className="mt-5 rounded-xl bg-blush/20 px-5 py-4 text-left">
          <p className="font-body text-xs text-navy/55">
            Your order reference:{" "}
            <span className="font-semibold text-navy">#{shortId}</span>
          </p>
          <p className="mt-2 font-body text-xs text-navy/55">
            Please do not attempt to pay again. Contact us with this reference:
          </p>
          <div className="mt-3 space-y-1">
            {/* Update these with real store contact details */}
            <p className="font-body text-xs text-navy/70">📧 hello@dreamcraft.in</p>
            <p className="font-body text-xs text-navy/70">📞 +91 98765 43210</p>
          </div>
        </div>

        <Link
          href="/shop"
          className="mt-6 block rounded-full border border-navy/20 py-3 font-body text-sm text-navy/70 transition-colors hover:border-terracotta hover:text-terracotta"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

// ── Checkout order summary sidebar ────────────────────────────────────────────

function CheckoutSummary({
  items, subtotal, shipping, total,
}: {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}) {
  const amountToFree = FREE_SHIPPING_ABOVE_INR - subtotal;

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-sm">
      <h2 className="mb-5 font-heading italic text-xl text-navy">Your Order</h2>

      {/* Line items */}
      <div className="mb-4 space-y-3 border-b border-navy/8 pb-4">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-blush/25">
              {item.image && item.image !== "/placeholder-product.jpg" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-heading italic text-xs text-terracotta/40">
                    {item.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-body text-xs font-medium text-navy leading-snug line-clamp-1">
                {item.name}
              </span>
              <span className="font-body text-[10px] text-navy/40">
                {item.variantLabel} · qty {item.qty}
              </span>
            </div>
            <span className="flex-shrink-0 font-body text-xs text-navy/70">
              {rupee(item.price * item.qty)}
            </span>
          </div>
        ))}
      </div>

      {/* Subtotal + shipping */}
      <div className="space-y-2.5 font-body text-sm">
        <div className="flex justify-between">
          <span className="text-navy/60">Subtotal</span>
          <span className="text-navy/75">{rupee(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/60">Shipping</span>
          <span className={shipping === 0 ? "text-green-600" : "text-navy/75"}>
            {shipping === 0 ? "Free" : rupee(shipping)}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t border-navy/8 pt-4">
        <span className="font-body text-base font-semibold text-navy">Total</span>
        <span className="font-body text-lg font-bold text-terracotta">{rupee(total)}</span>
      </div>

      {shipping > 0 && amountToFree > 0 && (
        <p className="mt-3 text-center font-body text-[11px] text-navy/40">
          Add {rupee(amountToFree)} more for free shipping
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-1.5 font-body text-[10px] text-navy/35">
        <LockIcon />
        Secured by Razorpay
      </div>
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-heading italic text-xl text-navy">{title}</h2>
        <div className="h-px flex-1 bg-navy/8" />
      </div>
      {children}
    </div>
  );
}

function Field({
  label, id, error, optional, children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-navy/70">
        {label}
        {optional && <span className="text-[11px] text-navy/35">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 font-body text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
