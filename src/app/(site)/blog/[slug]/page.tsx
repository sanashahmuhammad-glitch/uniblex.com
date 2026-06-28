import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPost, getRelatedPosts, posts } from "@/data/posts";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | Uniblex`,
      description: post.excerpt,
      images: [{ url: post.image }]
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) return notFound();

  const relatedPosts = getRelatedPosts(post);

  return (
    <main className="container-pad py-12 md:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        image: post.image,
        author: { "@type": "Person", name: "Mohsin Shah" },
        publisher: { "@type": "Organization", name: "Uniblex" }
      }} />

      <article className="mx-auto max-w-4xl">
        <p className="text-uniblex-blue">{post.category} | {post.readingTime}</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-uniblex-gray">{post.excerpt}</p>
        <div className="relative my-10 aspect-[16/9] overflow-hidden rounded-lg border border-uniblex-border">
          <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        </div>

        <div className="prose prose-invert max-w-none prose-headings:font-heading prose-h2:text-3xl prose-p:text-uniblex-gray prose-p:leading-8">
          <h2>Overview</h2>
          {post.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <AdZone label="In Content" size="in-content" />
          <h2>Uniblex Publishing Notes</h2>
          <p>
            This article is part of the Uniblex content system: original writing, clear headings, readable paragraphs, featured imagery, schema markup, and internal links. The goal is to give players and creators useful information while keeping every page ready for search indexing and future monetization.
          </p>
          <h2>Action Checklist</h2>
          <ul>
            <li>Keep the page title specific and human-readable.</li>
            <li>Add original examples, screenshots, or production notes before launch.</li>
            <li>Review mobile spacing, image loading, and internal links after publishing.</li>
          </ul>
        </div>
      </article>

      <section className="mx-auto mt-14 max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-bold text-uniblex-blue">Related Articles</p>
            <h2 className="font-heading text-3xl">More from {post.category}</h2>
          </div>
          <Link href="/blog" className="hidden items-center gap-2 font-bold text-uniblex-blue sm:inline-flex">
            All Articles <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {relatedPosts.map((related) => (
            <Link key={related.slug} href={`/blog/${related.slug}`} className="rounded-lg border border-uniblex-border bg-white/[.03] p-5 transition hover:border-uniblex-blue/60">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-uniblex-blue">{related.category}</p>
              <h3 className="mt-3 font-heading text-lg leading-tight">{related.title}</h3>
              <p className="mt-3 text-sm leading-6 text-uniblex-gray">{related.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
