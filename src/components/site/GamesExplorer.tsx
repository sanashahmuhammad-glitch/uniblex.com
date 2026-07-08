"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Gamepad2, Sparkles, Star, Trophy } from "lucide-react";
import type { Game } from "@/data/games";
import { GameCard } from "@/components/site/GameCard";
import { GameThumbnail } from "@/components/site/VisualThumb";

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

  const featuredGames = games.slice(0, 1);
  const newGames = games.slice(0, 6);
  const racingGames = games.filter((game) => /racing|bike|driving|car/i.test(`${game.genre} ${game.tags.join(" ")}`)).slice(0, 6);
  const topRatedGame = games.slice().sort((left, right) => Number(right.rating) - Number(left.rating))[0];

  return (
    <div className="grid gap-8 md:gap-12">
      <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[.045] p-3 shadow-[0_18px_70px_rgba(0,0,0,.22)] backdrop-blur sm:p-4 lg:grid-cols-[1fr_180px_180px_160px]">
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

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Live Library", value: games.length, note: "Real games only" },
          { label: "Top Rated", value: topRatedGame?.rating ?? "-", note: topRatedGame?.title ?? "Coming soon" },
          { label: "Recently Played", value: recentlyPlayed.length, note: "Saved on this device" }
        ].map((item) => (
          <div key={item.label} className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/70 to-black/25 p-4 shadow-[0_18px_70px_rgba(0,0,0,.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,178,255,.16),transparent_34%)]" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[.2em] text-uniblex-blue">{item.label}</p>
              <p className="mt-2 font-heading text-4xl text-white">{item.value}</p>
              <p className="mt-1 truncate text-sm text-uniblex-gray">{item.note}</p>
            </div>
          </div>
        ))}
      </section>

      <FeaturedGame game={featuredGames[0]} />
      {recentlyPlayed.length ? <GameShelf title="Recently Played" games={recentlyPlayed} /> : null}
      <GameShelf title="New Games" games={newGames} />
      {racingGames.length && racingGames.length !== newGames.length ? <GameShelf title="Racing Games" games={racingGames} /> : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-uniblex-blue">Browse Library</p>
            <h2 className="font-heading text-3xl">All Games</h2>
          </div>
          <p className="text-sm text-uniblex-gray">{filteredGames.length} game{filteredGames.length === 1 ? "" : "s"}</p>
        </div>
        {filteredGames.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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

function FeaturedGame({ game }: { game?: Game }) {
  if (!game) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-uniblex-blue/25 bg-[#070b13] shadow-[0_28px_110px_rgba(0,178,255,.16)]">
      <div className="absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 18% 10%, ${game.accent}45, transparent 34%), radial-gradient(circle at 88% 15%, rgba(122,60,255,.25), transparent 28%), linear-gradient(135deg, rgba(13,17,24,.98), rgba(5,7,11,.94))` }} />
      <div className="relative grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-9">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-uniblex-blue/30 bg-uniblex-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.18em] text-uniblex-blue">
            <Sparkles size={14} /> Featured Game
          </div>
          <h2 className="font-heading text-3xl leading-tight sm:text-4xl lg:text-5xl">{game.title}</h2>
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-uniblex-gray sm:text-base sm:leading-7">{game.description}</p>
          <div className="mt-5 grid max-w-xl grid-cols-3 gap-2 text-xs text-uniblex-gray">
            <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.045] px-2 py-2 font-bold"><Star size={14} className="text-uniblex-pink" /> {game.rating}</span>
            <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.045] px-2 py-2 font-bold"><Trophy size={14} className="text-uniblex-blue" /> {game.difficulty}</span>
            <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.045] px-2 py-2 font-bold"><Clock3 size={14} className="text-uniblex-purple" /> {game.sessionLength}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {game.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1 text-xs font-bold text-uniblex-gray">{tag}</span>
            ))}
          </div>
          <Link href={`/games/${game.slug}`} className="btn-primary mt-6 w-full sm:w-fit">
            <Gamepad2 size={18} /> Play Featured Game
          </Link>
        </div>
        <Link href={`/games/${game.slug}`} className="group relative min-h-[220px] overflow-hidden border-t border-white/10 bg-black/25 lg:min-h-[390px] lg:border-l lg:border-t-0">
          <GameThumbnail game={game} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/45 p-3 backdrop-blur">
            <span className="text-sm font-black text-white">{game.genre}</span>
            <span className="rounded-md bg-uniblex-blue px-3 py-1 text-xs font-black text-white transition group-hover:bg-uniblex-purple">Play Now</span>
          </div>
        </Link>
      </div>
    </section>
  );
}

function GameShelf({ title, games }: { title: string; games: Game[] }) {
  if (!games.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-heading text-2xl md:text-3xl">{title}</h2>
        <p className="text-sm text-uniblex-gray">{games.length} game{games.length === 1 ? "" : "s"}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => <GameCard key={`${title}-${game.slug}`} game={game} />)}
      </div>
    </section>
  );
}
