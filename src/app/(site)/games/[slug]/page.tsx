import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, Gamepad2, Monitor, MousePointer2, Smartphone, Star, Trophy, Users } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GamePlayer } from "@/components/site/GamePlayer";
import { GameCard } from "@/components/site/GameCard";
import { GameEngagement } from "@/components/site/GameEngagement";
import { JsonLd } from "@/components/seo/JsonLd";
import { GameThumbnail } from "@/components/site/VisualThumb";
import { games } from "@/data/games";
import { getPublishedGame, getPublishedGames } from "@/lib/publicGames";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return games.filter((game) => game.status === "Published").map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const game = await getPublishedGame(params.slug);
  if (!game) return {};

  const title = `${game.title} - Play Free WebGL Game | Uniblex`;
  const url = `/games/${game.slug}`;

  return {
    title,
    description: game.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: game.description,
      url,
      type: "website",
      images: [{ url: game.cover, alt: `${game.title} cover` }]
    },
    twitter: {
      card: "summary_large_image",
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uniblex.com";
  const gameUrl = `${siteUrl}/games/${game.slug}`;

  return (
    <main className="container-pad py-10 md:py-14">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.title,
        genre: game.genre,
        description: game.description,
        image: game.cover,
        url: gameUrl,
        applicationCategory: "Game",
        operatingSystem: "Web browser",
        playMode: game.players,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: game.rating,
          ratingCount: Math.max(12, Number(game.playCount ?? 0) || 12)
        }
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Games", item: `${siteUrl}/games` },
          { "@type": "ListItem", position: 3, name: game.title, item: gameUrl }
        ]
      }} />

      <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-uniblex-blue/30 bg-uniblex-blue/10 px-4 py-2 text-sm font-bold text-uniblex-blue">{game.genre}</span>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">{game.status}</span>
          </div>
          <h1 className="mt-5 font-heading text-4xl leading-tight md:text-6xl">{game.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-uniblex-gray">{game.description}</p>
          <div className="mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Star, label: "Rating", value: game.rating },
              { icon: Trophy, label: "Difficulty", value: game.difficulty },
              { icon: Clock3, label: "Session", value: game.sessionLength },
              { icon: Users, label: "Players", value: game.players }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-uniblex-border bg-white/[.03] p-4">
                <div className="flex items-center gap-2 text-xs text-uniblex-gray">
                  <item.icon size={14} className="text-uniblex-blue" /> {item.label}
                </div>
                <div className="mt-2 font-heading text-lg">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {game.tags.map((tag) => <span key={tag} className="rounded-full border border-uniblex-border px-4 py-2 text-sm text-uniblex-gray">{tag}</span>)}
          </div>
        </div>
        <div
          className="relative aspect-[16/11] overflow-hidden rounded-lg border border-uniblex-border bg-white/[.03] shadow-[0_24px_80px_rgba(122,60,255,.16)]"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
          }}
        >
          <GameThumbnail game={game} />
        </div>
      </section>

      <section className="mt-10">
        <GamePlayer title={game.title} slug={game.slug} cover={game.cover} iframeUrl={game.iframeUrl} />
      </section>

      <div className="my-10">
        <AdZone label="Below Game Player" size="game-bottom" />
      </div>

      <GameEngagement game={game} games={publishedGames} />

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card p-6 md:p-8">
          <h2 className="mb-4 font-heading text-3xl">About This Game</h2>
          <p className="leading-8 text-uniblex-gray">{game.playStyle}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {game.highlights.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-uniblex-border bg-white/[.025] p-4">
                <CheckCircle2 className="mt-1 shrink-0 text-uniblex-blue" size={20} />
                <p className="text-sm leading-6 text-uniblex-gray">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Gamepad2 className="text-uniblex-blue" />
              <h2 className="font-heading text-2xl">How to Play</h2>
            </div>
            <p className="leading-7 text-uniblex-gray">{getHowToPlay(game.genre)}</p>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Monitor className="text-uniblex-purple" />
              <h2 className="font-heading text-2xl">Controls</h2>
            </div>
            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><MousePointer2 size={16} /> Desktop</div>
                <ul className="grid gap-2 text-sm text-uniblex-gray">
                  <li>WASD / Arrow Keys = Move</li>
                  <li>Space = Brake / Action</li>
                  <li>Mouse = Select</li>
                </ul>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Smartphone size={16} /> Mobile</div>
                <p className="text-sm leading-6 text-uniblex-gray">Rotate your device and use on-screen controls if available.</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-3xl">Related Games</h2>
        {relatedGames.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGames.map((related) => <GameCard key={related.slug} game={related} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-6 text-uniblex-gray">
            More related games will appear here as the library grows.
          </div>
        )}
      </section>
    </main>
  );
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
