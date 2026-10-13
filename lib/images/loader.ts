import { storageImageUrl } from "./variants";

// next/image loader (see next.config.mjs). Maps each requested width onto the
// pre-sized copies kept in Supabase Storage, so no on-the-fly optimizer is
// needed. Local /public files pass through untouched.
export default function storageLoader({ src, width }: { src: string; width: number }): string {
  return storageImageUrl(src, width);
}
