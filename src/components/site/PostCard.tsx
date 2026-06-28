import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Post } from "@/data/posts";
import { PostThumbnail } from "@/components/site/VisualThumb";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-uniblex-purple/50 hover:shadow-[0_24px_70px_rgba(122,60,255,.14)]">
      <div className="relative aspect-[16/9] overflow-hidden">
        <PostThumbnail post={post} />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/90 via-transparent to-transparent" />
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-uniblex-gray">
          <span className="text-uniblex-blue">{post.category}</span>
          <span>|</span>
          <span>{post.readingTime}</span>
        </div>
        <h3 className="mb-3 font-heading text-xl leading-tight">{post.title}</h3>
        <p className="mb-5 text-sm leading-6 text-uniblex-gray">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2 font-bold text-uniblex-blue transition hover:text-uniblex-purple">
          Read Article <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
