import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin | Uniblex",
  description: "Uniblex admin dashboard UI."
};

export default function AdminPage() {
  return <AdminShell />;
}
