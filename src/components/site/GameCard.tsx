import Link from "next/link";
import { Clock3, Gamepad2, Star, Trophy } from "lucide-react";
import type { Game } from "@/data/games";
import { GameThumbnail } from "@/components/site/VisualThumb";

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/50 hover:shadow-[0_24px_70px_rgba(0,178,255,.16)]">
      <div
        className="relative aspect-[16/10] overflow-hidden bg-white/[.03]"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${game.accent}35, transparent 36%), linear-gradient(135deg, rgba(13,17,24,.96), rgba(17,24,39,.82))`
        }}
      >
        <GameThumbnail game={game} />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/90 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-uniblex-blue/30 bg-uniblex-bg/75 px-3 py-1 text-xs font-bold text-uniblex-blue backdrop-blur">
          {game.status}
        </span>
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-uniblex-bg/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          <Star size={13} className="text-uniblex-pink" /> {game.rating}
        </span>
      </div>
      <div className="p-6">
        <div className="mb-2 text-sm font-semibold text-uniblex-blue">{game.genre}</div>
        <h3 className="mb-3 font-heading text-2xl">{game.title}</h3>
        <p className="mb-5 text-sm leading-6 text-uniblex-gray">{game.description}</p>
        <div className="mb-5 grid grid-cols-3 gap-2 text-xs text-uniblex-gray">
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2">
            <Trophy size={13} /> {game.difficulty}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2">
            <Clock3 size={13} /> {game.sessionLength}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-lg border border-uniblex-border bg-white/[.025] px-2 py-2">
            <Gamepad2 size={13} /> {game.players}
          </span>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {game.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-uniblex-border px-3 py-1 text-xs text-uniblex-gray">{tag}</span>
          ))}
        </div>
        <Link className="btn-primary w-full" href={`/games/${game.slug}`}>
          <Gamepad2 size={18} /> View Game
        </Link>
      </div>
    </article>
  );
}
