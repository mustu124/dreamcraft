import { redirect } from "next/navigation";

// There is no dedicated bestsellers page — products are marked as bestsellers
// via the toggle on the main products list. Redirect there with the filter pre-applied.
export default function BestsellersPage() {
  redirect("/admin/products?is_bestseller=true");
}
