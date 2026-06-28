import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/data/games";

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-uniblex-blue/50 hover:shadow-[0_24px_70px_rgba(0,178,255,.16)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={game.cover} alt={game.title} fill className="object-contain transition duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/90 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-uniblex-blue/30 bg-uniblex-bg/75 px-3 py-1 text-xs font-bold text-uniblex-blue backdrop-blur">
          {game.status}
        </span>
      </div>
      <div className="p-6">
        <div className="mb-2 text-sm font-semibold text-uniblex-blue">{game.genre}</div>
        <h3 className="mb-3 font-heading text-2xl">{game.title}</h3>
        <p className="mb-5 text-sm leading-6 text-uniblex-gray">{game.description}</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {game.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-uniblex-border px-3 py-1 text-xs text-uniblex-gray">{tag}</span>
          ))}
        </div>
        <Link className="btn-primary w-full" href={`/games/${game.slug}`}>View Game</Link>
      </div>
    </article>
  );
}
