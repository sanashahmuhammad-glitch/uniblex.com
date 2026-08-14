import type { Metadata } from "next";
import { AdminResetPasswordForm } from "@/components/admin/AdminResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Admin Password",
  description: "Set a new password for a Uniblex admin account.",
  robots: { index: false, follow: false }
};

export default function AdminResetPasswordPage() {
  return <AdminResetPasswordForm />;
}
