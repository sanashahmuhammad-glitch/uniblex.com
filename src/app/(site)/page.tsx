import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenText, Gauge, Gamepad2, LayoutDashboard, Play, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GameCard } from "@/components/site/GameCard";
import { PostCard } from "@/components/site/PostCard";
import { games } from "@/data/games";
import { posts } from "@/data/posts";
import { AuthorizedAdminLink } from "@/components/admin/AuthorizedAdminLink";
import { canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Uniblex - Play Free WebGL Games & Read Game Dev Articles",
  description: siteConfig.description,
  keywords: pageKeywords("play WebGL games", "browser gaming platform", "game dev articles"),
  authors: defaultAuthors,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "Uniblex - Play Free WebGL Games & Read Game Dev Articles",
    description: siteConfig.description,
    url: canonicalUrl("/"),
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Uniblex browser games and creator content" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    title: "Uniblex - Play Free WebGL Games & Read Game Dev Articles",
    description: siteConfig.description,
    images: [siteConfig.ogImage]
  }
};

const stats = [
  { value: `${games.length}+`, label: "Game pages" },
  { value: `${posts.length}+`, label: "Original articles" },
  { value: "4", label: "Ad zones" },
  { value: "80+", label: "Lighthouse target" }
];

const platform = [
  { icon: Gamepad2, title: "WebGL Showcase", text: "Dedicated game pages with controls, tags, schema, and lazy loaded iframe players." },
  { icon: BookOpenText, title: "Content Engine", text: "Original articles for game dev, 3D art, tutorials, and industry topics." },
  { icon: Search, title: "SEO Foundation", text: "Dynamic metadata, sitemap, robots.txt, Open Graph, canonical URLs, and JSON-LD." },
  { icon: LayoutDashboard, title: "Admin CMS", text: "Supabase-backed management for games, blogs, categories, ads, contacts, and SEO." }
];

export default function HomePage() {
  const featuredGames = games.slice(0, 3);
  const latestPosts = posts.slice(0, 3);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-uniblex-border/50">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="container-pad relative grid min-h-[calc(100svh-64px)] items-center gap-10 py-10 md:min-h-[calc(100vh-86px)] md:py-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-[670px] text-center lg:text-left">
            <p className="mb-4 text-sm font-black uppercase tracking-[.32em] text-uniblex-blue">Create | Play | Inspire</p>
            <h1 className="mx-auto mb-6 max-w-[680px] font-heading text-4xl leading-[1.05] sm:text-5xl md:text-6xl lg:mx-0 lg:text-7xl">
              Uniblex <span className="gradient-text">Browser Games</span> & Game Dev Content
            </h1>
            <p className="mx-auto mb-8 max-w-[620px] text-base leading-8 text-uniblex-gray sm:text-lg lg:mx-0">
              Built by Mohsin Shah for players, 3D artists, and game creators. Play WebGL games instantly, read practical production articles, and explore a platform designed for AdSense-ready growth.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/games" className="btn-primary"><Play size={19} /> Play Games</Link>
              <Link href="/blog" className="btn-secondary"><BookOpenText size={19} /> Read Articles</Link>
            </div>

            <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-lg border border-uniblex-border bg-white/[.02] backdrop-blur sm:grid-cols-4 lg:max-w-[650px]">
              {stats.map((item, index) => (
                <div key={item.label} className={`p-4 sm:p-5 ${index !== 0 ? "sm:border-l sm:border-uniblex-border" : ""} ${index > 1 ? "border-t border-uniblex-border sm:border-t-0" : ""}`}>
                  <div className="font-heading text-2xl text-white sm:text-3xl">{item.value}</div>
                  <div className="mt-1 text-xs text-uniblex-gray sm:text-sm">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-uniblex-blue/20 via-uniblex-purple/20 to-uniblex-pink/20 blur-3xl" />
            <div className="card relative overflow-hidden p-3">
              <Image src="/og-image.png" alt="Uniblex browser games and creator content" width={1200} height={630} priority className="rounded-lg" />
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {[ShieldCheck, Gauge, Zap].map((Icon, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border border-uniblex-border bg-white/[.03] px-3 py-2 text-xs font-bold text-uniblex-gray">
                    <Icon className="text-uniblex-blue" size={16} />
                    {["Secure CMS", "Fast Pages", "Lazy Player"][index]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-pad py-8 md:py-10">
        <AdZone label="Header Leaderboard" size="leaderboard" />
      </section>

      <section className="container-pad py-12 md:py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-bold text-uniblex-blue">Featured Games</p>
            <h2 className="section-title">Play in Browser</h2>
          </div>
          <Link href="/games" className="inline-flex items-center gap-2 font-bold text-uniblex-blue">
            View All <ArrowRight size={17} />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGames.map((game) => <GameCard key={game.slug} game={game} />)}
        </div>
      </section>

      <section className="border-y border-uniblex-border/70 bg-uniblex-card/20 py-12 md:py-16">
        <div className="container-pad">
          <div className="mb-8 max-w-3xl">
            <p className="font-bold text-uniblex-blue">Platform System</p>
            <h2 className="section-title">Frontend, Backend, SEO, Monetization</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {platform.map((item) => (
              <div key={item.title} className="rounded-lg border border-uniblex-border bg-white/[.025] p-5">
                <item.icon className="mb-4 text-uniblex-blue" size={30} />
                <h3 className="font-heading text-lg">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-uniblex-gray">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-pad py-12 md:py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-bold text-uniblex-blue">Latest Articles</p>
            <h2 className="section-title">Game Dev Insights</h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-2 font-bold text-uniblex-blue">
            View Blog <ArrowRight size={17} />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestPosts.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      </section>

      <section className="container-pad pb-12 md:pb-16">
        <div className="rounded-lg border border-uniblex-border bg-gradient-to-r from-uniblex-blue/10 via-white/[.03] to-uniblex-purple/10 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">
                <Sparkles size={16} /> Launch Ready Direction
              </div>
              <h2 className="font-heading text-3xl">Original content, admin controls, and performance-first game pages.</h2>
            </div>
            <AuthorizedAdminLink variant="cta" />
          </div>
        </div>
      </section>
    </main>
  );
}
