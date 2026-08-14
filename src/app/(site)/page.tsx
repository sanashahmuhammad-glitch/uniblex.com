import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Gamepad2,
  Play,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { PostCard } from "@/components/site/PostCard";
import { GameThumbnail } from "@/components/site/VisualThumb";
import { games, type Game } from "@/data/games";
import { posts } from "@/data/posts";
import { AuthAwareDeveloperLink } from "@/components/developers/AuthAwareDeveloperLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalUrl, defaultAuthors, defaultRobots, homePageJsonLd, pageKeywords, siteConfig } from "@/lib/seo";

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

const categories = [
  { label: "Action", genre: "Action Arena" },
  { label: "Racing", genre: "Racing" },
  { label: "Arcade", genre: "Arcade Runner" },
  { label: "Puzzle", genre: "Puzzle" },
  { label: "Strategy", genre: "Strategy" },
  { label: "Casual", genre: "Casual Sim" },
];

export default function HomePage() {
  const heroGame = games[0];
  const gameShelf = games.slice(0, 8);
  const latestPosts = posts.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#080b12]">
      <JsonLd data={homePageJsonLd()} />

      <section className="border-b border-white/[.07] bg-[#0b0f18]">
        <div className="container-pad flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/games"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-black text-[#080b12] transition hover:bg-uniblex-blue"
          >
            <Sparkles size={14} /> Discover
          </Link>
          {categories.map((category) => (
            <Link
              key={category.genre}
              href={`/games?genre=${encodeURIComponent(category.genre)}`}
              className="shrink-0 rounded-lg border border-white/[.08] bg-white/[.035] px-4 py-2 text-xs font-bold text-[#b8c0cf] transition hover:border-white/20 hover:bg-white/[.07] hover:text-white"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/[.07]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(94,53,255,.18),transparent_34%),radial-gradient(circle_at_16%_8%,rgba(0,178,255,.10),transparent_30%)]" />
        <div className="container-pad relative grid items-center gap-8 py-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-12 lg:py-14">
          <div className="max-w-[560px]">
            <p className="mb-4 text-xs font-black uppercase tracking-[.22em] text-uniblex-blue">Premium browser gaming</p>
            <h1 className="font-heading text-4xl font-black leading-[1.02] tracking-[-.045em] text-white sm:text-5xl lg:text-[52px]">
              Play great games.<br />Instantly.
            </h1>
            <p className="mt-5 max-w-[520px] text-base leading-7 text-[#aab3c2] sm:text-lg">
              Jump into hand-picked browser games built for quick sessions, smooth play, and no installs.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/games" className="btn-primary">
                <Play size={18} fill="currentColor" /> Browse Games
              </Link>
              <Link href="/games" className="btn-secondary">
                <Search size={18} /> Find a Game
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#8791a3]">
              <span>{games.length} games</span>
              <span>No downloads</span>
              <span>Desktop &amp; mobile</span>
            </div>
          </div>

          {heroGame ? <FeaturedGame game={heroGame} /> : null}
        </div>
      </section>

      <section className="container-pad py-10 md:py-14">
        <SectionHeading
          eyebrow="Play now"
          title="Featured games"
          copy="Jump straight in or browse the full library."
          href="/games"
          linkLabel="View all games"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gameShelf.map((game, index) => (
            <HomeGameTile key={game.slug} game={game} badge={index === 0 ? "Top pick" : index < 3 ? "Popular" : undefined} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-[#0b0f18]">
        <div className="container-pad py-10 md:py-14">
          <SectionHeading
            eyebrow="From the studio"
            title="Level up your game knowledge"
            copy="Practical WebGL, art, and game development reads."
            href="/blog"
            linkLabel="View all articles"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => <PostCard key={post.slug} post={post} />)}
          </div>
        </div>
      </section>

      <section className="container-pad py-10 md:py-14">
        <div className="flex flex-col gap-6 rounded-2xl border border-white/[.08] bg-[linear-gradient(120deg,rgba(0,178,255,.10),rgba(255,255,255,.035)_48%,rgba(122,60,255,.12))] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[.2em] text-uniblex-blue">For game creators</p>
            <h2 className="mt-2 font-heading text-2xl font-black tracking-[-.025em] text-white md:text-3xl">Bring your browser game to Uniblex.</h2>
            <p className="mt-2 text-sm leading-6 text-[#9aa4b5]">Submit your WebGL build and reach players through a focused, game-first experience.</p>
          </div>
          <AuthAwareDeveloperLink guestHref="/developers/register" authenticatedHref="/developers/games/new" className="btn-secondary shrink-0">
            <Gamepad2 size={18} /> Publish Your Game
          </AuthAwareDeveloperLink>
        </div>
      </section>
    </main>
  );
}

function FeaturedGame({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,.42)] outline-none transition hover:-translate-y-1 hover:border-uniblex-blue/45 focus-visible:ring-2 focus-visible:ring-uniblex-blue"
      aria-label={`Play featured game ${game.title}`}
    >
      <div className="absolute inset-0 [&>div>div]:hidden">
        <GameThumbnail game={game} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-black/10 to-transparent" />
      <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white backdrop-blur">
        Featured game
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.16em] text-uniblex-blue">{game.genre}</p>
          <h2 className="mt-1 truncate font-heading text-2xl font-black tracking-[-.03em] text-white sm:text-3xl">{game.title}</h2>
          <div className="mt-2 flex items-center gap-4 text-xs font-bold text-white/70">
            <span className="inline-flex items-center gap-1.5"><Star size={13} fill="currentColor" className="text-amber-300" /> {game.rating}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {game.sessionLength}</span>
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#080b12] shadow-lg transition group-hover:scale-105 group-hover:bg-uniblex-blue">
          <Play size={18} fill="currentColor" />
        </span>
      </div>
    </Link>
  );
}

function HomeGameTile({ game, badge }: { game: Game; badge?: string }) {
  return (
    <article className="group min-w-0">
      <Link
        href={`/games/${game.slug}`}
        className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-white/[.08] bg-[#111722] outline-none transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/45 hover:shadow-[0_18px_45px_rgba(0,0,0,.35)] focus-visible:ring-2 focus-visible:ring-uniblex-blue [&>div>div]:hidden"
        aria-label={`Play ${game.title}`}
      >
        <GameThumbnail game={game} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
        {badge ? (
          <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#090d15]">{badge}</span>
        ) : null}
        <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white text-[#080b12] opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
          <Play size={14} fill="currentColor" />
        </span>
      </Link>
      <div className="px-1 pb-1 pt-3">
        <Link href={`/games/${game.slug}`} className="line-clamp-1 text-base font-black text-white transition hover:text-uniblex-blue">{game.title}</Link>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#7f899b]">
          <span className="truncate">{game.genre}</span>
          <span className="inline-flex shrink-0 items-center gap-1"><Star size={12} fill="currentColor" className="text-amber-300" /> {game.rating}</span>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, copy, href, linkLabel }: { eyebrow: string; title: string; copy: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[.2em] text-uniblex-blue">{eyebrow}</p>
        <h2 className="mt-1 font-heading text-2xl font-black tracking-[-.03em] text-white sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-[#8f99aa]">{copy}</p>
      </div>
      <Link href={href} className="inline-flex items-center gap-2 text-sm font-black text-white transition hover:text-uniblex-blue">
        {linkLabel} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
