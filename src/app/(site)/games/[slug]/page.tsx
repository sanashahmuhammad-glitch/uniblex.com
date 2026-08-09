import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Compass, Gamepad2, Monitor, MousePointer2, Smartphone, Trophy, UserRound, Users } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GamePlayer } from "@/components/site/GamePlayer";
import { MotoRiderPlayer } from "@/components/site/MotoRiderPlayer";
import { GameCard } from "@/components/site/GameCard";
import { GameEngagement } from "@/components/site/GameEngagement";
import { JsonLd } from "@/components/seo/JsonLd";
import { GameThumbnail } from "@/components/site/VisualThumb";
import { games } from "@/data/games";
import { getPublishedGame, getPublishedGames } from "@/lib/publicGames";
import { MOTO_RIDER_SLUG } from "@/lib/gameIframeUrls";
import { absoluteUrl, breadcrumbJsonLd, canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return games.filter((game) => game.status === "Published").map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const game = await getPublishedGame(params.slug);
  if (!game) return {};

  const title = `${game.title} - Play Free WebGL Game | Uniblex`;
  const url = canonicalUrl(`/games/${game.slug}`);

  return {
    title,
    description: game.description,
    keywords: pageKeywords(game.title, game.genre, ...game.tags),
    authors: defaultAuthors,
    robots: defaultRobots,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: game.description,
      url,
      siteName: siteConfig.name,
      type: "website",
      images: [{ url: game.cover, width: 1200, height: 630, alt: `${game.title} cover` }]
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
      title,
      description: game.description,
      images: [game.cover]
    }
  };
}

