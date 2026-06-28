import Image from "next/image";
import Link from "next/link";
import { AdZone } from "@/components/site/AdZone";
import { GameCard } from "@/components/site/GameCard";
import { PostCard } from "@/components/site/PostCard";
import { games } from "@/data/games";
import { posts } from "@/data/posts";
import { JsonLd } from "@/components/seo/JsonLd";

export default function HomePage() {
  return (
    <main>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Uniblex",
        url: "https://uniblex.com",
        description: "Discover WebGL browser games, tutorials, and game dev articles."
      }} />

      <section className="container-pad grid min-h-[72vh] items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[.3em] text-uniblex-blue">Create • Play • Inspire</p>
          <h1 className="mb-6 font-heading text-5xl leading-tight md:text-7xl">
            Browser Games & <span className="gradient-text">Game Dev Content</span>
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-8 text-uniblex-gray">
            Discover WebGL games, game development articles, 3D art tutorials, and creator-focused content. Play instantly, no installs.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/games" className="btn-primary">Explore Games</Link>
            <Link href="/blog" className="btn-secondary">Read Articles</Link>
          </div>
        </div>
        <div className="relative">
          <div className="card p-4">
            <Image src="/brand/gaming.png" alt="Uniblex gaming showcase" width={720} height={540} priority className="rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="container-pad py-4">
        <AdZone label="Header Leaderboard" size="leaderboard" />
      </section>

      <section className="container-pad py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-uniblex-blue">Featured Games</p>
            <h2 className="font-heading text-4xl">Play in Browser</h2>
          </div>
          <Link href="/games" className="text-uniblex-blue">View All →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {games.map((game) => <GameCard key={game.slug} game={game} />)}
        </div>
      </section>

      <section className="container-pad py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-uniblex-blue">Latest Articles</p>
            <h2 className="font-heading text-4xl">Game Dev Insights</h2>
          </div>
          <Link href="/blog" className="text-uniblex-blue">View Blog →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      </section>
    </main>
  );
}
