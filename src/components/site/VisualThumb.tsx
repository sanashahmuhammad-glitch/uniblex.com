import {
  Bot,
  Brain,
  Car,
  Code2,
  Cuboid,
  Gamepad2,
  Gauge,
  Gem,
  Grid3X3,
  LayoutGrid,
  Map,
  Newspaper,
  Palette,
  Rocket,
  Search,
  Shield,
  Smartphone,
  Sprout,
  Swords,
  TrendingUp,
  Wrench,
  Zap
} from "lucide-react";
import type { Game } from "@/data/games";
import type { Post } from "@/data/posts";

const gameVisuals = {
  "neon-runner": { icon: Gauge, label: "Speed Run", pattern: "lanes" },
  "cyber-drift": { icon: Car, label: "Drift Track", pattern: "track" },
  "pixel-arena": { icon: Swords, label: "Wave Arena", pattern: "grid" },
  "orbit-forge": { icon: Brain, label: "Orbital Puzzle", pattern: "orbit" },
  "skyline-courier": { icon: Map, label: "Rooftop Route", pattern: "city" },
  "mech-yard-tactics": { icon: Bot, label: "Tactical Mechs", pattern: "grid" },
  "crystal-depths": { icon: Gem, label: "Cave Explorer", pattern: "crystal" },
  "turbo-tunnels": { icon: Rocket, label: "Tunnel Boost", pattern: "lanes" },
  "astro-harvest": { icon: Sprout, label: "Space Farm", pattern: "orbit" },
  "blade-circuit": { icon: Zap, label: "Blade Dash", pattern: "circuit" },
  "mystic-blocks": { icon: Grid3X3, label: "Rune Match", pattern: "grid" },
  "rift-defense": { icon: Shield, label: "Rift Defense", pattern: "circuit" }
} as const;

const categoryVisuals = {
  "Game Dev": { icon: Code2, accent: "#00B2FF", label: "Game Dev" },
  "3D Art": { icon: Cuboid, accent: "#FF4DDB", label: "3D Art" },
  Tutorials: { icon: Wrench, accent: "#26E6D0", label: "Tutorial" },
  "Industry News": { icon: Newspaper, accent: "#7A3CFF", label: "Industry" }
} as const;

const postIconBySlug = [
  Search,
  Palette,
  LayoutGrid,
  Rocket,
  Gamepad2,
  Cuboid,
  Wrench,
  TrendingUp,
  Smartphone,
  Code2
];

function Pattern({ type, accent }: { type: string; accent: string }) {
  if (type === "track") {
    return (
      <div className="absolute inset-0 opacity-50">
        <div className="absolute left-[18%] top-[-20%] h-[140%] w-[18%] -rotate-12 border-x border-white/15" />
        <div className="absolute right-[20%] top-[-20%] h-[140%] w-[18%] rotate-12 border-x border-white/15" />
      </div>
    );
  }

  if (type === "orbit") {
    return (
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      </div>
    );
  }

  if (type === "city") {
    return (
      <div className="absolute bottom-0 left-0 right-0 flex h-24 items-end gap-2 px-6 opacity-55">
        {[42, 72, 54, 88, 60, 76, 48].map((height, index) => (
          <div key={index} className="flex-1 rounded-t border border-white/10 bg-white/[.05]" style={{ height }} />
        ))}
      </div>
    );
  }

  if (type === "crystal") {
    return (
      <div className="absolute inset-0 opacity-60">
        {[18, 36, 54, 72].map((left, index) => (
          <div key={left} className="absolute bottom-0 h-24 w-12 rotate-45 border border-white/10" style={{ left: `${left}%`, backgroundColor: `${accent}18` }} />
        ))}
      </div>
    );
  }

  if (type === "lanes") {
    return (
      <div className="absolute inset-0 opacity-50">
        {[20, 40, 60, 80].map((left) => (
          <div key={left} className="absolute top-0 h-full w-px bg-white/15" style={{ left: `${left}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 opacity-35"
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px"
      }}
    />
  );
}

export function GameThumbnail({ game }: { game: Game }) {
  const visual = gameVisuals[game.slug as keyof typeof gameVisuals] ?? gameVisuals["neon-runner"];
  const Icon = visual.icon;

  return (
    <div
      className="relative h-full min-h-full overflow-hidden"
      aria-label={`${game.title} artwork`}
      style={{
        background: `radial-gradient(circle at 22% 16%, ${game.accent}55, transparent 34%), radial-gradient(circle at 78% 26%, rgba(255,255,255,.12), transparent 22%), linear-gradient(135deg, #07111f, #111827 58%, #080b12)`
      }}
    >
      <Pattern type={visual.pattern} accent={game.accent} />
      <div className="absolute inset-x-6 top-6 flex items-center justify-between text-xs font-bold uppercase tracking-[.2em] text-white/55">
        <span>{game.genre}</span>
        <span>{game.sessionLength}</span>
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-black/25 shadow-[0_0_60px_rgba(0,178,255,.18)] backdrop-blur">
        <Icon size={58} color={game.accent} strokeWidth={1.6} />
      </div>
      <div className="absolute inset-x-6 bottom-6">
        <p className="text-xs font-bold uppercase tracking-[.24em]" style={{ color: game.accent }}>{visual.label}</p>
        <h3 className="mt-2 font-heading text-2xl leading-none text-white">{game.title}</h3>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/60 via-transparent to-transparent" />
    </div>
  );
}

export function PostThumbnail({ post }: { post: Post }) {
  const category = categoryVisuals[post.category];
  const Icon = postIconBySlug[Math.abs(hashCode(post.slug)) % postIconBySlug.length] ?? category.icon;

  return (
    <div
      className="relative h-full min-h-full overflow-hidden"
      aria-label={`${post.title} artwork`}
      style={{
        background: `radial-gradient(circle at 22% 18%, ${category.accent}55, transparent 34%), radial-gradient(circle at 80% 12%, rgba(0,178,255,.22), transparent 28%), linear-gradient(135deg, #07111f, #111827 62%, #080b12)`
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.11) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />
      <div className="absolute left-6 top-6 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-white/65">
        {category.label}
      </div>
      <div className="absolute right-6 top-6 text-xs font-bold text-white/55">{post.readingTime}</div>
      <div className="absolute left-7 top-1/2 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-black/25 backdrop-blur">
        <Icon size={50} color={category.accent} strokeWidth={1.7} />
      </div>
      <div className="absolute bottom-6 left-6 right-6">
        <p className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: category.accent }}>{post.category}</p>
        <h3 className="mt-2 line-clamp-2 font-heading text-xl leading-tight text-white">{post.title}</h3>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-uniblex-bg/72 via-transparent to-transparent" />
    </div>
  );
}

function hashCode(value: string) {
  return value.split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
