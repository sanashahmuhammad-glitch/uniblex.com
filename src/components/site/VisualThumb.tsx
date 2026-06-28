import {
  BookOpenText,
  Bot,
  Box,
  Car,
  Code2,
  Cuboid,
  Gamepad2,
  Gem,
  Grid3X3,
  Newspaper,
  Palette,
  Search,
  Shield,
  Smartphone,
  Sprout,
  Swords,
  Target,
  Wrench,
  Zap
} from "lucide-react";
import type { Game } from "@/data/games";
import type { Post } from "@/data/posts";

const categoryVisuals = {
  "Game Dev": { icon: Code2, accent: "#00B2FF", title: "DEV LAB" },
  "3D Art": { icon: Cuboid, accent: "#FF4DDB", title: "3D STUDIO" },
  Tutorials: { icon: Wrench, accent: "#26E6D0", title: "WORKSHOP" },
  "Industry News": { icon: Newspaper, accent: "#7A3CFF", title: "INDUSTRY" }
} as const;

const postIcons = [Search, Palette, BookOpenText, Gamepad2, Smartphone, Box, Target, Zap];

export function GameThumbnail({ game }: { game: Game }) {
  return (
    <div
      className="relative h-full min-h-full overflow-hidden"
      aria-label={`${game.title} game artwork`}
      style={{
        background: `radial-gradient(circle at 22% 16%, ${game.accent}55, transparent 34%), radial-gradient(circle at 80% 20%, rgba(255,255,255,.12), transparent 22%), linear-gradient(135deg, #07111f, #111827 60%, #070a12)`
      }}
    >
      <Grid accent={game.accent} />
      <GameScene game={game} />
      <div className="absolute left-4 top-4 rounded-md border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/75 backdrop-blur">
        {game.genre}
      </div>
      <div className="absolute right-4 top-4 rounded-md border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/75 backdrop-blur">
        {game.difficulty}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/75 via-transparent to-transparent" />
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: game.accent }}>{game.players} | {game.sessionLength}</p>
        <h3 className="mt-2 line-clamp-1 font-heading text-2xl leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.7)]">{game.title}</h3>
      </div>
    </div>
  );
}

export function PostThumbnail({ post }: { post: Post }) {
  const visual = categoryVisuals[post.category];
  const Icon = postIcons[Math.abs(hashCode(post.slug)) % postIcons.length] ?? visual.icon;

  return (
    <div
      className="relative h-full min-h-full overflow-hidden"
      aria-label={`${post.title} article artwork`}
      style={{
        background: `radial-gradient(circle at 22% 18%, ${visual.accent}55, transparent 34%), radial-gradient(circle at 80% 12%, rgba(0,178,255,.2), transparent 28%), linear-gradient(135deg, #07111f, #111827 62%, #080b12)`
      }}
    >
      <Grid accent={visual.accent} />
      <div className="absolute left-7 top-8 h-24 w-36 rotate-[-7deg] rounded-lg border border-white/15 bg-white/[.06] shadow-[0_24px_60px_rgba(0,0,0,.35)]" />
      <div className="absolute right-7 top-10 h-28 w-28 rotate-[10deg] rounded-lg border border-white/15 bg-black/25 shadow-[0_20px_50px_rgba(0,0,0,.35)] backdrop-blur">
        <div className="absolute inset-3 rounded-md border border-white/10 bg-white/[.05]" />
      </div>
      <div className="absolute left-10 top-1/2 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/30 shadow-[0_0_60px_rgba(0,178,255,.16)] backdrop-blur">
        <Icon size={50} color={visual.accent} strokeWidth={1.7} />
      </div>
      <div className="absolute bottom-0 right-0 h-28 w-40 rounded-tl-[60px] opacity-80" style={{ background: `linear-gradient(135deg, transparent, ${visual.accent}30)` }} />
      <div className="absolute left-5 top-5 rounded-md border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white/75 backdrop-blur">
        {visual.title}
      </div>
      <div className="absolute right-5 top-5 text-[10px] font-black uppercase tracking-[.18em] text-white/55">{post.readingTime}</div>
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/78 via-transparent to-transparent" />
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: visual.accent }}>{post.category}</p>
        <h3 className="mt-2 line-clamp-2 font-heading text-xl leading-tight text-white">{post.title}</h3>
      </div>
    </div>
  );
}

