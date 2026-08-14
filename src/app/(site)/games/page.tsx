import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { AdZone } from "@/components/site/AdZone";
import { AuthAwareDeveloperLink } from "@/components/developers/AuthAwareDeveloperLink";
import { GamesExplorer } from "@/components/site/GamesExplorer";
import { getPublishedGames } from "@/lib/publicGames";
import { canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play Free WebGL Games Online",
  description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex.",
  keywords: pageKeywords("free WebGL games", "online racing games", "arcade browser games"),
  authors: defaultAuthors,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/games") },
  openGraph: {
    title: "Play Free WebGL Games Online | Uniblex",
    description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex.",
    url: canonicalUrl("/games"),
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Play free WebGL games on Uniblex" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    title: "Play Free WebGL Games Online | Uniblex",
    description: "Explore free WebGL games, racing games, arcade games, and more on Uniblex.",
    images: [siteConfig.ogImage]
  }
};

export default async function GamesPage() {
  const games = await getPublishedGames();

  return (
    <main className="container-pad py-8 md:py-12">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.075] via-uniblex-card/70 to-black/30 p-5 shadow-[0_24px_90px_rgba(0,0,0,.25)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(0,178,255,.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(122,60,255,.2),transparent_28%)]" />
        <div className="relative max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[.24em] text-uniblex-blue">Game Library</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-6xl">Play Free WebGL Games Online</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-uniblex-gray md:text-lg md:leading-8">
            Fast browser games with premium pages, clean player controls, and no installs.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-uniblex-gray">
            <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1">Instant play</span>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1">{games.length} live game{games.length === 1 ? "" : "s"}</span>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1">WebGL ready</span>
          </div>
          <AuthAwareDeveloperLink
            guestHref="/developers/register"
            authenticatedHref="/developers/games/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-uniblex-blue transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue"
          >
            Developers: Submit your game <ArrowRight size={16} />
          </AuthAwareDeveloperLink>
        </div>
      </div>

      <AdZone label="Games Page Header" size="leaderboard" />

      <div className="mt-8 md:mt-10">
        <GamesExplorer games={games} />
      </div>
    </main>
  );
}
