"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Clock3, Film, Gamepad2, Star, Trophy, Users } from "lucide-react";
import type { Game } from "@/data/games";
import { GameThumbnail } from "@/components/site/VisualThumb";

export function GameCard({ game }: { game: Game }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);

  const startPreview = () => {
    if (!game.previewVideoUrl || !videoRef.current) return;
    setPreviewing(true);
    videoRef.current.currentTime = 0;
    void videoRef.current.play().catch(() => setPreviewing(false));
  };

  const stopPreview = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setPreviewing(false);
  };

  return (
    <article className="group flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[.075] via-uniblex-card/85 to-black/35 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/55 hover:shadow-[0_24px_80px_rgba(0,178,255,.16)]">
      <Link
        href={`/games/${game.slug}`}
        className="relative block aspect-video w-full shrink-0 overflow-hidden bg-black/30 outline-none ring-uniblex-blue focus-visible:ring-2 [&>div>div]:hidden"
        aria-label={`Play ${game.title}`}
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        onFocus={startPreview}
        onBlur={stopPreview}
      >
        <GameThumbnail game={game} />
        {game.previewVideoUrl ? (
          <video
            ref={videoRef}
            src={game.previewVideoUrl}
            poster={game.thumbnailUrl || game.cover}
            muted
            loop
            playsInline
            preload="none"
            aria-label={`${game.title} gameplay preview`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${previewing ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="rounded-full border border-uniblex-blue/35 bg-[#060a12]/80 px-3 py-1 text-[11px] font-black text-cyan-200 backdrop-blur">{game.genre}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#060a12]/80 px-3 py-1 text-[11px] font-black text-white backdrop-blur"><Star size={13} className="text-uniblex-pink" /> {game.rating}</span>
        </div>
        {game.previewVideoUrl ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur"><Film size={12} /> Hover preview</span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-2xl leading-tight text-white">{game.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-uniblex-gray">{game.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-1.5 text-[11px] text-uniblex-gray sm:gap-2 sm:text-xs">
          <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.035] px-2 py-2 text-center"><Trophy size={13} className="shrink-0 text-uniblex-blue" /><span className="truncate">{game.difficulty}</span></span>
          <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.035] px-2 py-2 text-center"><Clock3 size={13} className="shrink-0 text-uniblex-purple" /><span className="truncate">{game.sessionLength}</span></span>
          <span className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.035] px-2 py-2 text-center"><Users size={13} className="shrink-0 text-uniblex-pink" /><span className="truncate">{game.players}</span></span>
        </div>

        <div className="mt-4 flex min-h-7 flex-wrap gap-2">
          {game.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1 text-[11px] font-bold text-uniblex-gray">{tag}</span>)}
        </div>

        <Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-uniblex-blue to-uniblex-purple px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(0,178,255,.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue" href={`/games/${game.slug}`}>
          <Gamepad2 size={17} /> Play Game
        </Link>
      </div>
    </article>
  );
}
