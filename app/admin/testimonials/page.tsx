import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TestimonialManager } from "./_components/TestimonialManager";

export const metadata: Metadata = { title: "Testimonials | Dreamcraft Admin" };

export type TestimonialRow = {
  id:                 string;
  customer_name:      string;
  customer_city:      string;
  customer_photo_url: string | null;
  review_text:        string;
  rating:             number;
  sort_order:         number;
  is_active:          boolean;
};

export default async function TestimonialsPage() {
  const { data } = await createClient()
    .from("testimonials")
    .select("*")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Drag to reorder. Active reviews appear in the homepage carousel.
        </p>
      </div>
      <TestimonialManager initialItems={(data ?? []) as TestimonialRow[]} />
    </div>
  );
}
