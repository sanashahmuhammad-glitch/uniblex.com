import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/data/games";

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[16/10]">
        <Image src={game.cover} alt={game.title} fill className="object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-uniblex-bg/80 px-3 py-1 text-xs font-semibold text-uniblex-blue">
          {game.status}
        </span>
      </div>
      <div className="p-6">
        <div className="mb-2 text-sm text-uniblex-gray">{game.genre}</div>
        <h3 className="mb-3 font-heading text-2xl">{game.title}</h3>
        <p className="mb-5 text-sm leading-6 text-uniblex-gray">{game.description}</p>
        <Link className="btn-primary w-full" href={`/games/${game.slug}`}>View Game</Link>
      </div>
    </article>
  );
}
