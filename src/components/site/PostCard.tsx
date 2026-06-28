import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/data/posts";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[16/9]">
        <Image src={post.image} alt={post.title} fill className="object-cover" />
      </div>
      <div className="p-6">
        <div className="mb-3 flex items-center gap-3 text-xs text-uniblex-gray">
          <span>{post.category}</span>
          <span>•</span>
          <span>{post.readingTime}</span>
        </div>
        <h3 className="mb-3 font-heading text-xl">{post.title}</h3>
        <p className="mb-5 text-sm leading-6 text-uniblex-gray">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="font-semibold text-uniblex-blue">Read Article →</Link>
      </div>
    </article>
  );
}
