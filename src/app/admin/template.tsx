import { AdminRouteTemplate } from "@/components/admin/AdminRouteTemplate";
import { areR2GameUploadsEnabled } from "@/lib/r2GameUploads";
import "./portal.css";

export default function AdminTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminRouteTemplate r2GameUploadsEnabled={areR2GameUploadsEnabled()}>{children}</AdminRouteTemplate>;
}
