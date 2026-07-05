import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, Gamepad2, Settings2, Star, Trophy, Users } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { GamePlayer } from "@/components/site/GamePlayer";
import { JsonLd } from "@/components/seo/JsonLd";
import { GameThumbnail } from "@/components/site/VisualThumb";
import { games } from "@/data/games";
import { getPublishedGame } from "@/lib/publicGames";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return games.filter((game) => game.status === "Published").map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const game = await getPublishedGame(params.slug);
  if (!game) return {};

  return {
    title: game.title,
    description: game.description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      title: `${game.title} | Uniblex`,
      description: game.description,
      images: [{ url: game.cover }]
    }
  };
}

export default async function GameDetailPage({ params }: { params: { slug: string } }) {
  const game = await getPublishedGame(params.slug);
  if (!game) return notFound();

  return (
    <main className="container-pad py-12 md:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "GameApplication",
        name: game.title,
        applicationCategory: "Game",
        genre: game.genre,
        description: game.description,
        operatingSystem: "Web browser",
        url: `https://uniblex.com/games/${game.slug}`
      }} />

      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p className="text-uniblex-blue">{game.genre} | {game.status}</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">{game.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-uniblex-gray">{game.description}</p>
          <div className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Star, label: "Rating", value: game.rating },
              { icon: Trophy, label: "Difficulty", value: game.difficulty },
              { icon: Clock3, label: "Session", value: game.sessionLength },
              { icon: Users, label: "Players", value: game.players }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-uniblex-border bg-white/[.03] p-3">
                <div className="flex items-center gap-2 text-xs text-uniblex-gray">
                  <item.icon size={14} className="text-uniblex-blue" /> {item.label}
                </div>
                <div className="mt-1 font-heading text-lg">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {game.tags.map((tag) => <span key={tag} className="rounded-full border border-uniblex-border px-4 py-2 text-sm text-uniblex-gray">{tag}</span>)}
          </div>
        </div>
        <div
          className="relative aspect-[16/10] overflow-hidden rounded-lg border border-uniblex-border bg-white/[.03]"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
          }}
        >
          <GameThumbnail game={game} />
        </div>
      </div>

      <div className="mt-10">
        <GamePlayer title={game.title} iframeUrl={game.iframeUrl} />
      </div>

      <div className="my-10">
        <AdZone label="Below Game Player" size="game-bottom" />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
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
              <h2 className="font-heading text-2xl">Controls</h2>
            </div>
            <ul className="grid gap-3 text-sm text-uniblex-gray">
              {game.controls.map((control) => <li key={control} className="rounded-lg border border-uniblex-border bg-white/[.025] px-4 py-3">{control}</li>)}
            </ul>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 className="text-uniblex-purple" />
              <h2 className="font-heading text-2xl">Technical Notes</h2>
            </div>
            <ul className="grid gap-3 text-sm text-uniblex-gray">
              {game.technicalNotes.map((note) => <li key={note} className="leading-6">{note}</li>)}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