function GameScene({ game }: { game: Game }) {
  switch (game.slug) {
    case "cyber-drift":
    case "turbo-tunnels":
      return <CarScene accent={game.accent} turbo={game.slug === "turbo-tunnels"} />;
    case "pixel-arena":
    case "blade-circuit":
      return <ActionScene accent={game.accent} blade={game.slug === "blade-circuit"} />;
    case "orbit-forge":
    case "mystic-blocks":
      return <PuzzleScene accent={game.accent} blocks={game.slug === "mystic-blocks"} />;
    case "skyline-courier":
      return <CityScene accent={game.accent} />;
    case "mech-yard-tactics":
      return <MechScene accent={game.accent} />;
    case "crystal-depths":
      return <CrystalScene accent={game.accent} />;
    case "astro-harvest":
      return <FarmScene accent={game.accent} />;
    case "rift-defense":
      return <DefenseScene accent={game.accent} />;
    default:
      return <RunnerScene accent={game.accent} />;
  }
}

function RunnerScene({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />
      {[22, 42, 62, 82].map((left) => <div key={left} className="absolute bottom-0 h-40 w-px origin-bottom -skew-x-12 bg-white/15" style={{ left: `${left}%` }} />)}
      <div className="absolute left-[43%] top-[31%] h-24 w-16 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,.45)]" style={{ background: `linear-gradient(135deg, ${accent}, #7A3CFF)` }} />
      <div className="absolute left-[48%] top-[51%] h-20 w-4 -rotate-45 rounded bg-white/80" />
      <div className="absolute left-[38%] top-[52%] h-20 w-4 rotate-45 rounded bg-white/60" />
      <div className="absolute right-[18%] top-[42%] h-16 w-16 rotate-45 rounded-lg border border-white/15 bg-white/[.06]" />
    </>
  );
}

function CarScene({ accent, turbo = false }: { accent: string; turbo?: boolean }) {
  return (
    <>
      <div className="absolute bottom-0 left-[-10%] h-32 w-[120%] -skew-y-6 bg-black/35" />
      {[25, 50, 75].map((left) => <div key={left} className="absolute bottom-0 h-36 w-1 -skew-x-12 bg-white/15" style={{ left: `${left}%` }} />)}
      <div className="absolute left-[22%] top-[43%] h-16 w-44 -skew-x-12 rounded-xl shadow-[0_24px_55px_rgba(0,0,0,.5)]" style={{ background: `linear-gradient(135deg, ${accent}, #111827 70%)` }} />
      <div className="absolute left-[34%] top-[33%] h-14 w-24 -skew-x-12 rounded-t-xl bg-white/20" />
      <div className="absolute left-[28%] top-[65%] h-10 w-10 rounded-full border-[8px] border-black bg-white/20" />
      <div className="absolute left-[60%] top-[65%] h-10 w-10 rounded-full border-[8px] border-black bg-white/20" />
      <div className="absolute left-[12%] top-[50%] h-4 w-24 rounded-full blur-sm" style={{ backgroundColor: turbo ? "#FF4DDB" : "#00B2FF" }} />
      <Car className="absolute right-8 top-8 text-white/20" size={54} />
    </>
  );
}

function ActionScene({ accent, blade = false }: { accent: string; blade?: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-black/35" />
      <div className="absolute left-[24%] top-[34%] h-24 w-16 rounded-t-full bg-white/12 shadow-[0_20px_50px_rgba(0,0,0,.45)]" />
      <div className="absolute left-[30%] top-[28%] h-14 w-14 rounded-full" style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }} />
      <div className="absolute left-[45%] top-[38%] h-3 w-28 rotate-[-18deg] rounded-full bg-white/80" />
      <div className="absolute right-[24%] top-[42%] h-20 w-12 rounded-t-full bg-red-500/70" />
      <div className="absolute right-[29%] top-[33%] h-12 w-12 rounded-full bg-red-300/80" />
      <Swords className="absolute right-8 top-8 text-white/20" size={58} />
      {blade ? <div className="absolute left-[50%] top-[24%] h-32 w-3 rotate-45 rounded-full" style={{ backgroundColor: accent }} /> : null}
    </>
  );
}

