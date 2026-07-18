"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { calcShipping, rupee, GIFT_WRAP_FEE_INR } from "@/lib/config/shipping";
import { buildOrderWhatsAppLink } from "@/lib/config/whatsapp";

// Razorpay is intentionally not wired up right now — the client-side modal
// logic still lives at lib/payments/razorpay-client.ts and the server routes
// at /api/razorpay/create-order + /api/razorpay/verify are untouched, so it
// can be re-enabled later without rebuilding it.

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
  | "awaiting_payment"  // order created — showing QR + screenshot upload
  | "error";            // order creation failed

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

  // ── Form state ─────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [giftWrap, setGiftWrap] = useState(false);

  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE_INR : 0;
  const total       = subtotal + shipping + giftWrapFee;

  // ── Page status ────────────────────────────────────────────
  const [status,      setStatus]      = useState<PageStatus>("idle");
  const [orderId,      setOrderId]     = useState<string | null>(null);
  const [orderNumber,  setOrderNumber] = useState<string | number | null>(null);
  const [submitError, setSubmitError]  = useState<string | null>(null);
  // Server-confirmed totals — authoritative over the client-side calc above,
  // in case a price changed between add-to-cart and checkout.
  const [confirmedTotals, setConfirmedTotals] = useState<{ subtotal: number; shipping: number; giftWrapFee: number; total: number } | null>(null);

  // Snapshot of items/address/gift-wrap at the moment the order was placed —
  // used to build the WhatsApp message even after the cart is cleared.
  const orderSnapshotRef = useRef<{ items: CartItem[]; address: FormData; giftWrap: boolean } | null>(null);

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

  // ── Form submit — creates the order, then moves to the payment step ───────
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
          giftWrap,
        }),
      });

      const orderData = await ordersRes.json();
      if (!ordersRes.ok) throw new Error(orderData.error ?? "Could not place order.");

      orderSnapshotRef.current = { items, address: formData, giftWrap };
      setOrderId(orderData.orderId);
      setOrderNumber(orderData.orderNumber ?? null);
      setConfirmedTotals({
        subtotal: orderData.subtotal ?? subtotal,
        shipping: orderData.shipping ?? shipping,
        giftWrapFee: orderData.giftWrapFee ?? giftWrapFee,
        total: orderData.total,
      });
      setStatus("awaiting_payment");

    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  // ── Payment step — QR code + screenshot upload ─────────────
  if (status === "awaiting_payment" && orderId && confirmedTotals) {
    return (
      <PaymentStep
        orderId={orderId}
        orderNumber={orderNumber}
        subtotal={confirmedTotals.subtotal}
        shipping={confirmedTotals.shipping}
        giftWrapFee={confirmedTotals.giftWrapFee}
        total={confirmedTotals.total}
        snapshot={orderSnapshotRef.current}
        onConfirmed={() => {
          clearCart();
          router.push(`/order-confirmation/${orderId}`);
        }}
      />
    );
  }

  // ── Form layout ────────────────────────────────────────────
  const isWorking = status === "submitting";

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

            {/* Gift wrapping ───────────────────────────────── */}
            <FormSection title="Extras">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/12 bg-white px-4 py-3.5 transition-colors hover:border-terracotta/40">
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-terracotta"
                />
                <span className="font-body text-sm text-navy/75">
                  Add individual gift box packing
                  <span className="ml-1.5 text-navy/45">(+{rupee(GIFT_WRAP_FEE_INR)})</span>
                </span>
              </label>
            </FormSection>

          </fieldset>{/* end disabled fieldset */}

          {/* Error banner (order creation failure) */}
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
                Placing Order…
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
          <CheckoutSummary items={items} subtotal={subtotal} shipping={shipping} giftWrapFee={giftWrapFee} total={total} />
        </aside>
      </div>
    </div>
  );
}

// ── Payment step — QR code + screenshot upload ────────────────────────────────
// Shown once the order has been created (status PENDING). The customer scans
// the QR, pays via any UPI app, then uploads a screenshot as proof. Uploading
// stores the screenshot and flips the order to AWAITING_VERIFICATION — the
// WhatsApp button afterwards is a notification convenience, not the thing
// that records the order.

type UploadState = "idle" | "uploading" | "done" | "error";

