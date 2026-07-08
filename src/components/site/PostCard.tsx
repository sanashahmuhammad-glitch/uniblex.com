import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Post } from "@/data/posts";
import { PostThumbnail } from "@/components/site/VisualThumb";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[.065] via-uniblex-card/75 to-black/25 shadow-[0_18px_70px_rgba(0,0,0,.22)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-uniblex-purple/50 hover:shadow-[0_24px_80px_rgba(122,60,255,.16)]">
      <div className="relative aspect-[16/9] overflow-hidden">
        <PostThumbnail post={post} />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/90 via-transparent to-transparent" />
      </div>
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-uniblex-gray">
          <span className="rounded-full border border-uniblex-blue/25 bg-uniblex-blue/10 px-3 py-1 text-uniblex-blue">{post.category}</span>
          <span>{post.readingTime}</span>
        </div>
        <h3 className="mb-3 font-heading text-xl leading-tight">{post.title}</h3>
        <p className="mb-5 line-clamp-3 text-sm leading-6 text-uniblex-gray">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-white/10 bg-white/[.035] px-4 py-2 text-sm font-black text-uniblex-blue transition hover:border-uniblex-blue/45 hover:bg-uniblex-blue/10 hover:text-white">
          Read Article <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