function PuzzleScene({ accent, blocks = false }: { accent: string; blocks?: boolean }) {
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="absolute h-16 w-16 rotate-12 rounded-lg border border-white/15 shadow-[0_18px_38px_rgba(0,0,0,.35)]"
          style={{
            left: `${22 + (item % 3) * 18}%`,
            top: `${30 + Math.floor(item / 3) * 23}%`,
            background: `linear-gradient(135deg, ${item % 2 ? accent : "#00B2FF"}, #111827)`
          }}
        />
      ))}
      {!blocks ? <div className="absolute right-14 top-14 h-28 w-28 rounded-full border border-white/20" /> : <Grid3X3 className="absolute right-9 top-8 text-white/20" size={58} />}
    </>
  );
}

function CityScene({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 flex h-36 items-end gap-2 px-8">
        {[78, 118, 86, 140, 100, 126, 72].map((height, index) => (
          <div key={index} className="flex-1 rounded-t border border-white/10 bg-white/[.07]" style={{ height }} />
        ))}
      </div>
      <div className="absolute left-[40%] top-[32%] h-12 w-20 rounded-full blur-md" style={{ backgroundColor: accent }} />
      <div className="absolute left-[45%] top-[42%] h-14 w-10 rounded bg-white/70" />
      <div className="absolute left-[43%] top-[54%] h-12 w-3 rotate-45 rounded bg-white/60" />
      <div className="absolute left-[54%] top-[54%] h-12 w-3 -rotate-45 rounded bg-white/60" />
    </>
  );
}

function MechScene({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute left-[28%] top-[32%] h-28 w-24 rounded-xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,.45)]" style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }} />
      <div className="absolute left-[34%] top-[22%] h-16 w-16 rounded-lg bg-white/20" />
      <div className="absolute left-[18%] top-[48%] h-6 w-24 rounded bg-white/35" />
      <div className="absolute left-[50%] top-[48%] h-6 w-24 rounded bg-white/35" />
      <div className="absolute left-[30%] top-[66%] h-16 w-5 rounded bg-white/35" />
      <div className="absolute left-[48%] top-[66%] h-16 w-5 rounded bg-white/35" />
      <Bot className="absolute right-8 top-8 text-white/20" size={60} />
    </>
  );
}

function CrystalScene({ accent }: { accent: string }) {
  return (
    <>
      {[18, 30, 45, 60, 74].map((left, index) => (
        <div key={left} className="absolute bottom-4 h-32 w-12 rotate-45 border border-white/15 shadow-[0_0_45px_rgba(38,230,208,.15)]" style={{ left: `${left}%`, background: `linear-gradient(135deg, ${accent}, transparent)` }} />
      ))}
      <Gem className="absolute right-8 top-8 text-white/20" size={58} />
    </>
  );
}

function FarmScene({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute left-[20%] top-[28%] h-28 w-28 rounded-full border border-white/15" style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }} />
      {[28, 44, 60, 76].map((left) => <Sprout key={left} className="absolute bottom-12 text-emerald-300" style={{ left: `${left}%` }} size={34} />)}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-emerald-500/10" />
    </>
  );
}

function DefenseScene({ accent }: { accent: string }) {
  return (
    <>
      {[24, 46, 68].map((left, index) => (
        <div key={left} className="absolute bottom-12 h-24 w-16 rounded-t-xl border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,.35)]" style={{ left: `${left}%`, background: `linear-gradient(135deg, ${index === 1 ? accent : "#00B2FF"}, #111827)` }}>
          <div className="absolute left-1/2 top-[-18px] h-8 w-8 -translate-x-1/2 rounded-full bg-white/25" />
        </div>
      ))}
      <div className="absolute right-8 top-10 h-20 w-20 rounded-full border border-red-400/40 bg-red-500/20" />
      <Shield className="absolute right-10 top-12 text-white/35" size={52} />
    </>
  );
}

function Grid({ accent }: { accent: string }) {
  return (
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}26 1px, transparent 1px)`,
        backgroundSize: "34px 34px"
      }}
    />
  );
}

function hashCode(value: string) {
  return value.split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
