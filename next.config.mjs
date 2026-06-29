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
