import type { MetadataRoute } from "next";
import { games } from "@/data/games";
import { posts } from "@/data/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uniblex.com";
  const staticRoutes = ["", "/games", "/blog", "/about", "/contact", "/privacy-policy", "/terms-of-service"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date()
  }));

  const gameRoutes = games.map((game) => ({
    url: `${siteUrl}/games/${game.slug}`,
    lastModified: new Date()
  }));

  const blogRoutes = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt)
  }));

  return [...staticRoutes, ...gameRoutes, ...blogRoutes];
}
