import type { Metadata } from "next";
import { GameCard } from "@/components/site/GameCard";
import { AdZone } from "@/components/site/AdZone";
import { games } from "@/data/games";

export const metadata: Metadata = {
  title: "WebGL Browser Games",
  description: "Play Uniblex WebGL browser games instantly with no installs."
};

export default function GamesPage() {
  return (
    <main className="container-pad py-14">
      <div className="mb-10 max-w-3xl">
        <p className="text-uniblex-blue">Game Library</p>
        <h1 className="font-heading text-5xl">WebGL Games</h1>
        <p className="mt-4 text-lg leading-8 text-uniblex-gray">
          Explore browser-based games with fast loading, clean pages, screenshots, descriptions and play buttons.
        </p>
      </div>
      <AdZone label="Games Page Header" size="leaderboard" />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {games.map((game) => <GameCard key={game.slug} game={game} />)}
      </div>
    </main>
  );
}
