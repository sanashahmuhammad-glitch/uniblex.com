import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to the protected Uniblex admin dashboard.",
  robots: { index: false, follow: false }
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
