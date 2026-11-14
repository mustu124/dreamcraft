/** @type {import('next').NextConfig} */

// Extract hostname from the Supabase project URL so remotePatterns stays
// in sync with the env var rather than being hardcoded.
const supabaseHostname = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const nextConfig = {
  experimental: {
    // @react-pdf/renderer uses Node.js native modules — keep it out of the
    // client bundle and let Next.js require() it at the server side only.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },

  images: {
    // No Vercel image optimizer (its monthly quota ran out and broke images
    // with 402s). Instead the loader maps each requested width onto the
    // pre-sized WebP copies kept in Supabase Storage (lib/images/variants.ts),
    // so a 200px product card downloads a ~20 KB file, not a 3 MB original.
    // Supabase bills every byte served from Storage as egress.
    loader: "custom",
    loaderFile: "./lib/images/loader.ts",
    // Match the stored copies (w480 / w960 / full 1600) so srcset has no
    // duplicate entries that resolve to the same file.
    deviceSizes: [480, 960, 1600],
    imageSizes: [96, 240],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Picsum placeholder images used during development / seeding
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
