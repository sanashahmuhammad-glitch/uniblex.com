import type { MetadataRoute } from "next";
import { posts } from "@/data/posts";
import { getPublishedGames } from "@/lib/publicGames";
import { canonicalUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getPublishedGames();
  const staticRoutes = ["", "/games", "/blog", "/about", "/contact", "/privacy-policy", "/terms-of-service"].map((route) => ({
    url: canonicalUrl(route || "/"),
    lastModified: new Date()
  }));

  const gameRoutes = games.map((game) => ({
    url: canonicalUrl(`/games/${game.slug}`),
    lastModified: new Date()
  }));

  const blogRoutes = posts.map((post) => ({
    url: canonicalUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt)
  }));

  return [...staticRoutes, ...gameRoutes, ...blogRoutes];
}
