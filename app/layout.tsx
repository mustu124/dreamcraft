import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreamcraft.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Dreamcraft — Handmade Eco-Resin Decor & Soy Wax Candles",
    template: "%s | Dreamcraft",
  },
  description:
    "Handmade eco-resin home decor and hand-poured soy wax candles, crafted to order in India. Every piece tells a story.",

  openGraph: {
    type:        "website",
    siteName:    "Dreamcraft",
    title:       "Dreamcraft — Handmade Eco-Resin Decor & Soy Wax Candles",
    description: "Handmade eco-resin home decor and hand-poured soy wax candles, crafted to order in India. Every piece tells a story.",
    url:         SITE_URL,
    // Place a 1200×630 hero shot at public/og-image.jpg to activate this
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Dreamcraft handmade decor" }],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "Dreamcraft — Handmade Eco-Resin Decor & Soy Wax Candles",
    description: "Handmade eco-resin home decor and hand-poured soy wax candles, crafted to order in India.",
    images:      ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <body className="font-body bg-ivory text-navy antialiased">{children}</body>
    </html>
  );
}