function PaymentStep({
  orderId,
  orderNumber,
  subtotal,
  shipping,
  giftWrapFee,
  total,
  snapshot,
  onConfirmed,
}: {
  orderId: string;
  orderNumber: string | number | null;
  subtotal: number;
  shipping: number;
  giftWrapFee: number;
  total: number;
  snapshot: { items: CartItem[]; address: FormData; giftWrap: boolean } | null;
  onConfirmed: () => void;
}) {
  const [uploadState,   setUploadState]   = useState<UploadState>("idle");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploadState("uploading");
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed. Please try again.");

      setScreenshotUrl(data.url);
      setUploadState("done");
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  function handleConfirm() {
    if (!screenshotUrl || !snapshot) return;

    const link = buildOrderWhatsAppLink({
      orderNumber: orderNumber ?? orderId.slice(-8).toUpperCase(),
      customerName: snapshot.address.fullName,
      phone: snapshot.address.phone,
      addressLine1: snapshot.address.addressLine1,
      addressLine2: snapshot.address.addressLine2 || undefined,
      city: snapshot.address.city,
      state: snapshot.address.state,
      pincode: snapshot.address.pincode,
      items: snapshot.items.map((i) => ({
        name: i.name,
        variantLabel: i.variantLabel,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
      shipping,
      giftWrap: snapshot.giftWrap,
      giftWrapFee,
      total,
      screenshotUrl,
    });

    // Direct user-gesture click — safe from popup blockers.
    window.open(link, "_blank", "noopener,noreferrer");
    onConfirmed();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-navy/8 bg-white p-8 shadow-sm">
        <p className="font-body text-xs uppercase tracking-widest text-terracotta">
          Order {orderNumber ? `#${orderNumber}` : ""} placed
        </p>
        <h1 className="mt-1 font-heading italic text-3xl text-navy">Complete Payment</h1>
        <p className="mt-2 font-body text-sm text-navy/55">
          Scan the QR code below and pay {rupee(total)} using any UPI app, then
          upload a screenshot of the payment confirmation.
        </p>

        {/* QR code */}
        <div className="mx-auto mt-6 flex h-56 w-56 items-center justify-center overflow-hidden rounded-xl border border-navy/10 bg-blush/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/payment-qr.png"
            alt="Scan to pay via UPI"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-3 text-center font-body text-lg font-semibold text-terracotta">
          {rupee(total)}
        </p>
        {giftWrapFee > 0 && (
          <p className="text-center font-body text-xs text-navy/40">
            Includes {rupee(giftWrapFee)} gift box packing
          </p>
        )}

        {/* Screenshot upload */}
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadState === "idle" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-full border-2 border-navy/20 py-3.5 font-body text-sm font-medium text-navy transition-all duration-200 hover:border-terracotta hover:text-terracotta"
            >
              Upload Payment Screenshot
            </button>
          )}

          {uploadState === "uploading" && (
            <div className="flex items-center justify-center gap-2 rounded-full border-2 border-navy/10 py-3.5 font-body text-sm text-navy/50">
              <SpinnerIcon /> Uploading screenshot…
            </div>
          )}

          {(uploadState === "done" || uploadState === "error") && previewUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-blush/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Payment screenshot preview" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                {uploadState === "done" ? (
                  <p className="font-body text-xs font-medium text-green-700">✓ Screenshot uploaded</p>
                ) : (
                  <p className="font-body text-xs text-red-600">{uploadError}</p>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-0.5 font-body text-xs text-terracotta underline underline-offset-2"
                >
                  {uploadState === "done" ? "Replace" : "Try again"}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={uploadState !== "done"}
          onClick={handleConfirm}
          className="mt-4 w-full rounded-full bg-terracotta py-3.5 font-body text-sm font-medium text-ivory shadow-sm transition-all duration-200 hover:bg-terracotta/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Order via WhatsApp
        </button>

        <p className="mt-4 text-center font-body text-xs text-navy/40">
          We&apos;ll confirm your order on WhatsApp once payment is verified.
        </p>
      </div>
    </div>
  );
}

// ── Checkout order summary sidebar ────────────────────────────────────────────

function CheckoutSummary({
  items, subtotal, shipping, giftWrapFee, total,
}: {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  giftWrapFee: number;
  total: number;
}) {
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
        {giftWrapFee > 0 && (
          <div className="flex justify-between">
            <span className="text-navy/60">Gift box packing</span>
            <span className="text-navy/75">{rupee(giftWrapFee)}</span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t border-navy/8 pt-4">
        <span className="font-body text-base font-semibold text-navy">Total</span>
        <span className="font-body text-lg font-bold text-terracotta">{rupee(total)}</span>
      </div>

      <div className="mt-5 flex items-center justify-center gap-1.5 font-body text-[10px] text-navy/35">
        <LockIcon />
        Pay via UPI QR code
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
