import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdZone } from "@/components/site/AdZone";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPost, posts } from "@/data/posts";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
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

  return (
    <main className="container-pad py-12 md:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        image: post.image,
        author: { "@type": "Person", name: "Mohsin Shah" }
      }} />
      <article className="mx-auto max-w-4xl">
        <p className="text-uniblex-blue">{post.category} • {post.readingTime}</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-uniblex-gray">{post.excerpt}</p>
        <div className="relative my-10 aspect-[16/9] overflow-hidden rounded-3xl border border-uniblex-border">
          <Image src={post.image} alt={post.title} fill className="object-cover" />
        </div>
        <AdZone label="In Content" size="in-content" />
        <div className="prose prose-invert mt-10 max-w-none prose-headings:font-heading prose-p:text-uniblex-gray prose-p:leading-8">
          {post.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <h2>Why This Matters</h2>
          <p>
            Uniblex can use original, useful and well-structured articles to build topical authority and support future AdSense readiness.
          </p>
        </div>
      </article>
    </main>
  );
}
