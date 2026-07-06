import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";

export const metadata: Metadata = {
  title: "Admin | Uniblex",
  description: "Uniblex admin dashboard UI.",
  robots: { index: false, follow: false }
};

export default function AdminPage() {
  return <AdminAccessGate />;
}
