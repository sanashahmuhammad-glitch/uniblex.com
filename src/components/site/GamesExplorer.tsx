"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game } from "@/data/games";
import { GameCard } from "@/components/site/GameCard";

type SortKey = "newest" | "popular" | "rating" | "az";

export function GamesExplorer({ games }: { games: Game[] }) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("uniblex_recent_games") || "[]");
      setRecentSlugs(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setRecentSlugs([]);
    }
  }, []);

  const genres = useMemo(() => ["All", ...Array.from(new Set(games.map((game) => game.genre))).sort()], [games]);
  const tags = useMemo(() => ["All", ...Array.from(new Set(games.flatMap((game) => game.tags))).sort()], [games]);
  const recentlyPlayed = recentSlugs.map((slug) => games.find((game) => game.slug === slug)).filter(Boolean).slice(0, 6) as Game[];

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();
    return games
      .filter((game) => {
        const matchesSearch = !query || [game.title, game.description, game.genre, ...game.tags].join(" ").toLowerCase().includes(query);
        const matchesGenre = genre === "All" || game.genre === genre;
        const matchesTag = tag === "All" || game.tags.includes(tag);
        return matchesSearch && matchesGenre && matchesTag;
      })
      .sort((left, right) => {
        if (sort === "az") return left.title.localeCompare(right.title);
        if (sort === "rating") return Number(right.rating) - Number(left.rating);
        if (sort === "popular") return Number(right.playCount ?? 0) - Number(left.playCount ?? 0);
        return 0;
      });
  }, [games, genre, search, sort, tag]);

  const featuredGames = games.slice(0, 6);
  const newGames = games.slice(0, 6);
  const racingGames = games.filter((game) => /racing|bike|driving|car/i.test(`${game.genre} ${game.tags.join(" ")}`)).slice(0, 6);

  return (
    <div className="grid gap-12">
      <section className="grid gap-4 rounded-lg border border-uniblex-border bg-white/[.025] p-4 lg:grid-cols-[1fr_180px_180px_160px]">
        <input
          className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search games..."
          type="search"
        />
        <select className="rounded-lg border border-uniblex-border bg-slate-900 px-4 py-3 text-white outline-none focus:border-uniblex-blue" value={genre} onChange={(event) => setGenre(event.target.value)}>
          {genres.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-lg border border-uniblex-border bg-slate-900 px-4 py-3 text-white outline-none focus:border-uniblex-blue" value={tag} onChange={(event) => setTag(event.target.value)}>
          {tags.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded-lg border border-uniblex-border bg-slate-900 px-4 py-3 text-white outline-none focus:border-uniblex-blue" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="rating">Rating</option>
          <option value="az">A-Z</option>
        </select>
      </section>

      {recentlyPlayed.length ? <GameShelf title="Recently Played" games={recentlyPlayed} /> : null}
      <GameShelf title="Featured Games" games={featuredGames} />
      <GameShelf title="New Games" games={newGames} />
      {racingGames.length ? <GameShelf title="Racing Games" games={racingGames} /> : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-uniblex-blue">Browse Library</p>
            <h2 className="font-heading text-3xl">All Games</h2>
          </div>
          <p className="text-sm text-uniblex-gray">{filteredGames.length} game{filteredGames.length === 1 ? "" : "s"}</p>
        </div>
        {filteredGames.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGames.map((game) => <GameCard key={game.slug} game={game} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-8 text-center">
            <h3 className="font-heading text-2xl">No games found</h3>
            <p className="mt-2 text-uniblex-gray">Try a different search, genre, or tag filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function GameShelf({ title, games }: { title: string; games: Game[] }) {
  if (!games.length) return null;

  return (
    <section>
      <h2 className="mb-5 font-heading text-3xl">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => <GameCard key={`${title}-${game.slug}`} game={game} />)}
      </div>
    </section>
  );
}
