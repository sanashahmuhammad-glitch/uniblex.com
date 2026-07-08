import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Gauge, Gamepad2, LayoutDashboard, Play, Search, ShieldCheck, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GameCard } from "@/components/site/GameCard";
import { PostCard } from "@/components/site/PostCard";
import { GameThumbnail } from "@/components/site/VisualThumb";
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
  const heroGame = featuredGames[0];
  const latestPosts = posts.slice(0, 3);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-uniblex-border/50 bg-[#070b13]">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,178,255,.22),transparent_32%),radial-gradient(circle_at_76%_16%,rgba(122,60,255,.24),transparent_30%),linear-gradient(180deg,rgba(13,17,24,.2),rgba(5,7,11,.96))]" />
        <div className="container-pad relative grid min-h-[calc(100svh-56px)] items-center gap-8 py-8 md:min-h-[calc(100vh-82px)] md:py-12 lg:grid-cols-[.95fr_1.05fr]">
          <div className="max-w-[680px] text-center lg:text-left">
            <p className="mb-4 text-xs font-black uppercase tracking-[.32em] text-uniblex-blue sm:text-sm">Play | Compete | Discover</p>
            <h1 className="mx-auto mb-5 max-w-[720px] font-heading text-4xl leading-[1.03] sm:text-5xl md:text-6xl lg:mx-0 lg:text-7xl">
              A Premium <span className="gradient-text">Browser Gaming</span> Platform
            </h1>
            <p className="mx-auto mb-7 max-w-[620px] text-base leading-7 text-uniblex-gray sm:text-lg sm:leading-8 lg:mx-0">
              Jump into WebGL games with console-style pages, polished cards, and creator content wrapped in a dark gaming interface.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/games" className="btn-primary"><Play size={19} /> Play Games</Link>
              <Link href="/blog" className="btn-secondary"><BookOpenText size={19} /> Read Articles</Link>
            </div>

            <div className="mt-7 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/[.045] shadow-[0_18px_70px_rgba(0,0,0,.24)] backdrop-blur sm:grid-cols-4 lg:max-w-[650px]">
              {stats.map((item, index) => (
                <div key={item.label} className={`p-4 sm:p-5 ${index !== 0 ? "sm:border-l sm:border-white/10" : ""} ${index > 1 ? "border-t border-white/10 sm:border-t-0" : ""}`}>
                  <div className="font-heading text-2xl text-white sm:text-3xl">{item.value}</div>
                  <div className="mt-1 text-xs text-uniblex-gray sm:text-sm">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {heroGame ? (
            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-uniblex-blue/25 via-uniblex-purple/25 to-uniblex-pink/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-uniblex-blue/25 bg-[#04070d] p-1 shadow-[0_34px_120px_rgba(0,178,255,.18)]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[.055] px-4 py-3">
                    <div>
                      <p className="font-heading text-xl">{heroGame.title}</p>
                      <p className="text-xs font-bold uppercase tracking-[.18em] text-uniblex-blue">Featured WebGL Game</p>
                    </div>
                    <Link href={`/games/${heroGame.slug}`} className="rounded-md bg-uniblex-blue px-4 py-2 text-xs font-black text-white transition hover:bg-uniblex-purple">Play</Link>
                  </div>
                  <Link href={`/games/${heroGame.slug}`} className="group relative block aspect-[16/10] overflow-hidden">
                    <GameThumbnail game={heroGame} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: Star, text: heroGame.rating },
                        { icon: Trophy, text: heroGame.difficulty },
                        { icon: Gamepad2, text: heroGame.players }
                      ].map((item) => (
                        <span key={item.text} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-black text-white backdrop-blur">
                          <item.icon size={15} className="text-uniblex-blue" /> {item.text}
                        </span>
                      ))}
                    </div>
                  </Link>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  {[ShieldCheck, Gauge, Zap].map((Icon, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-uniblex-gray">
                      <Icon className="text-uniblex-blue" size={16} />
                      {["Secure CMS", "Fast Pages", "Game Frame"][index]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
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
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {featuredGames.map((game) => <GameCard key={game.slug} game={game} />)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-gradient-to-r from-white/[.035] via-uniblex-card/25 to-white/[.025] py-12 md:py-16">
        <div className="container-pad">
          <div className="mb-8 max-w-3xl">
            <p className="font-bold text-uniblex-blue">Platform System</p>
            <h2 className="section-title">Frontend, Backend, SEO, Monetization</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {platform.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.18)]">
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
