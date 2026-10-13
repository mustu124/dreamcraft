// Every optimizable image in a public Storage bucket is stored three times:
//
//   <bucket>/<path>        full size, at most MAX_WIDTH wide
//   <bucket>/w960/<path>   at most 960 wide
//   <bucket>/w480/<path>   at most 480 wide
//
// The upload route writes all three for new files and
// scripts/optimize-storage.mts back-fills them for existing ones, so the site
// can ask for the smallest file that fits instead of the original each time.
// Storage egress is metered, and the grid pages load dozens of images.

export const MAX_WIDTH = 1600;
export const VARIANT_WIDTHS = [960, 480] as const;

export const IMAGE_BUCKETS = [
  "banners", "categories", "avatars", "gallery", "clips", "product-images",
] as const;

// One year. New uploads get unique names, so they never change in place.
export const CACHE_SECONDS = "31536000";

const OPTIMIZABLE_EXT = /\.(jpe?g|png|webp|avif)$/i;
const PUBLIC_URL = new RegExp(
  `^(https?://[^/]+/storage/v1/object/public/(?:${IMAGE_BUCKETS.join("|")})/)([^?#]+)$`,
);

export function isOptimizablePath(path: string): boolean {
  return OPTIMIZABLE_EXT.test(path);
}

export function variantPath(path: string, width: number): string {
  return `w${width}/${path}`;
}

// Returns the URL of the smallest stored copy that is at least `width` wide.
// Anything that isn't one of our Storage images is returned unchanged.
export function storageImageUrl(src: string, width: number): string {
  const m = PUBLIC_URL.exec(src);
  if (!m || !isOptimizablePath(m[2]) || /^w\d+\//.test(m[2])) return src;

  const fit = [...VARIANT_WIDTHS].reverse().find((w) => width <= w);
  return fit ? m[1] + variantPath(m[2], fit) : src;
}
