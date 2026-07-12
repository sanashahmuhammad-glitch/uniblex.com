import type { Metadata } from "next";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { areR2GameUploadsEnabled } from "@/lib/r2GameUploads";

export const metadata: Metadata = {
  title: "Admin | Uniblex",
  description: "Uniblex admin dashboard UI.",
  robots: { index: false, follow: false }
};

export default function AdminPage() {
  return <AdminAccessGate r2GameUploadsEnabled={areR2GameUploadsEnabled()} />;
}
