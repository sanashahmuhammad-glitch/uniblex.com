import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdZone } from "@/components/site/AdZone";
import { PostCard } from "@/components/site/PostCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { categories, getCategory, getPostsByCategory, slugifyCategory } from "@/data/posts";
import { breadcrumbJsonLd, canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: slugifyCategory(category) }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const category = getCategory(params.slug);
  if (!category) return {};

  const title = `${category} Articles`;
  const description = `Read Uniblex ${category.toLowerCase()} articles, tutorials, and browser game development insights.`;
  const url = canonicalUrl(`/blog/category/${params.slug}`);

  return {
    title,
    description,
    keywords: pageKeywords(category, `${category} articles`, "game development articles"),
    authors: defaultAuthors,
    robots: defaultRobots,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Uniblex`,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: `${category} articles on Uniblex` }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
      title: `${title} | Uniblex`,
      description,
      images: [siteConfig.ogImage]
    }
  };
}

export default function BlogCategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  if (!category) return notFound();

  const categoryPosts = getPostsByCategory(category);
  const url = canonicalUrl(`/blog/category/${params.slug}`);

  return (
    <main className="container-pad py-12 md:py-16">
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", url: canonicalUrl("/") },
        { name: "Blog", url: canonicalUrl("/blog") },
        { name: category, url }
      ])} />

      <div className="mb-10 max-w-3xl">
        <p className="text-uniblex-blue">Category</p>
        <h1 className="font-heading text-4xl leading-tight md:text-5xl">{category} Articles</h1>
        <p className="mt-4 text-lg leading-8 text-uniblex-gray">
          Browse Uniblex articles grouped under {category}, including practical production notes, tutorials, and browser game insights.
        </p>
      </div>

      <AdZone label={`${category} Category Header`} size="leaderboard" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categoryPosts.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </main>
  );
}
