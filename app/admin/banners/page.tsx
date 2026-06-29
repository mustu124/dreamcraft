import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BannerManager } from "./_components/BannerManager";

export const metadata: Metadata = { title: "Banners | Dreamcraft Admin" };

export type BannerRow = {
  id:               string;
  image_url:        string;
  mobile_image_url: string;
  link_url:         string | null;
  is_active:        boolean;
  sort_order:       number;
};

export default async function BannersPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("banners")
    .select("id, image_url, mobile_image_url, link_url, is_active, sort_order")
    .order("sort_order")
    .returns<BannerRow[]>();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          These appear in the homepage hero carousel, in display order.
        </p>
      </div>

      <BannerManager initialBanners={data ?? []} />
    </div>
  );
}
