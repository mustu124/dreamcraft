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

  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer categories={categories ?? []} />
    </CartProvider>
  );
}
