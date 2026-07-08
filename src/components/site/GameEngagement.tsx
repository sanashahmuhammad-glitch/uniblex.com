"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Facebook, Heart, MessageCircle, ThumbsUp, Twitter } from "lucide-react";
import type { Game } from "@/data/games";

type GameEngagementProps = {
  game: Game;
  games: Game[];
};

export function GameEngagement({ game, games }: GameEngagementProps) {
  const [favorite, setFavorite] = useState(false);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  const gameUrl = useMemo(() => {
    if (typeof window === "undefined") return `https://uniblex.com/games/${game.slug}`;
    return `${window.location.origin}/games/${game.slug}`;
  }, [game.slug]);

  useEffect(() => {
    setFavorite(readList("uniblex_favorite_games").includes(game.slug));
    setLiked(readList("uniblex_liked_games").includes(game.slug));
    const recent = rememberRecentGame(game.slug);
    setRecentSlugs(recent);
    void incrementCounter(game.slug, "view");
  }, [game.slug]);

  const recentGames = recentSlugs
    .filter((slug) => slug !== game.slug)
    .map((slug) => games.find((item) => item.slug === slug))
    .filter(Boolean)
    .slice(0, 4) as Game[];

  function toggleFavorite() {
    const next = toggleListValue("uniblex_favorite_games", game.slug);
    setFavorite(next.includes(game.slug));
  }

  function likeGame() {
    if (liked) return;
    const next = toggleListValue("uniblex_liked_games", game.slug, true);
    setLiked(next.includes(game.slug));
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(gameUrl).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[.06] via-uniblex-card/75 to-black/25 p-5 shadow-[0_18px_70px_rgba(0,0,0,.2)] backdrop-blur">
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary min-h-0 rounded-md px-4 py-3" onClick={toggleFavorite} type="button">
            <Heart size={18} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorited" : "Favorite"}
          </button>
          <button className="btn-secondary min-h-0 rounded-md px-4 py-3" disabled={liked} onClick={likeGame} type="button">
            <ThumbsUp size={18} fill={liked ? "currentColor" : "none"} /> {liked ? "Liked" : "Like"}
          </button>
          {typeof game.viewCount === "number" ? (
            <span className="rounded-md border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-uniblex-gray">Views: {game.viewCount.toLocaleString()}</span>
          ) : null}
          {typeof game.playCount === "number" ? (
            <span className="rounded-md border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-uniblex-gray">Plays: {game.playCount.toLocaleString()}</span>
          ) : null}
        </div>

        <div className="mt-6">
          <h2 className="font-heading text-2xl">Share this game</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-secondary min-h-0 rounded-md px-4 py-3" onClick={copyLink} type="button">
              {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy Link"}
            </button>
            <a className="btn-secondary min-h-0 rounded-md px-4 py-3" href={`https://wa.me/?text=${encodeURIComponent(`${game.title} ${gameUrl}`)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} /> WhatsApp
            </a>
            <a className="btn-secondary min-h-0 rounded-md px-4 py-3" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`} target="_blank" rel="noreferrer">
              <Facebook size={17} /> Facebook
            </a>
            <a className="btn-secondary min-h-0 rounded-md px-4 py-3" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(game.title)}`} target="_blank" rel="noreferrer">
              <Twitter size={17} /> X/Twitter
            </a>
          </div>
        </div>
      </div>

      <aside className="rounded-xl border border-white/10 bg-white/[.04] p-5 shadow-[0_18px_70px_rgba(0,0,0,.18)] backdrop-blur">
        <h2 className="font-heading text-2xl">Recently Played</h2>
        {recentGames.length ? (
          <div className="mt-4 grid gap-3">
            {recentGames.map((recent) => (
              <Link key={recent.slug} href={`/games/${recent.slug}`} className="rounded-lg border border-white/10 bg-white/[.035] p-3 transition hover:border-uniblex-blue/50 hover:bg-uniblex-blue/10">
                <p className="font-bold">{recent.title}</p>
                <p className="mt-1 text-sm text-uniblex-gray">{recent.genre}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-uniblex-gray">Games you play will appear here for quick access.</p>
        )}
      </aside>
    </section>
  );
}

function readList(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toggleListValue(key: string, value: string, addOnly = false) {
  const current = readList(key);
  const next = current.includes(value)
    ? addOnly ? current : current.filter((item) => item !== value)
    : [value, ...current];
  try {
    localStorage.setItem(key, JSON.stringify(next.slice(0, 50)));
  } catch {
    return current;
  }
  return next;
}

function rememberRecentGame(slug: string) {
  const current = readList("uniblex_recent_games");
  const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 10);
  try {
    localStorage.setItem("uniblex_recent_games", JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

async function incrementCounter(slug: string, type: "view" | "play") {
  try {
    const key = `uniblex_${type}_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    await fetch(`/api/games/${slug}/counters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch {
    // Optional analytics.
  }
}
