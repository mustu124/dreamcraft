/**
 * Dreamcraft — one-time database seed
 *
 * Run from the project root (dreamcraft/):
 *   npx tsx scripts/seed.ts
 *
 * Requires .env.local in the project root with:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=
 *
 * Expected schema (create these tables in the Supabase SQL editor first):
 *
 *   create table categories (
 *     id             uuid primary key default gen_random_uuid(),
 *     name           text not null,
 *     slug           text unique not null,
 *     icon_image_url text,
 *     sort_order     int default 0
 *   );
 *   -- If table already exists without icon_image_url run:
 *   --   alter table categories add column if not exists icon_image_url text;
 *
 *   create table subcategories (
 *     id uuid primary key default gen_random_uuid(),
 *     category_id uuid references categories(id) on delete cascade,
 *     name text not null,
 *     slug text unique not null,
 *     sort_order int default 0
 *   );
 *
 *   create table products (
 *     id uuid primary key default gen_random_uuid(),
 *     category_id uuid references categories(id) on delete set null,
 *     subcategory_id uuid references subcategories(id) on delete set null,
 *     sku text unique not null,
 *     name text not null,
 *     description text,
 *     is_bestseller boolean default false,
 *     is_active boolean default true,
 *     created_at timestamptz default now()
 *   );
 *
 *   create table product_variants (
 *     id uuid primary key default gen_random_uuid(),
 *     product_id uuid references products(id) on delete cascade,
 *     label text not null,
 *     price int not null,
 *     sort_order int default 0,
 *     is_active boolean default true
 *   );
 *
 *   create table product_images (
 *     id uuid primary key default gen_random_uuid(),
 *     product_id uuid references products(id) on delete cascade,
 *     url text not null,
 *     sort_order int default 0
 *   );
 *
 *   create table banners (
 *     id                uuid      primary key default gen_random_uuid(),
 *     image_url         text      not null,         -- desktop (landscape) public URL
 *     mobile_image_url  text      not null,         -- mobile (portrait/square) public URL
 *     link_url          text,                       -- optional click destination
 *     is_active         boolean   not null default true,
 *     sort_order        integer   not null default 0
 *   );
 *
 *   -- Storage: create a PUBLIC bucket named "banners" (Storage → New bucket → Public: on)
 *   -- RLS policy: allow authenticated users to INSERT/DELETE objects in the banners bucket
 *   -- (Supabase dashboard: Storage → banners → Policies → New policy → Authenticated users)
 *
 *   -- Storage: create a PUBLIC bucket named "categories" for category icon uploads.
 *   -- Same RLS pattern: authenticated INSERT, public SELECT.
 *   -- (Storage → New bucket → name: categories, Public: on)
 *
 *   create table testimonials (
 *     id                 uuid primary key default gen_random_uuid(),
 *     customer_name      text not null,
 *     customer_city      text not null,
 *     customer_photo_url text,
 *     review_text        text not null,
 *     rating             int  not null check (rating between 1 and 5),
 *     sort_order         int  default 0,
 *     is_active          boolean default true
 *   );
 *
 *   create table gallery_images (
 *     id         uuid primary key default gen_random_uuid(),
 *     image_url  text not null,
 *     caption    text,
 *     alt_text   text,
 *     sort_order int  default 0,
 *     is_active  boolean default true
 *   );
 *
 *   create table process_clips (
 *     id            uuid primary key default gen_random_uuid(),
 *     title         text not null,
 *     thumbnail_url text not null,
 *     video_url     text not null,
 *     sort_order    int  default 0,
 *     is_active     boolean default true
 *   );
 *
 *   -- Order tables (no seed data — real customer orders only)
 *
 *   create table orders (
 *     id                   uuid        primary key default gen_random_uuid(),
 *     created_at           timestamptz not null default now(),
 *     status               text        not null default 'PENDING',
 *     full_name            text        not null,
 *     phone                text        not null,
 *     email                text        not null,
 *     address_line1        text        not null,
 *     address_line2        text,
 *     city                 text        not null,
 *     state                text        not null,
 *     pincode              text        not null,
 *     subtotal             integer     not null,
 *     shipping             integer     not null,
 *     total                integer     not null,
 *     razorpay_order_id    text,
 *     razorpay_payment_id  text
 *   );
 *
 *   create table order_items (
 *     id             uuid    primary key default gen_random_uuid(),
 *     order_id       uuid    not null references orders(id) on delete cascade,
 *     product_id     uuid    not null references products(id),
 *     variant_id     uuid    not null references product_variants(id),
 *     sku            text    not null,
 *     name           text    not null,
 *     variant_label  text    not null,
 *     price          integer not null,
 *     qty            integer not null check (qty > 0)
 *   );
 *
 *   -- Invoice table (BIGSERIAL id drives the sequential invoice number)
 *   -- The id is the source of truth for sequencing: DC-INV-YYYY-{id padded to 4 digits}
 *
 *   create table invoices (
 *     id             bigserial    primary key,
 *     order_id       uuid         not null unique references orders(id) on delete restrict,
 *     invoice_number text         unique,               -- null until generation completes
 *     storage_path   text         not null default '',  -- path inside private 'invoices' bucket
 *     created_at     timestamptz  not null default now()
 *   );
 *
 * Supabase Storage:
 *   Create a bucket named "invoices" with Public = false (private).
 *   No public policies needed — access is via service-role signed URLs only.
 *   Go to: Storage → New bucket → name: invoices, uncheck "Public bucket".
 *
 * Environment variables (add to .env.local):
 *   RAZORPAY_KEY_ID=rzp_test_...
 *   RAZORPAY_KEY_SECRET=...
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM_EMAIL=Dreamcraft <orders@yourdomain.com>   (optional; defaults to Resend test sender)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ─── Sample Testimonials ──────────────────────────────────────────────────────
// SAMPLE DATA — these are placeholder reviews for development.
// Replace with real reviews through the admin panel once live.

const SAMPLE_TESTIMONIALS = [
  {
    customer_name: "Ananya Reddy",
    customer_city: "Hyderabad",
    customer_photo_url: null,
    review_text: "The Donut Vase is even more beautiful in person — it's the first thing guests notice on my console table.",
    rating: 5,
    sort_order: 1,
    is_active: true,
  },
  {
    customer_name: "Rohan Mehta",
    customer_city: "Mumbai",
    customer_photo_url: null,
    review_text: "Ordered the Sculptural Decor Set as a housewarming gift — the packaging and finish felt genuinely premium.",
    rating: 5,
    sort_order: 2,
    is_active: true,
  },
  {
    customer_name: "Priya Nair",
    customer_city: "Bengaluru",
    customer_photo_url: null,
    review_text: "Loved the Daisy Candle Jar, the scent throw is subtle and perfect for my bedroom.",
    rating: 4,
    sort_order: 3,
    is_active: true,
  },
  {
    customer_name: "Aarav Kapoor",
    customer_city: "Delhi",
    customer_photo_url: null,
    review_text: "Got the wooden coasters customized with our wedding date — turned out exactly how we imagined.",
    rating: 5,
    sort_order: 4,
    is_active: true,
  },
  {
    customer_name: "Meera Iyer",
    customer_city: "Chennai",
    customer_photo_url: null,
    review_text: "The Hamsa Hand Tray has such a lovely texture, doesn't look mass-produced at all.",
    rating: 5,
    sort_order: 5,
    is_active: true,
  },
  {
    customer_name: "Saanvi Joshi",
    customer_city: "Pune",
    customer_photo_url: null,
    review_text: "Customer service helped me pick colors that matched my living room — small touch but it mattered.",
    rating: 5,
    sort_order: 6,
    is_active: true,
  },
  {
    customer_name: "Kabir Singh",
    customer_city: "Chandigarh",
    customer_photo_url: null,
    review_text: "The Ring Organiser is compact and exactly the size I needed for my dresser.",
    rating: 4,
    sort_order: 7,
    is_active: true,
  },
  {
    customer_name: "Ishita Banerjee",
    customer_city: "Kolkata",
    customer_photo_url: null,
    review_text: "Bought the Serenity Collection set for myself — every piece feels intentional, not just decorative.",
    rating: 5,
    sort_order: 8,
    is_active: true,
  },
];

// ─── Descriptions ─────────────────────────────────────────────────────────────

const CANDLE_DESC =
  "Hand-poured in premium soy wax for a clean, long-lasting burn.";
const RESIN_DESC =
  "Handcrafted in eco-resin, finished with a smooth, water-resistant coating.";

// ─── Bestseller SKUs ──────────────────────────────────────────────────────────

const BESTSELLERS = new Set([
  "DC-CJ-001", "DC-CJ-002", "DC-CJ-004", "DC-CJ-006",
  "DC-TT-001", "DC-V-002",  "DC-CS-004", "DC-VA-001",
  "DC-PD-001", "DC-CD-001",
]);

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Candles",                        slug: "candles",               sort_order: 1 },
  { name: "Trays",                          slug: "trays",                 sort_order: 2 },
  { name: "Vases",                          slug: "vases",                 sort_order: 3 },
  { name: "Coasters",                       slug: "coasters",              sort_order: 4 },
  { name: "Planters & Organisers",          slug: "planters-organisers",   sort_order: 5 },
  { name: "Passive Diffusers & Sculptures", slug: "diffusers-sculptures",  sort_order: 6 },
  { name: "Vanity & Jewelry Organiser",     slug: "vanity-jewelry",        sort_order: 7 },
  { name: "Customization",                  slug: "customization",         sort_order: 8 },
  { name: "Signature Styling Sets",         slug: "styling-sets",          sort_order: 9 },
] as const;

// ─── Subcategories ────────────────────────────────────────────────────────────

const SUBCATEGORIES = [
  { categorySlug: "candles",              name: "Jar Candles",           slug: "jar-candles",         sort_order: 1 },
  { categorySlug: "candles",              name: "Tealight Holders",      slug: "tealight-holders",    sort_order: 2 },
  { categorySlug: "trays",               name: "Ocean & Shell",          slug: "ocean-shell",         sort_order: 1 },
  { categorySlug: "trays",               name: "Nature-Inspired",        slug: "nature-inspired",     sort_order: 2 },
  { categorySlug: "trays",               name: "Geometric & Bubble",     slug: "geometric-bubble",    sort_order: 3 },
  { categorySlug: "trays",               name: "Symbolic & Decorative",  slug: "symbolic-decorative", sort_order: 4 },
  { categorySlug: "vases",               name: "Donut & Round",          slug: "donut-round",         sort_order: 1 },
  { categorySlug: "vases",               name: "Spiral & Bubble",        slug: "spiral-bubble",       sort_order: 2 },
  { categorySlug: "vases",               name: "Tube & Ribbed",          slug: "tube-ribbed",         sort_order: 3 },
  { categorySlug: "planters-organisers", name: "Figurine Planters",      slug: "figurine-planters",   sort_order: 1 },
  { categorySlug: "planters-organisers", name: "Nature Planters",        slug: "nature-planters",     sort_order: 2 },
  { categorySlug: "planters-organisers", name: "Organisers",             slug: "organisers",          sort_order: 3 },
  { categorySlug: "diffusers-sculptures",name: "Passive Diffusers",      slug: "passive-diffusers",   sort_order: 1 },
  { categorySlug: "diffusers-sculptures",name: "Sculptures",             slug: "sculptures",          sort_order: 2 },
  { categorySlug: "vanity-jewelry",      name: "Ring & Trinket",         slug: "ring-trinket",        sort_order: 1 },
  { categorySlug: "vanity-jewelry",      name: "Display & Mirror",       slug: "display-mirror",      sort_order: 2 },
  { categorySlug: "customization",       name: "Wooden Coasters",        slug: "wooden-coasters",     sort_order: 1 },
  { categorySlug: "customization",       name: "Concrete Coasters",      slug: "concrete-coasters",   sort_order: 2 },
  { categorySlug: "customization",       name: "Sets",                   slug: "sets",                sort_order: 3 },
];

// ─── Products ─────────────────────────────────────────────────────────────────

type Variant = { label: string; price: number };
type ProductDef = {
  categorySlug: string;
  subcategorySlug: string | null;
  sku: string;
  name: string;
  variants: Variant[];
};

const PRODUCTS: ProductDef[] = [
  // ── Candles › Jar Candles ──────────────────────────────────────────────────
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-001", name: "Daisy Candle Jars",
    variants: [{ label: "9x8cm", price: 449 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-002", name: "Flower Jar Candles",
    variants: [{ label: "7.7x9.6cm", price: 499 }, { label: "7.7x9.6cm Large", price: 699 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-003", name: "Lotus Jar Candles",
    variants: [{ label: "4x8.5cm", price: 399 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-004", name: "Ocean Theme Candle",
    variants: [{ label: "4x8cm", price: 499 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-008", name: "Carousel Jar Candles",
    variants: [{ label: "4x8cm", price: 699 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-009", name: "Vintage Jar Candles",
    variants: [{ label: "10x9.8cm", price: 699 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-010", name: "Textured Jar with Coaster",
    variants: [{ label: "7.2x7cm", price: 729 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-011", name: "Star Texture Jars",
    variants: [{ label: "4x8cm", price: 699 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "jar-candles",
    sku: "DC-CJ-012", name: "Oval Jars with Coaster",
    variants: [{ label: "6.5x9cm", price: 729 }, { label: "17x9cm", price: 729 }],
  },

  // ── Candles › Tealight Holders ────────────────────────────────────────────
  {
    categorySlug: "candles", subcategorySlug: "tealight-holders",
    sku: "DC-CJ-005", name: "Pebble Tealight Holders",
    variants: [{ label: "3.8x9.1cm", price: 199 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "tealight-holders",
    sku: "DC-CJ-006", name: "Geometric Tealight Holders",
    variants: [{ label: "4x8cm", price: 799 }],
  },
  {
    categorySlug: "candles", subcategorySlug: "tealight-holders",
    sku: "DC-CJ-007", name: "Cushion Tealight Holders",
    variants: [{ label: "7.9x7.8cm", price: 199 }],
  },

  // ── Trays › Ocean & Shell ─────────────────────────────────────────────────
  {
    categorySlug: "trays", subcategorySlug: "ocean-shell",
    sku: "DC-TT-001", name: "Shell Trays",
    variants: [{ label: "10.3x10.7cm", price: 299 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "ocean-shell",
    sku: "DC-TT-002", name: "Deep Conch Trinket",
    variants: [{ label: "17x12x6cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "ocean-shell",
    sku: "DC-TT-003", name: "Conch Trinkets",
    variants: [{ label: "7.1x14cm", price: 499 }, { label: "16.5x14.5cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "ocean-shell",
    sku: "DC-TT-005", name: "Star Fish Trinket",
    variants: [{ label: "13.2x12.5cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "ocean-shell",
    sku: "DC-TT-025", name: "Mystic Shell Trays",
    variants: [{ label: "14.5x10cm", price: 399 }, { label: "9.3cm", price: 399 }],
  },

  // ── Trays › Nature-Inspired ───────────────────────────────────────────────
  {
    categorySlug: "trays", subcategorySlug: "nature-inspired",
    sku: "DC-TT-006", name: "Cloud Trinket Trays",
    variants: [{ label: "Small 16x24cm", price: 399 }, { label: "Big 19x13cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "nature-inspired",
    sku: "DC-TT-008", name: "Ripple Trinket Trays",
    variants: [{ label: "Small 16x24cm", price: 399 }, { label: "Big 19x13cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "nature-inspired",
    sku: "DC-TT-010", name: "Ginko Leaf Tray",
    variants: [{ label: "14.5x18cm", price: 349 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "nature-inspired",
    sku: "DC-TT-011", name: "Maple Leaf Trinket",
    variants: [{ label: "15.4x13.4cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "nature-inspired",
    sku: "DC-TT-012", name: "Leaf Trinkets",
    variants: [{ label: "9x24cm", price: 349 }],
  },

  // ── Trays › Geometric & Bubble ────────────────────────────────────────────
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-013", name: "Bubble Tray (Big Round)",
    variants: [{ label: "13cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-014", name: "Bubble Tray (Small Round)",
    variants: [{ label: "13.5cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-015", name: "Bubble Tray (Square)",
    variants: [{ label: "9.8x9.8cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-016", name: "Asymmetric Trays",
    variants: [{ label: "28x13.5x4.9cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-017", name: "Textured Trinket Tray (Round)",
    variants: [{ label: "12cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-018", name: "Textured Trinket Tray (Square)",
    variants: [{ label: "13cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "geometric-bubble",
    sku: "DC-TT-019", name: "Textured Trinket Tray (Rectangle)",
    variants: [{ label: "18x2.7cm", price: 499 }],
  },

  // ── Trays › Symbolic & Decorative ────────────────────────────────────────
  {
    categorySlug: "trays", subcategorySlug: "symbolic-decorative",
    sku: "DC-TT-020", name: "Hamsa Hand Tray",
    variants: [{ label: "14.5x18cm", price: 399 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "symbolic-decorative",
    sku: "DC-TT-021", name: "Angel Wings Trinket (pair)",
    variants: [{ label: "15.4x13.4cm", price: 699 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "symbolic-decorative",
    sku: "DC-TT-022", name: "Victorian Trinkets",
    variants: [{ label: "9x24cm", price: 499 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "symbolic-decorative",
    sku: "DC-TT-023", name: "Turtle Trays",
    variants: [{ label: "19x14cm", price: 599 }],
  },
  {
    categorySlug: "trays", subcategorySlug: "symbolic-decorative",
    sku: "DC-TT-024", name: "Halfmoon Trays",
    variants: [{ label: "15x7cm", price: 499 }],
  },

  // ── Vases › Donut & Round ─────────────────────────────────────────────────
  {
    categorySlug: "vases", subcategorySlug: "donut-round",
    sku: "DC-V-001", name: "Donut Vase (Small)",
    variants: [{ label: "13.2x10.2cm", price: 599 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "donut-round",
    sku: "DC-V-002", name: "Donut Vase (Medium)",
    variants: [{ label: "15x12.7cm", price: 699 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "donut-round",
    sku: "DC-V-003", name: "Donut Vase (Large)",
    variants: [{ label: "20x18cm", price: 899 }],
  },

  // ── Vases › Spiral & Bubble ───────────────────────────────────────────────
  {
    categorySlug: "vases", subcategorySlug: "spiral-bubble",
    sku: "DC-V-004", name: "Spiral Vase (Round)",
    variants: [{ label: "20.5x16cm", price: 699 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "spiral-bubble",
    sku: "DC-V-005", name: "Spiral Vase (Oval)",
    variants: [{ label: "30x17cm", price: 899 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "spiral-bubble",
    sku: "DC-V-006", name: "Bubble Vase (Small)",
    variants: [{ label: "8x6cm", price: 499 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "spiral-bubble",
    sku: "DC-V-007", name: "Bubble Vase (Large)",
    variants: [{ label: "10x7cm", price: 599 }],
  },

  // ── Vases › Tube & Ribbed ─────────────────────────────────────────────────
  {
    categorySlug: "vases", subcategorySlug: "tube-ribbed",
    sku: "DC-V-008", name: "Tube Vase",
    variants: [{ label: "11x12.5cm", price: 599 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "tube-ribbed",
    sku: "DC-V-009", name: "Ribbed Round-Neck Vase",
    variants: [{ label: "10x7.5cm", price: 499 }],
  },
  {
    categorySlug: "vases", subcategorySlug: "tube-ribbed",
    sku: "DC-V-010", name: "Ribbed Long Vase",
    variants: [{ label: "15x9.9cm", price: 599 }],
  },

  // ── Coasters (no subcategory) ─────────────────────────────────────────────
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-001", name: "Rectangle Texture Coaster",
    variants: [{ label: "4in", price: 145 }],
  },
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-002", name: "Waves Round Coaster",
    variants: [{ label: "4in", price: 145 }],
  },
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-003", name: "Hexagon Lines Coaster",
    variants: [{ label: "4in", price: 145 }],
  },
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-004", name: "Mandala Coaster",
    variants: [{ label: "4.5in", price: 199 }],
  },
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-005", name: "Multi-Shaped Coaster",
    variants: [{ label: "4in", price: 145 }],
  },
  {
    categorySlug: "coasters", subcategorySlug: null,
    sku: "DC-CS-006", name: "Round Coasters with Stand (set)",
    variants: [{ label: "4in set", price: 599 }],
  },

  // ── Planters & Organisers › Figurine Planters ─────────────────────────────
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-001", name: "Lady Face Planter",
    variants: [{ label: "9x11cm", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-002", name: "Whisper Girls Planter",
    variants: [{ label: "9.5x7cm", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-003", name: "Helping Hands Planter",
    variants: [{ label: "14x15.5cm", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-007", name: "Gothic Style Vase",
    variants: [{ label: "7.5x9cm", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-008", name: "Sunflower Vase",
    variants: [{ label: "9.5x7cm", price: 599 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-009", name: "Long Hair Girl Vase",
    variants: [{ label: "14x15.5cm", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "figurine-planters",
    sku: "DC-PL-010", name: "Harmony Hand Vase",
    variants: [{ label: "10x7.5cm", price: 599 }],
  },

  // ── Planters & Organisers › Nature Planters ───────────────────────────────
  {
    categorySlug: "planters-organisers", subcategorySlug: "nature-planters",
    sku: "DC-PL-004", name: "Planter (Style A)",
    variants: [{ label: "Standard", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "nature-planters",
    sku: "DC-PL-005", name: "Planter (Style B)",
    variants: [{ label: "Standard", price: 699 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "nature-planters",
    sku: "DC-PL-011", name: "Pinecone Vase",
    variants: [{ label: "8.2x8.5cm", price: 599 }],
  },
  {
    categorySlug: "planters-organisers", subcategorySlug: "nature-planters",
    sku: "DC-PL-012", name: "Treestump Planter",
    variants: [{ label: "6x4cm", price: 499 }],
  },

  // ── Planters & Organisers › Organisers ────────────────────────────────────
  {
    categorySlug: "planters-organisers", subcategorySlug: "organisers",
    sku: "DC-PL-006", name: "Desk Organiser (full set)",
    variants: [{ label: "Full set", price: 799 }],
  },

  // ── Diffusers & Sculptures › Passive Diffusers ────────────────────────────
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "passive-diffusers",
    sku: "DC-PD-001", name: "Peony Diffuser",
    variants: [{ label: "10cm", price: 499 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "passive-diffusers",
    sku: "DC-PD-002", name: "Aroma Diffuser Tag",
    variants: [{ label: "6x3cm", price: 199 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "passive-diffusers",
    sku: "DC-PD-003", name: "Carnation Diffuser",
    variants: [{ label: "10cm", price: 499 }],
  },

  // ── Diffusers & Sculptures › Sculptures ──────────────────────────────────
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-001", name: "Couple Statue",
    variants: [{ label: "13.5x7cm", price: 699 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-002", name: "Ladies Statue",
    variants: [{ label: "13.5x7cm", price: 1199 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-003", name: "La Familia (set)",
    variants: [{ label: "9x6.7/8x5.7/5.8x3.9cm", price: 1499 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-004", name: "3D Abstract Faces (set of 4)",
    variants: [{ label: "5x3cm", price: 599 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-005", name: "Blindfold Lady",
    variants: [{ label: "9x8cm", price: 499 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-006", name: "Carnation Sculpture",
    variants: [{ label: "9x8cm", price: 499 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-007", name: "Balloon Dogs",
    variants: [{ label: "6x6.5cm", price: 199 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-008", name: "3D Teddy",
    variants: [{ label: "6x8cm", price: 299 }],
  },
  {
    categorySlug: "diffusers-sculptures", subcategorySlug: "sculptures",
    sku: "DC-SS-009", name: "Turtle Set",
    variants: [{ label: "14x9.5cm/6x4.5cm", price: 449 }],
  },

  // ── Vanity & Jewelry › Ring & Trinket ────────────────────────────────────
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "ring-trinket",
    sku: "DC-VA-001", name: "Ring Organiser",
    variants: [{ label: "12x11.5cm", price: 299 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "ring-trinket",
    sku: "DC-VA-002", name: "Ring Stands (set of 6)",
    variants: [{ label: "20x10cm tray", price: 549 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "ring-trinket",
    sku: "DC-VA-003", name: "Bow Tray (Small)",
    variants: [{ label: "12x1.5cm", price: 299 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "ring-trinket",
    sku: "DC-VA-004", name: "Bow Tray (Medium)",
    variants: [{ label: "11x1.5cm", price: 299 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "ring-trinket",
    sku: "DC-VA-005", name: "Bow Tray (Large)",
    variants: [{ label: "20x11cm", price: 399 }],
  },

  // ── Vanity & Jewelry › Display & Mirror ──────────────────────────────────
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "display-mirror",
    sku: "DC-VA-006", name: "Display Frames (set of 2)",
    variants: [{ label: "13.3x10cm/9.44x6.14cm", price: 499 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "display-mirror",
    sku: "DC-VA-007", name: "Mirror with Tray Set",
    variants: [{ label: "20x10cm tray", price: 1299 }],
  },
  {
    categorySlug: "vanity-jewelry", subcategorySlug: "display-mirror",
    sku: "DC-VA-008", name: "Lady Statue (vanity)",
    variants: [{ label: "20x10cm tray", price: 1100 }],
  },

  // ── Customization › Wooden Coasters ──────────────────────────────────────
  {
    categorySlug: "customization", subcategorySlug: "wooden-coasters",
    sku: "DC-CC-001", name: "Round Wooden Coasters (set of 2)",
    variants: [{ label: "10cm", price: 399 }],
  },
  {
    categorySlug: "customization", subcategorySlug: "wooden-coasters",
    sku: "DC-CC-003", name: "Round Wooden Coaster (single)",
    variants: [{ label: "10cm", price: 199 }],
  },
  {
    categorySlug: "customization", subcategorySlug: "wooden-coasters",
    sku: "DC-CC-004", name: "Wooden Coffee & Books Coasters (set of 2)",
    variants: [{ label: "10cm", price: 399 }],
  },
  {
    categorySlug: "customization", subcategorySlug: "wooden-coasters",
    sku: "DC-CC-006", name: "Wooden Ocean Theme Coasters (set of 2)",
    variants: [{ label: "10cm", price: 399 }],
  },

  // ── Customization › Concrete Coasters ────────────────────────────────────
  {
    categorySlug: "customization", subcategorySlug: "concrete-coasters",
    sku: "DC-CC-002", name: "Concrete Coasters (set of 2)",
    variants: [{ label: "10cm", price: 349 }],
  },

  // ── Customization › Sets ──────────────────────────────────────────────────
  {
    categorySlug: "customization", subcategorySlug: "sets",
    sku: "DC-CC-005", name: "Orange Coaster & Tray Set",
    variants: [{ label: "10cm + 20x10cm tray", price: 649 }],
  },

  // ── Signature Styling Sets (no subcategory) ───────────────────────────────
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-001", name: "Sculptural Decor Set",
    variants: [{ label: "20cm tray", price: 1799 }],
  },
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-002", name: "Serenity Collection",
    variants: [{ label: "20cm", price: 2499 }],
  },
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-003", name: "Minimalist Living Ensemble",
    variants: [{ label: "20x10cm tray", price: 1499 }],
  },
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-004", name: "Candle Charm Tray",
    variants: [{ label: "20cm tray", price: 3199 }],
  },
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-005", name: "Aesthetic Home Styling Set",
    variants: [{ label: "20cm tray", price: 1799 }],
  },
  {
    categorySlug: "styling-sets", subcategorySlug: null,
    sku: "DC-CD-006", name: "Modern Calm Collection",
    variants: [{ label: "20cm tray", price: 3499 }],
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  console.log("Dreamcraft seed starting…\n");

  // 1. Categories
  process.stdout.write("→ categories… ");
  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .upsert(CATEGORIES, { onConflict: "slug" })
    .select("id, slug");
  if (catErr) throw new Error(`categories: ${catErr.message}`);
  const catMap = new Map(cats!.map((c) => [c.slug, c.id as string]));
  console.log(`${cats!.length} upserted`);

  // 2. Subcategories — insert rows that don't exist yet, then fetch all for the map
  process.stdout.write("→ subcategories… ");
  const subcatRows = SUBCATEGORIES.map((s) => ({
    category_id: catMap.get(s.categorySlug)!,
    name: s.name,
    slug: s.slug,
    sort_order: s.sort_order,
  }));
  const { data: existingSubcats } = await supabase
    .from("subcategories")
    .select("slug");
  const existingSubcatSlugs = new Set(existingSubcats?.map((s) => s.slug) ?? []);
  const newSubcats = subcatRows.filter((s) => !existingSubcatSlugs.has(s.slug));
  if (newSubcats.length > 0) {
    const { error: subcatErr } = await supabase.from("subcategories").insert(newSubcats);
    if (subcatErr) throw new Error(`subcategories: ${subcatErr.message}`);
  }
  const { data: allSubcats, error: fetchSubcatErr } = await supabase
    .from("subcategories")
    .select("id, slug");
  if (fetchSubcatErr) throw new Error(`subcategories fetch: ${fetchSubcatErr.message}`);
  const subcatMap = new Map(allSubcats!.map((s) => [s.slug, s.id as string]));
  console.log(`${allSubcats!.length} total (${newSubcats.length} inserted)`);

  // 3. Products
  process.stdout.write("→ products… ");
  const productRows = PRODUCTS.map((p) => ({
    category_id: catMap.get(p.categorySlug)!,
    subcategory_id: p.subcategorySlug ? (subcatMap.get(p.subcategorySlug) ?? null) : null,
    sku: p.sku,
    name: p.name,
    description: p.categorySlug === "candles" ? CANDLE_DESC : RESIN_DESC,
    is_bestseller: BESTSELLERS.has(p.sku),
    is_active: true,
  }));
  const { data: products, error: productErr } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "sku" })
    .select("id, sku");
  if (productErr) throw new Error(`products: ${productErr.message}`);
  const productMap = new Map(products!.map((p) => [p.sku, p.id as string]));
  console.log(`${products!.length} upserted`);

  const productIds = products!.map((p) => p.id);

  // 4. Variants — delete then re-insert so prices stay correct on re-runs
  process.stdout.write("→ product_variants… ");
  await supabase.from("product_variants").delete().in("product_id", productIds);
  const variantRows = PRODUCTS.flatMap((p) =>
    p.variants.map((v) => ({
      product_id: productMap.get(p.sku)!,
      label: v.label,
      price: v.price,
    }))
  );
  const { error: variantErr } = await supabase.from("product_variants").insert(variantRows);
  if (variantErr) throw new Error(`product_variants: ${variantErr.message}`);
  console.log(`${variantRows.length} inserted`);

  // 5. Images — one placeholder per product
  process.stdout.write("→ product_images… ");
  await supabase.from("product_images").delete().in("product_id", productIds);
  const imageRows = productIds.map((id) => ({
    product_id: id,
    url: "/placeholder-product.jpg",
    sort_order: 0,
  }));
  const { error: imageErr } = await supabase.from("product_images").insert(imageRows);
  if (imageErr) throw new Error(`product_images: ${imageErr.message}`);
  console.log(`${imageRows.length} inserted`);

  // 6. Testimonials — only insert sample rows on first run; skip if any exist
  //    so real reviews added via the admin panel are never overwritten.
  process.stdout.write("→ testimonials (sample)… ");
  const { data: existingTestimonials } = await supabase
    .from("testimonials")
    .select("id")
    .limit(1);
  let testimonialMsg: string;
  if (!existingTestimonials?.length) {
    const { error: testimonialErr } = await supabase
      .from("testimonials")
      .insert(SAMPLE_TESTIMONIALS);
    if (testimonialErr) throw new Error(`testimonials: ${testimonialErr.message}`);
    testimonialMsg = `${SAMPLE_TESTIMONIALS.length} sample rows inserted`;
  } else {
    testimonialMsg = "skipped (rows already exist — manage via admin panel)";
  }
  console.log(testimonialMsg);

  console.log(`
Done!
  ${cats!.length} categories
  ${allSubcats!.length} subcategories
  ${products!.length} products  (${BESTSELLERS.size} bestsellers)
  ${variantRows.length} variants
  ${imageRows.length} images
  testimonials: ${testimonialMsg}
`);
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
