import type { Game } from "@/data/games";
import type { Post } from "@/data/posts";

const positions = [
  "0% 0%",
  "33.333% 0%",
  "66.667% 0%",
  "100% 0%",
  "0% 50%",
  "33.333% 50%",
  "66.667% 50%",
  "100% 50%",
  "0% 100%",
  "33.333% 100%",
  "66.667% 100%",
  "100% 100%"
];

const gameCoverIndex: Record<string, number> = {
  "neon-runner": 0,
  "cyber-drift": 1,
  "neon-ops-fps": 2,
  "metro-vice-chase": 3,
  "pixel-arena": 4,
  "orbit-forge": 5,
  "skyline-courier": 6,
  "mech-yard-tactics": 7,
  "crystal-depths": 8,
  "turbo-tunnels": 9,
  "astro-harvest": 10,
  "rift-defense": 11
};

const postCoverIndex: Record<string, number> = {
  "why-browser-games-are-growing-again": 0,
  "how-3d-artists-can-build-a-strong-game-portfolio": 1,
  "webgl-game-pages-seo-checklist": 2,
  "practical-pipeline-for-webgl-build-uploads": 3,
  "designing-game-controls-for-browser-players": 4,
  "making-3d-game-assets-load-faster-on-the-web": 5,
  "how-to-write-game-descriptions-that-help-players": 6,
  "minimum-content-stack-before-adsense-submission": 7,
  "core-web-vitals-for-game-showcase-websites": 8,
  "planning-blog-categories-for-game-dev-platform": 9,
  "what-every-game-detail-page-should-include": 10,
  "creating-original-tutorial-content-from-your-own-workflow": 11
};

export function GameThumbnail({ game }: { game: Game }) {
  const index = gameCoverIndex[game.slug] ?? 0;
  const artwork = game.thumbnailUrl || game.cover;
  const usesUploadedCover = artwork !== "/cards/game-cover-sprite.png";

  return (
    <div
      className="relative h-full min-h-full overflow-hidden bg-cover bg-no-repeat transition duration-500 group-hover:scale-[1.03]"
      aria-label={`${game.title} game cover`}
      style={{
        backgroundImage: `url('${artwork}')`,
        backgroundSize: usesUploadedCover ? "cover" : "400% 300%",
        backgroundPosition: usesUploadedCover ? "center" : positions[index]
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/85 via-uniblex-bg/5 to-black/10" />
      <div className="absolute left-4 top-4 rounded-md border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/80 backdrop-blur">
        {game.genre}
      </div>
      <div className="absolute right-4 top-4 rounded-md border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/80 backdrop-blur">
        {game.rating}
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: game.accent }}>{game.players} | {game.sessionLength}</p>
        <h3 className="mt-2 line-clamp-1 font-heading text-2xl leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.8)]">{game.title}</h3>
      </div>
    </div>
  );
}

export function PostThumbnail({ post }: { post: Post }) {
  const index = postCoverIndex[post.slug] ?? Math.abs(hashCode(post.slug)) % positions.length;
  const accent = getCategoryAccent(post.category);

  return (
    <div
      className="relative h-full min-h-full overflow-hidden bg-cover bg-no-repeat transition duration-500 group-hover:scale-[1.03]"
      aria-label={`${post.title} article cover`}
      style={{
        backgroundImage: "url('/cards/blog-cover-sprite.png')",
        backgroundSize: "400% 300%",
        backgroundPosition: positions[index]
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/88 via-uniblex-bg/10 to-black/5" />
      <div className="absolute left-5 top-5 rounded-md border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/80 backdrop-blur">
        {post.category}
      </div>
      <div className="absolute right-5 top-5 rounded-md border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/75 backdrop-blur">
        {post.readingTime}
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: accent }}>Uniblex Article</p>
        <h3 className="mt-2 line-clamp-2 font-heading text-xl leading-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.8)]">{post.title}</h3>
      </div>
    </div>
  );
}

function getCategoryAccent(category: Post["category"]) {
  if (category === "3D Art") return "#FF4DDB";
  if (category === "Tutorials") return "#26E6D0";
  if (category === "Industry News") return "#7A3CFF";
  return "#00B2FF";
}

function hashCode(value: string) {
  return value.split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