export default async function GameDetailPage({ params }: { params: { slug: string } }) {
  const [game, publishedGames] = await Promise.all([getPublishedGame(params.slug), getPublishedGames()]);
  if (!game) return notFound();

  const relatedGames = getRelatedGames(game, publishedGames);
  const siteUrl = siteConfig.url;
  const gameUrl = canonicalUrl(`/games/${game.slug}`);
  const isMotoRider = game.slug === MOTO_RIDER_SLUG;

  return (
    <main className="container-pad py-6 md:py-10">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "GameApplication",
        name: game.title,
        genre: game.genre,
        description: game.description,
        image: absoluteUrl(game.cover),
        url: gameUrl,
        author: { "@type": "Organization", name: siteConfig.name },
        publisher: { "@type": "Organization", name: siteConfig.name },
        applicationCategory: "GameApplication",
        operatingSystem: "Web browser",
        browserRequirements: "Requires a modern WebGL-enabled browser",
        playMode: game.players
      }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", url: siteUrl },
        { name: "Games", url: `${siteUrl}/games` },
        { name: game.title, url: gameUrl }
      ])} />

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.065] via-uniblex-card/65 to-black/30 p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] md:p-7 lg:grid lg:grid-cols-[1fr_320px] lg:items-center lg:gap-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(0,178,255,.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(122,60,255,.18),transparent_28%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-uniblex-blue/30 bg-uniblex-blue/10 px-3 py-1.5 text-xs font-bold text-uniblex-blue sm:text-sm">{game.genre}</span>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200 sm:text-sm">{game.status}</span>
          </div>
          <h1 className="mt-4 font-heading text-3xl leading-tight sm:text-4xl md:text-5xl">{game.title}</h1>
          <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-uniblex-gray md:text-base md:leading-7">{game.description}</p>
          <div className="mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { icon: Trophy, label: "Difficulty", value: game.difficulty },
              { icon: Clock3, label: "Session", value: game.sessionLength },
              { icon: Users, label: "Players", value: game.players },
              { icon: Gamepad2, label: "Platform", value: "WebGL" }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[.04] p-3">
                <div className="flex items-center gap-2 text-xs text-uniblex-gray">
                  <item.icon size={14} className="text-uniblex-blue" /> {item.label}
                </div>
                <div className="mt-2 truncate font-heading text-base sm:text-lg">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {game.tags.map((tag) => <span key={tag} className="rounded-full border border-uniblex-border px-3 py-1.5 text-xs font-bold text-uniblex-gray sm:text-sm">{tag}</span>)}
          </div>
        </div>
        <div
          className="relative mt-5 hidden aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-white/[.03] shadow-[0_24px_80px_rgba(122,60,255,.16)] sm:block lg:mt-0"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
          }}
        >
          <GameThumbnail game={game} />
        </div>
      </section>

      <section className="relative left-1/2 mt-5 grid w-screen max-w-[1600px] -translate-x-1/2 items-start gap-4 px-4 md:mt-8 md:px-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:px-8 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-4">
          {isMotoRider && game.iframeUrl ? (
            <MotoRiderPlayer title={game.title} slug={game.slug} iframeUrl={game.iframeUrl} desktopControls={game.desktopControls} mobileControls={game.mobileControls} />
          ) : (
            <GamePlayer title={game.title} slug={game.slug} cover={game.cover} thumbnail={game.thumbnailUrl} iframeUrl={game.iframeUrl} aspectRatio={game.aspectRatio} desktopControls={game.desktopControls} mobileControls={game.mobileControls} />
          )}
          <GameEngagement game={game} games={publishedGames} />
          <section className="grid gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.06] via-uniblex-card/75 to-black/30 p-5 shadow-[0_18px_70px_rgba(0,0,0,.18)] sm:grid-cols-2 xl:grid-cols-3" aria-label="Game information">
            <GameFact icon={UserRound} label="Developer" value={game.developerName || "Uniblex Creator"} />
            <GameFact icon={Trophy} label="Rating" value={`${game.rating} / 5`} />
            <GameFact icon={CalendarDays} label="Released" value={formatGameDate(game.publishedAt)} />
            <GameFact icon={CalendarDays} label="Last updated" value={formatGameDate(game.updatedAt)} />
            <GameFact icon={Gamepad2} label="Game engine" value={game.engine || "WebGL"} />
            <GameFact icon={Compass} label="Orientation" value={titleCase(game.orientation || "landscape")} />
          </section>
        </div>
        <aside className="grid gap-4 xl:sticky xl:top-32 xl:self-start">
          {isMotoRider ? <div className="hidden xl:block"><AdZone label="Advertisement" size="rectangle" /></div> : null}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/75 to-black/25 p-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,178,255,.16),transparent_34%)]" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[.22em] text-uniblex-blue">Now Playing</p>
              <h2 className="mt-2 font-heading text-2xl">{game.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-uniblex-gray">{game.description}</p>
              <div className="mt-5 grid gap-2">
                {[
                  { label: "Genre", value: game.genre },
                  { label: "Session", value: game.sessionLength },
                  { label: "Difficulty", value: game.difficulty },
                  { label: "Players", value: game.players }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm">
                    <span className="text-uniblex-gray">{item.label}</span>
                    <span className="font-black text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,.18)]">
            <p className="text-xs font-black uppercase tracking-[.22em] text-uniblex-blue">Quick Tips</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-uniblex-gray">
              <li>Press Play to load the WebGL build only when you are ready.</li>
              <li>Use fullscreen for the cleanest desktop play area.</li>
              <li>Rotate mobile devices for a wider game canvas.</li>
            </ul>
          </div>
        </aside>
      </section>

      <div className="my-6 md:my-10">
        <AdZone label={isMotoRider ? "Advertisement" : "Below Game Player"} size="game-bottom" />
      </div>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card p-6 md:p-8">
          <h2 className="mb-4 font-heading text-3xl">About This Game</h2>
          <p className="leading-8 text-uniblex-gray">{game.playStyle}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {game.highlights.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-uniblex-border bg-white/[.025] p-4">
                <CheckCircle2 className="mt-1 shrink-0 text-uniblex-blue" size={20} />
                <p className="text-sm leading-6 text-uniblex-gray">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <div className="card p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Gamepad2 className="text-uniblex-blue" />
              <h2 className="font-heading text-2xl">How to Play</h2>
            </div>
            <p className="leading-7 text-uniblex-gray">{getHowToPlay(game.genre)}</p>
          </div>

          <div className="card p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Monitor className="text-uniblex-purple" />
              <h2 className="font-heading text-2xl">Controls</h2>
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><MousePointer2 size={16} /> Desktop</div>
                <ul className="grid gap-2 text-sm text-uniblex-gray">
                  {(game.desktopControls ?? game.controls).map((control) => <li key={control}>{control}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Smartphone size={16} /> Mobile</div>
                <p className="text-sm leading-6 text-uniblex-gray">{(game.mobileControls ?? ["Rotate your device and use on-screen controls if available."]).join(" / ")}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {game.previewVideoUrl ? (
        <section className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-5 md:p-7" aria-labelledby="gameplay-preview-heading">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[.22em] text-uniblex-blue">See it in motion</p>
            <h2 id="gameplay-preview-heading" className="mt-2 font-heading text-3xl">Gameplay Video</h2>
          </div>
          <video controls preload="metadata" poster={game.cover} className="aspect-video w-full rounded-xl bg-black object-cover" src={game.previewVideoUrl}>
            Your browser does not support the gameplay preview video.
          </video>
        </section>
      ) : null}

      <section className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.055] via-uniblex-card/60 to-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,.2)] md:p-7">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-uniblex-blue">Keep Playing</p>
            <h2 className="mt-2 font-heading text-3xl md:text-4xl">Related Games</h2>
          </div>
          <p className="text-sm text-uniblex-gray">{relatedGames.length ? `${relatedGames.length} recommendations` : "More games coming soon"}</p>
        </div>
        {relatedGames.length ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {relatedGames.map((related) => <GameCard key={related.slug} game={related} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[.04] p-6 text-uniblex-gray">
            More related games will appear here as the library grows.
          </div>
        )}
      </section>
    </main>
  );
}

function GameFact({ icon: Icon, label, value }: { icon: typeof Gamepad2; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-uniblex-blue/10 text-uniblex-blue"><Icon size={18} /></span>
      <span className="min-w-0"><span className="block text-xs text-uniblex-gray">{label}</span><span className="mt-1 block truncate text-sm font-black text-white">{value}</span></span>
    </div>
  );
}

function formatGameDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getHowToPlay(genre: string) {
  if (/racing|bike|driving|car/i.test(genre)) {
    return "Use WASD or Arrow Keys to control the bike. Avoid obstacles, collect rewards, and complete the race.";
  }

  return "Press Play Now, wait for the WebGL game to load, then follow the on-screen goals. Use movement keys, mouse input, and action buttons shown by the game.";
}

function getRelatedGames(current: NonNullable<Awaited<ReturnType<typeof getPublishedGame>>>, games: Awaited<ReturnType<typeof getPublishedGames>>) {
  const currentTags = new Set(current.tags.map((tag) => tag.toLowerCase()));

  return games
    .filter((game) => game.slug !== current.slug)
    .map((game) => {
      const genreScore = game.genre === current.genre ? 3 : 0;
      const tagScore = game.tags.filter((tag) => currentTags.has(tag.toLowerCase())).length;
      return { game, score: genreScore + tagScore };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((item) => item.game);
}
