import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/developers/dashboard", "/developers/games", "/developers/drafts", "/developers/submissions", "/developers/uploads", "/developers/notifications", "/developers/profile", "/developers/team", "/developers/billing", "/developers/login", "/developers/register", "/developers/recover"] }],
    sitemap: canonicalUrl("/sitemap.xml"),
    host: canonicalUrl("/")
  };
}
