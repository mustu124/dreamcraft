import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/products/sku-suggest?category_id=xxx
// Returns the next logical SKU for a category by inspecting existing SKU patterns.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categoryId = req.nextUrl.searchParams.get("category_id");
  if (!categoryId) return NextResponse.json({ error: "category_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Fetch all SKUs in this category
  const { data: products } = await admin
    .from("products")
    .select("sku")
    .eq("category_id", categoryId);

  let prefix = "";
  let maxNum = 0;

  for (const p of products ?? []) {
    // Match anything like "DC-CJ-013" or "DC-TR-002"
    const m = p.sku.match(/^(.+)-(\d+)$/);
    if (m) {
      if (!prefix) prefix = m[1];
      const n = parseInt(m[2], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  // Fallback: derive a prefix from the category slug (e.g. "planters-organisers" → "DC-PO")
  if (!prefix) {
    const { data: cat } = await admin
      .from("categories")
      .select("slug")
      .eq("id", categoryId)
      .single();

    if (cat?.slug) {
      const letters = cat.slug
        .split("-")
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 4);
      prefix = `DC-${letters || "PR"}`;
    } else {
      prefix = "DC-PR";
    }
  }

  const suggestion = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
  return NextResponse.json({ suggestion });
}
