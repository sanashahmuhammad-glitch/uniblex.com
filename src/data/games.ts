export type Game = {
  title: string;
  slug: string;
  genre: string;
  status: "Published" | "Coming Soon";
  description: string;
  cover: string;
  iframeUrl?: string;
  tags: string[];
};

export const games: Game[] = [
  {
    title: "Neon Runner",
    slug: "neon-runner",
    genre: "Arcade",
    status: "Published",
    description: "A fast-paced WebGL runner built for instant browser play with neon visuals and smooth controls.",
    cover: "/brand/gaming.png",
    iframeUrl: "https://example.com/game/neon-runner",
    tags: ["WebGL", "Arcade", "Runner"]
  },
  {
    title: "Cyber Drift",
    slug: "cyber-drift",
    genre: "Racing",
    status: "Coming Soon",
    description: "A futuristic drifting experience with stylish tracks, quick sessions, and competitive energy.",
    cover: "/brand/gaming-icon.png",
    tags: ["Racing", "3D", "Browser"]
  },
  {
    title: "Pixel Arena",
    slug: "pixel-arena",
    genre: "Action",
    status: "Coming Soon",
    description: "A compact action arena designed for quick browser sessions and smooth gameplay loops.",
    cover: "/brand/simple-icon.png",
    tags: ["Action", "Indie", "WebGL"]
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
