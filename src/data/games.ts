import { MOTO_RIDER_IFRAME_URL, MOTO_RIDER_THUMBNAIL_URL } from "@/lib/gameIframeUrls";

export type Game = {
  title: string;
  slug: string;
  genre: string;
  status: "Published" | "Coming Soon";
  description: string;
  cover: string;
  iframeUrl?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  screenshotUrls?: string[];
  aspectRatio?: string;
  desktopControls?: string[];
  mobileControls?: string[];
  tags: string[];
  playStyle: string;
  controls: string[];
  highlights: string[];
  technicalNotes: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  sessionLength: string;
  players: string;
  rating: string;
  accent: string;
  viewCount?: number | null;
  playCount?: number | null;
  developerName?: string;
  engine?: string;
  orientation?: string;
  publishedAt?: string;
  updatedAt?: string;
};

// This fallback contains only a verified playable game. Production listings use
// authoritative published rows from Supabase and fail closed on query errors.
export const games: Game[] = [
  {
    title: "Moto Rider 3D Bike Race Game",
    slug: "moto-rider-3d-bike-race-game",
    genre: "Racing",
    status: "Published",
    description: "Ride motorcycles through 3D racing challenges in a browser-based WebGL game.",
    cover: MOTO_RIDER_THUMBNAIL_URL,
    thumbnailUrl: MOTO_RIDER_THUMBNAIL_URL,
    iframeUrl: MOTO_RIDER_IFRAME_URL,
    tags: ["WebGL", "Racing", "Bike", "Motorcycle", "3D", "Driving", "Arcade"],
    playStyle: "Fast 3D motorcycle racing with road challenges and replayable sessions.",
    controls: ["WASD or Arrow Keys to control the bike", "Space for brake or action", "Mouse to select menus"],
    highlights: ["Playable in browser", "Loads after you press Play", "No install required"],
    technicalNotes: ["The game runs in a sandboxed browser player.", "The player loads only after the player clicks Play."],
    difficulty: "Medium",
    sessionLength: "5-10 min",
    players: "Solo",
    rating: "4.8",
    accent: "#00B2FF"
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
