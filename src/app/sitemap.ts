import type { MetadataRoute } from "next";
import { categories, posts, slugifyCategory } from "@/data/posts";
import { getPublishedGames } from "@/lib/publicGames";
import { canonicalUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getPublishedGames();
  const staticRoutes = ["", "/games", "/blog", "/about", "/contact", "/privacy-policy", "/terms-of-service"].map((route) => ({
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

  const categoryRoutes = categories.map((category) => ({
    url: canonicalUrl(`/blog/category/${slugifyCategory(category)}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.65
  }));

  return [...staticRoutes, ...gameRoutes, ...categoryRoutes, ...blogRoutes];
}
