import Image from "next/image";
import Link from "next/link";
import { BookOpenText, Code2, Gamepad2, Rocket, ShieldCheck, Smartphone, TrendingUp, Users, Zap } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GameCard } from "@/components/site/GameCard";
import { PostCard } from "@/components/site/PostCard";
import { games } from "@/data/games";
import { posts } from "@/data/posts";
import { JsonLd } from "@/components/seo/JsonLd";

const stats = [
  { icon: Gamepad2, value: "50+", label: "Web Games" },
  { icon: BookOpenText, value: "100+", label: "Articles" },
  { icon: Users, value: "1K+", label: "Creators" },
  { icon: Zap, value: "Instant", label: "Play Now" }
];

const improvements = [
  { icon: ShieldCheck, title: "SEO Ready", text: "Meta tags, OG and structured data" },
  { icon: Smartphone, title: "Mobile Friendly", text: "Optimized for all screen sizes" },
  { icon: Rocket, title: "Fast & Lightweight", text: "Built for better performance" },
  { icon: Code2, title: "Developer Friendly", text: "Clean and scalable code" }
];

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

      <section className="relative overflow-hidden border-b border-uniblex-border/50">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="container-pad relative grid min-h-[calc(100vh-86px)] items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.08fr_.92fr]">
          <div className="text-center lg:text-left">
            <p className="mb-4 text-sm font-black uppercase tracking-[.35em] text-uniblex-blue">Create • Play • Inspire</p>
            <h1 className="mx-auto mb-6 max-w-4xl font-heading text-4xl leading-[1.05] sm:text-5xl md:text-6xl lg:mx-0 lg:text-7xl">
              Browser Games & <span className="gradient-text">Game Dev Content</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-8 text-uniblex-gray sm:text-lg lg:mx-0">
              Discover WebGL games, game development articles, 3D art tutorials, and creator-focused content. Play instantly, no installs.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/games" className="btn-primary"><Gamepad2 size={19} /> Explore Games</Link>
              <Link href="/blog" className="btn-secondary"><BookOpenText size={19} /> Read Articles</Link>
            </div>

            <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-3xl border border-uniblex-border bg-white/[.02] backdrop-blur sm:grid-cols-4 lg:max-w-2xl">
              {stats.map((item, index) => (
                <div key={item.label} className={`flex items-center gap-3 p-4 sm:p-5 ${index !== 0 ? "sm:border-l sm:border-uniblex-border" : ""} ${index > 1 ? "border-t border-uniblex-border sm:border-t-0" : ""}`}>
                  <item.icon className="shrink-0 text-uniblex-blue" size={28} />
                  <div>
                    <div className="text-xl font-black text-white sm:text-2xl">{item.value}</div>
                    <div className="text-xs text-uniblex-gray sm:text-sm">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px] lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-uniblex-blue/20 to-uniblex-purple/20 blur-3xl" />
            <div className="card relative p-3 sm:p-4">
              <Image src="/brand/gaming.png" alt="Uniblex gaming showcase" width={720} height={540} priority className="rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-pad py-8">
        <AdZone label="Header Leaderboard" size="leaderboard" />
      </section>

      <section className="container-pad py-14 md:py-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-bold text-uniblex-blue">Featured Games</p>
            <h2 className="section-title">Play in Browser</h2>
          </div>
          <Link href="/games" className="font-bold text-uniblex-blue">View All →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {games.map((game) => <GameCard key={game.slug} game={game} />)}
        </div>
      </section>

      <section className="container-pad py-14 md:py-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-bold text-uniblex-blue">Latest Articles</p>
            <h2 className="section-title">Game Dev Insights</h2>
          </div>
          <Link href="/blog" className="font-bold text-uniblex-blue">View Blog →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      </section>

      <section className="container-pad pb-16">
        <div className="card grid gap-5 p-5 md:grid-cols-4 md:p-6">
          {improvements.map((item) => (
            <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-uniblex-border/60 bg-white/[.02] p-4">
              <item.icon className="text-uniblex-blue" size={32} />
              <div>
                <h3 className="font-heading text-lg">{item.title}</h3>
                <p className="text-sm text-uniblex-gray">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
