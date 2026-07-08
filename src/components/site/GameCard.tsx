import Link from "next/link";
import { Clock3, Gamepad2, Star, Trophy } from "lucide-react";
import type { Game } from "@/data/games";
import { GameThumbnail } from "@/components/site/VisualThumb";

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="group flex h-full min-h-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[.075] via-uniblex-card/80 to-black/30 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/55 hover:shadow-[0_24px_80px_rgba(0,178,255,.16)]">
      <div
        className="relative aspect-square w-[116px] shrink-0 overflow-hidden bg-white/[.03] sm:aspect-[16/10] sm:w-[42%]"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
        }}
      >
        <GameThumbnail game={game} />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/85 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 hidden rounded-full border border-uniblex-blue/30 bg-uniblex-bg/75 px-3 py-1 text-xs font-bold text-uniblex-blue backdrop-blur md:block">
          {game.status}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-uniblex-bg/75 px-2 py-1 text-[11px] font-bold text-white backdrop-blur sm:px-3 sm:text-xs">
          <Star size={13} className="text-uniblex-pink" /> {game.rating}
        </span>
        <span className="absolute bottom-3 left-3 right-3 hidden rounded-md border border-white/10 bg-black/55 px-3 py-2 text-center text-xs font-black uppercase tracking-[.14em] text-white backdrop-blur md:block">
          Instant Play
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-uniblex-blue sm:text-sm sm:normal-case sm:tracking-normal">{game.genre}</div>
        <h3 className="line-clamp-1 font-heading text-xl leading-tight sm:text-2xl">{game.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-uniblex-gray">{game.description}</p>
        <div className="mt-4 hidden grid-cols-3 gap-2 text-xs text-uniblex-gray lg:grid">
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2 text-center">
            <Trophy size={13} /> {game.difficulty}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2 text-center">
            <Clock3 size={13} /> {game.sessionLength}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2 text-center">
            <Gamepad2 size={13} /> {game.players}
          </span>
        </div>
        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          {game.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1 text-xs text-uniblex-gray">{tag}</span>
          ))}
        </div>
        <Link className="mt-auto inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md bg-gradient-to-r from-uniblex-blue to-uniblex-purple px-4 py-2 text-sm font-black text-white shadow-[0_14px_32px_rgba(0,178,255,.24)] transition hover:scale-[1.01] sm:mt-5" href={`/games/${game.slug}`}>
          <Gamepad2 size={16} /> Play Game
        </Link>
      </div>
    </article>
  );
}
