import type { Metadata } from "next";
import { PostCard } from "@/components/site/PostCard";
import { AdZone } from "@/components/site/AdZone";
import { categories, posts } from "@/data/posts";
import { canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog & Game Dev Articles",
  description: "Read Uniblex game development, 3D art, tutorials and industry news articles.",
  keywords: pageKeywords("game development blog", "3D art articles", "WebGL tutorials", "browser game SEO"),
  authors: defaultAuthors,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/blog") },
  openGraph: {
    title: "Blog & Game Dev Articles | Uniblex",
    description: "Read Uniblex game development, 3D art, tutorials and industry news articles.",
    url: canonicalUrl("/blog"),
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Uniblex game development articles" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    title: "Blog & Game Dev Articles | Uniblex",
    description: "Read Uniblex game development, 3D art, tutorials and industry news articles.",
    images: [siteConfig.ogImage]
  }
};

export default function BlogPage() {
  return (
    <main className="container-pad py-8 md:py-12">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/70 to-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(0,178,255,.18),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(122,60,255,.18),transparent_28%)]" />
        <div className="relative max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[.24em] text-uniblex-blue">Articles</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-6xl">Blog & Tutorials</h1>
          <p className="mt-4 text-base leading-7 text-uniblex-gray md:text-lg md:leading-8">
            Game development, 3D art, WebGL, and creator-focused guides presented like a premium gaming knowledge hub.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {categories.map((category) => (
          <span key={category} className="rounded-full border border-white/10 bg-white/[.045] px-4 py-2 text-sm font-bold text-uniblex-gray shadow-[0_10px_30px_rgba(0,0,0,.14)]">
            {category}
          </span>
        ))}
      </div>

      <AdZone label="Blog Header" size="leaderboard" />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </main>
  );
}
