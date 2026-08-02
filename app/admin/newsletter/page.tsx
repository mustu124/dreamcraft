import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscribersTable } from "./_components/SubscribersTable";

export const metadata: Metadata = { title: "Newsletter | Dreamcraft Admin" };

export type SubscriberRow = {
  id:         string;
  first_name: string;
  last_name:  string | null;
  email:      string;
  created_at: string;
};

export default async function NewsletterPage() {
  // Service-role query — newsletter_subscribers has no public read policy
  const { data } = await createAdminClient()
    .from("newsletter_subscribers")
    .select("id, first_name, last_name, email, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Everyone who signed up for updates via the site footer.
        </p>
      </div>
      <SubscribersTable subscribers={(data ?? []) as SubscriberRow[]} />
    </div>
  );
}
