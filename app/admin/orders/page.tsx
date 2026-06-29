import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrdersTable } from "./_components/OrdersTable";

export const metadata: Metadata = { title: "Orders | Dreamcraft Admin" };

export type OrderListRow = {
  id:                  string;
  created_at:          string;
  status:              string;
  customer_name:       string;
  phone:               string;
  email:               string;
  city:                string;
  state:               string;
  subtotal:            number;
  total:               number;
  razorpay_order_id:   string | null;
  razorpay_payment_id: string | null;
};

export default async function OrdersPage() {
  // Service-role query — orders table has no public read policy
  const { data } = await createAdminClient()
    .from("orders")
    .select("id, created_at, status, customer_name, phone, email, city, state, subtotal, total, razorpay_order_id, razorpay_payment_id")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Click any row to view full details. Use the CSV export for accounting.
        </p>
      </div>
      <OrdersTable initialOrders={(data ?? []) as OrderListRow[]} />
    </div>
  );
}
