import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ClipManager } from "./_components/ClipManager";

export const metadata: Metadata = { title: "Process Clips | Dreamcraft Admin" };

export type ClipRow = {
  id:            string;
  title:         string;
  thumbnail_url: string;
  video_url:     string;
  sort_order:    number;
  is_active:     boolean;
};

export default async function ProcessClipsPage() {
  const { data } = await createClient()
    .from("process_clips")
    .select("*")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Process Clips</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Behind-the-scenes video clips shown on the homepage. Drag to reorder.
        </p>
      </div>
      <ClipManager initialItems={(data ?? []) as ClipRow[]} />
    </div>
  );
}
