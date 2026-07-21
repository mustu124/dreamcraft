import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("name, slug")
    .order("sort_order");

  // Candles gets de-emphasized site-wide — kept as a real, browsable category
  // (products/data untouched), just not listed in the footer's Shop links.
  const footerCategories = (categories ?? []).filter((c) => c.slug !== "candles");

  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer categories={footerCategories} />
    </CartProvider>
  );
}
