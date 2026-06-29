This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Setting up Razorpay

1. **Create a Razorpay account** at [razorpay.com](https://razorpay.com) and complete KYC to activate live payments. You can use the **Test mode** immediately without KYC — real payments require a completed business profile.

2. **Generate API keys** — go to **Settings → API Keys** in the Razorpay dashboard and click *Generate Key*. You'll receive a **Key ID** (`rzp_test_...` for test, `rzp_live_...` for production) and a **Key Secret**.

3. **Add the keys to `.env.local`** in the project root:

   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
   ```

   `RAZORPAY_KEY_ID` is returned to the browser via the `/api/razorpay/create-order` response (safe — it's a public identifier). `RAZORPAY_KEY_SECRET` never leaves the server; it is only used inside Route Handlers for HMAC signature generation and verification.

4. **Place a full test order** end-to-end — add a product to cart, go through checkout, and pay using a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-upi-details/) (e.g. card `4111 1111 1111 1111`, any future expiry, any CVV). Confirm the order appears in your Razorpay dashboard as *Captured* and in your Supabase `orders` table with `status = 'PAID'`.

5. **Switch to live keys** — replace the `rzp_test_` values in `.env.local` with your live keys **only after a successful end-to-end test order**. Restart the dev server (or redeploy) after updating environment variables.

## Setting up invoice generation

### 1. Supabase — create the `invoices` table

Run this in the Supabase SQL editor (Settings → SQL Editor):

```sql
create table invoices (
  id             bigserial    primary key,
  order_id       uuid         not null unique references orders(id) on delete restrict,
  invoice_number text         unique,
  storage_path   text         not null default '',
  created_at     timestamptz  not null default now()
);
```

The `id` column is a `BIGSERIAL` (auto-incrementing integer). The invoice number is derived from it: `DC-INV-{year}-{id zero-padded to 4 digits}`. The UNIQUE constraint on `order_id` acts as a distributed lock — concurrent requests will get a `23505` duplicate-key error, which the code treats as "another request is already handling this", preventing double-generation.

### 2. Supabase — create the private `invoices` storage bucket

Go to **Storage → New bucket**:
- Name: `invoices`
- Public bucket: **off** (leave unchecked)
- No policies needed — only the service-role key (used server-side) can access it

### 3. Environment variables

Add to `.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Dreamcraft <orders@yourdomain.com>
```

- **`RESEND_API_KEY`** — get it from [resend.com](https://resend.com) after creating an account. During development the free tier (3,000 emails/month) is more than enough.
- **`RESEND_FROM_EMAIL`** — requires a verified sending domain in Resend. For local testing, omit this variable and Resend will send from `onboarding@resend.dev` (Resend's shared test sender — deliverable but marked as test).

### 4. How invoice generation works

```
POST /api/razorpay/verify   → order marked PAID
  └─ generateAndStoreInvoice(orderId)   (awaited, non-blocking on failure)
       ├─ INSERT invoices row       → gets BIGSERIAL id (e.g. 3)
       ├─ invoiceNumber = DC-INV-2026-0003
       ├─ renderToBuffer(<InvoicePDF />)   → Buffer
       ├─ supabase.storage.from('invoices').upload(path, buffer)
       ├─ UPDATE invoices SET invoice_number, storage_path
       └─ resend.emails.send(to: customer, attachment: pdf)

GET /api/invoice/[orderId]   (customer clicks "Download Invoice")
  ├─ Guard: order must be PAID
  ├─ Look up invoices.storage_path
  ├─ If not ready → generateAndStoreInvoice() (lazy fallback)
  └─ supabase.storage.createSignedUrl(path, 3600)  → redirect
```

The signed URL is valid for 1 hour. Clicking "Download Invoice" again generates a fresh URL. The PDF bytes are served directly from Supabase Storage — they never pass through the Next.js process.

### 5. Customise the invoice

Edit `lib/invoice/InvoicePDF.tsx` to update:
- Store contact details (email, phone, address) in the header
- Brand colours (`C.terracotta`, `C.navy`, `C.gold`)
- Footer text
- Column widths for the items table (adjust `flex` values in the `col*` styles)
