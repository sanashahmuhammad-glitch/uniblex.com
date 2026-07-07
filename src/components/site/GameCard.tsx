import Link from "next/link";
import { Clock3, Gamepad2, Star, Trophy } from "lucide-react";
import type { Game } from "@/data/games";
import { GameThumbnail } from "@/components/site/VisualThumb";

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="card group flex h-full min-h-0 overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/50 hover:shadow-[0_24px_70px_rgba(0,178,255,.16)] sm:flex-col">
      <div
        className="relative aspect-square w-[112px] shrink-0 overflow-hidden bg-white/[.03] sm:aspect-[16/9] sm:w-full"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
        }}
      >
        <GameThumbnail game={game} />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/90 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 hidden rounded-full border border-uniblex-blue/30 bg-uniblex-bg/75 px-3 py-1 text-xs font-bold text-uniblex-blue backdrop-blur sm:block">
          {game.status}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-uniblex-bg/75 px-2 py-1 text-[11px] font-bold text-white backdrop-blur sm:px-3 sm:text-xs">
          <Star size={13} className="text-uniblex-pink" /> {game.rating}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-uniblex-blue sm:text-sm sm:normal-case sm:tracking-normal">{game.genre}</div>
        <h3 className="line-clamp-1 font-heading text-xl leading-tight sm:text-2xl">{game.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-uniblex-gray sm:line-clamp-3">{game.description}</p>
        <div className="mt-4 hidden grid-cols-3 gap-2 text-xs text-uniblex-gray sm:grid">
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
        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {game.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-uniblex-border px-3 py-1 text-xs text-uniblex-gray">{tag}</span>
          ))}
        </div>
        <Link className="btn-primary mt-auto min-h-0 w-full px-4 py-2 text-sm sm:mt-5 sm:min-h-[44px]" href={`/games/${game.slug}`}>
          <Gamepad2 size={18} /> View Game
        </Link>
      </div>
    </article>
  );
}
