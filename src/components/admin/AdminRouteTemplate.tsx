"use client";

import { usePathname } from "next/navigation";
import { AdminPortalAccessGate } from "@/components/admin/AdminPortalAccessGate";

export function AdminRouteTemplate({ children, r2GameUploadsEnabled }: { children: React.ReactNode; r2GameUploadsEnabled: boolean }) {
  const pathname = usePathname();
  if (pathname !== "/admin") return children;
  return <AdminPortalAccessGate r2GameUploadsEnabled={r2GameUploadsEnabled} />;
}
