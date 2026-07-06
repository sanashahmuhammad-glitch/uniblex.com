import type { Metadata } from "next";
import { AdZone } from "@/components/site/AdZone";
import { GamesExplorer } from "@/components/site/GamesExplorer";
import { getPublishedGames } from "@/lib/publicGames";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play Free WebGL Games Online | Uniblex",
  description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Play Free WebGL Games Online | Uniblex",
    description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex.",
    url: "/games",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Play Free WebGL Games Online | Uniblex",
    description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex."
  }
};

export default async function GamesPage() {
  const games = await getPublishedGames();

  return (
    <main className="container-pad py-12 md:py-16">
      <div className="mb-10 max-w-4xl">
        <p className="text-uniblex-blue">Game Library</p>
        <h1 className="font-heading text-4xl leading-tight md:text-5xl">Play Free WebGL Games Online</h1>
        <p className="mt-4 text-lg leading-8 text-uniblex-gray">
          Explore browser-based racing games, arcade games, driving games, and creator-built WebGL experiences with no installs.
        </p>
      </div>

      <AdZone label="Games Page Header" size="leaderboard" />

      <div className="mt-10">
        <GamesExplorer games={games} />
      </div>
    </main>
  );
}
