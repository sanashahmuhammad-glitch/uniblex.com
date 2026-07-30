import type { MetadataRoute } from "next";
import { posts } from "@/data/posts";
import { getPublishedGames } from "@/lib/publicGames";
import { canonicalUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getPublishedGames();
  const staticRoutes = ["", "/games", "/blog", "/about", "/contact", "/privacy-policy", "/terms-of-service", "/developers", "/developers/getting-started", "/developers/docs", "/developers/sdk", "/developers/requirements", "/developers/guidelines", "/developers/unity", "/developers/html5", "/developers/builds", "/developers/media", "/developers/publishing", "/developers/monetization", "/developers/faq", "/developers/support"].map((route) => ({
    url: canonicalUrl(route || "/"),
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" as const : "weekly" as const,
    priority: route === "" ? 1 : 0.8
  }));

  const gameRoutes = games.map((game) => ({
    url: canonicalUrl(`/games/${game.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  const blogRoutes = posts.map((post) => ({
    url: canonicalUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6
  }));

  return [...staticRoutes, ...gameRoutes, ...blogRoutes];
}
