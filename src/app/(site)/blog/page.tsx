import type { Metadata } from "next";
import { PostCard } from "@/components/site/PostCard";
import { AdZone } from "@/components/site/AdZone";
import { posts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Blog & Game Dev Articles",
  description: "Read Uniblex game development, 3D art, tutorials and industry news articles."
};

export default function BlogPage() {
  return (
    <main className="container-pad py-14">
      <div className="mb-10 max-w-3xl">
        <p className="text-uniblex-blue">Articles</p>
        <h1 className="font-heading text-5xl">Blog & Tutorials</h1>
        <p className="mt-4 text-lg leading-8 text-uniblex-gray">
          Original content for game developers, 3D artists, creators and browser gaming fans.
        </p>
      </div>
      <AdZone label="Blog Header" size="leaderboard" />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </main>
  );
}
