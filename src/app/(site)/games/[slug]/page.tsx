import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdZone } from "@/components/site/AdZone";
import { GamePlayer } from "@/components/site/GamePlayer";
import { JsonLd } from "@/components/seo/JsonLd";
import { games, getGame } from "@/data/games";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};
  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: `${game.title} | Uniblex`,
      description: game.description,
      images: [{ url: game.cover }]
    }
  };
}

export default function GameDetailPage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) return notFound();

  return (
    <main className="container-pad py-14">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "GameApplication",
        name: game.title,
        applicationCategory: "Game",
        genre: game.genre,
        description: game.description,
        operatingSystem: "Web browser"
      }} />
      <div className="mb-8">
        <p className="text-uniblex-blue">{game.genre}</p>
        <h1 className="font-heading text-5xl">{game.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-uniblex-gray">{game.description}</p>
      </div>
      <GamePlayer title={game.title} iframeUrl={game.iframeUrl} />
      <div className="my-10">
        <AdZone label="Below Game Player" size="game-bottom" />
      </div>
      <section className="card p-8">
        <h2 className="mb-4 font-heading text-3xl">About This Game</h2>
        <p className="leading-8 text-uniblex-gray">
          This page is ready for game controls, screenshots, tags, genre details, system notes and SEO-friendly original content.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {game.tags.map((tag) => <span key={tag} className="rounded-full border border-uniblex-border px-4 py-2 text-sm text-uniblex-gray">{tag}</span>)}
        </div>
      </section>
    </main>
  );
}
