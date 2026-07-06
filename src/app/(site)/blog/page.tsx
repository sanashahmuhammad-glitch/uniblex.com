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
    <main className="container-pad py-12 md:py-16">
      <div className="mb-10 max-w-3xl">
        <p className="text-uniblex-blue">Articles</p>
        <h1 className="font-heading text-4xl leading-tight md:text-5xl">Blog & Tutorials</h1>
        <p className="mt-4 text-lg leading-8 text-uniblex-gray">
          Original content for game developers, 3D artists, creators, and browser gaming fans. These articles support discovery, learning, and AdSense-ready content depth for Uniblex.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {categories.map((category) => (
          <span key={category} className="rounded-full border border-uniblex-border bg-white/[.03] px-4 py-2 text-sm font-bold text-uniblex-gray">
            {category}
          </span>
        ))}
      </div>

      <AdZone label="Blog Header" size="leaderboard" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </main>
  );
}
