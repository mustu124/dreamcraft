// Razorpay checkout-modal client logic — extracted out of the active checkout
// flow so it stays available (server routes at /api/razorpay/create-order and
// /api/razorpay/verify are untouched) without being called from the page.
// To re-enable: import initiateRazorpay from here and call it after order
// creation in app/(site)/checkout/page.tsx, in place of the QR/upload step.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
};

export type RazorpayOptions = {
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

export type RazorpayInstance = { open: () => void };

// Script loader (idempotent — safe to call multiple times).
export function loadRazorpayScript(): Promise<boolean> {
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

// Opens the Razorpay modal for a given internal order. Calls `onVerified` with
// the signed response for the caller to POST to /api/razorpay/verify, and
// `onDismiss`/`onError` for the modal-closed and setup-failure paths.
export async function initiateRazorpay(
  ourOrderId: string,
  prefill: { name: string; email: string; phone: string },
  callbacks: {
    onVerified: (response: RazorpaySuccessResponse) => void;
    onDismiss:  () => void;
    onError:    (message: string) => void;
  },
): Promise<void> {
  try {
    const createRes = await fetch("/api/razorpay/create-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: ourOrderId }),
    });

    const rzpData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(rzpData.error ?? "Could not create payment order");
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error("Could not load payment gateway. Please check your connection and try again.");

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
      handler: callbacks.onVerified,
      modal: {
        ondismiss:     callbacks.onDismiss,
        escape:        false,
        backdropclose: false,
      },
    });

    rzp.open();

  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : "Could not open payment gateway.");
  }
}

// POST /api/razorpay/verify and report success/failure.
export async function verifyRazorpayPayment(
  response: RazorpaySuccessResponse,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/razorpay/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Payment could not be verified." };
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Network error during verification. Your payment may have been captured — please contact us with your order number.",
    };
  }
}
