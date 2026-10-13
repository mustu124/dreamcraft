import sharp from "sharp";
import { MAX_WIDTH, VARIANT_WIDTHS } from "./variants";

export type ImageSet = {
  main: Buffer;
  variants: { width: number; data: Buffer }[];
};

async function encode(input: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .rotate() // bake in EXIF orientation before the metadata is dropped
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toBuffer();
}

// Re-encodes an image as WebP at full size plus each variant width.
// Returns null when the file can't be safely re-encoded (animated, corrupt,
// unsupported) — callers then store the original bytes as-is.
export async function buildImageSet(input: Buffer): Promise<ImageSet | null> {
  try {
    const meta = await sharp(input).metadata();
    if ((meta.pages ?? 1) > 1) return null;

    const [main, ...variants] = await Promise.all([
      encode(input, MAX_WIDTH, 80),
      ...VARIANT_WIDTHS.map((w) => encode(input, w, 74)),
    ]);
    return {
      main,
      variants: VARIANT_WIDTHS.map((width, i) => ({ width, data: variants[i] })),
    };
  } catch {
    return null;
  }
}
