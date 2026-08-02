import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName  = typeof body?.lastName  === "string" ? body.lastName.trim()  : "";
  const email     = typeof body?.email     === "string" ? body.email.trim().toLowerCase() : "";

  if (!firstName) {
    return NextResponse.json({ error: "First name is required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("newsletter_subscribers").insert({
    first_name: firstName,
    last_name:  lastName || null,
    email,
  });

  // Already-subscribed is a success from the customer's point of view.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Could not subscribe right now. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
