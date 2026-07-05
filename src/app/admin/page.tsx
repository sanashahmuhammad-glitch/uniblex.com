import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";

export const metadata: Metadata = {
  title: "Admin | Uniblex",
  description: "Uniblex admin dashboard UI."
};

export default function AdminPage() {
  return <AdminAccessGate />;
}
