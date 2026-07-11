import { supabase } from "@/lib/supabase";
import { games as fallbackGames, type Game } from "@/data/games";
import { MOTO_RIDER_IFRAME_URL, MOTO_RIDER_SLUG, MOTO_RIDER_THUMBNAIL_URL } from "@/lib/gameIframeUrls";

type GameRow = {
  id?: string;
  title: string;
  slug: string;
  genre: string | null;
  status: string;
  description: string;
  cover_url: string | null;
  iframe_url: string | null;
  thumbnail_url?: string | null;
  screenshot_urls?: string[] | null;
  desktop_controls?: unknown;
  mobile_controls?: unknown;
  aspect_ratio?: string | null;
  tags: string[] | null;
  sort_order: number | null;
  published_at: string | null;
  view_count?: number | null;
  play_count?: number | null;
};

const accents = ["#00B2FF", "#7A3CFF", "#FF4DDB", "#26E6D0"];
const fallbackPublishedGames = fallbackGames.filter((game) => game.status === "Published");

export async function getPublishedGames() {
  if (!supabase) return fallbackPublishedGames;

  const { data, error } = await supabase
    .from("games")
    .select("title,slug,genre,status,description,cover_url,iframe_url,thumbnail_url,screenshot_urls,desktop_controls,mobile_controls,aspect_ratio,tags,sort_order,published_at")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error || !data?.length) return fallbackPublishedGames;

  const games = (data as GameRow[]).map(mapGameRow);
  return withOptionalCounters(games);
}

export async function getPublishedGame(slug: string) {
  if (!supabase) return fallbackPublishedGames.find((game) => game.slug === slug);

  const { data, error } = await supabase
    .from("games")
    .select("title,slug,genre,status,description,cover_url,iframe_url,thumbnail_url,screenshot_urls,desktop_controls,mobile_controls,aspect_ratio,tags,sort_order,published_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return fallbackPublishedGames.find((game) => game.slug === slug);

  return withOptionalCounter(mapGameRow(data as GameRow));
}

function mapGameRow(row: GameRow): Game {
  const tags = row.tags?.length ? row.tags : ["WebGL"];
  const genre = row.genre || "WebGL Game";
  const isMotoRider = row.slug === MOTO_RIDER_SLUG;

  return {
    title: row.title,
    slug: row.slug,
    genre,
    status: "Published",
    description: row.description,
    cover: isMotoRider ? MOTO_RIDER_THUMBNAIL_URL : row.cover_url || "/cards/game-cover-sprite.png",
    iframeUrl: isMotoRider ? MOTO_RIDER_IFRAME_URL : row.iframe_url || undefined,
    thumbnailUrl: isMotoRider ? MOTO_RIDER_THUMBNAIL_URL : row.thumbnail_url || row.cover_url || undefined,
    screenshotUrls: row.screenshot_urls?.length ? row.screenshot_urls : [],
    aspectRatio: row.aspect_ratio || "16/9",
    desktopControls: normalizeControlList(row.desktop_controls, ["WASD / Arrow Keys = Move", "Space = Brake / Action", "Mouse = Select"]),
    mobileControls: normalizeControlList(row.mobile_controls, ["Rotate your device", "Use on-screen controls"]),
    tags,
    playStyle: row.description,
    controls: ["Use the in-game controls after pressing Play."],
    highlights: ["Playable in browser", "WebGL build uploaded through Uniblex admin", "No install required"],
    technicalNotes: ["Game files are served from the uploaded WebGL build.", "The iframe loads only after the player clicks Play."],
    difficulty: "Medium",
    sessionLength: "5-10 min",
    players: "Solo",
    rating: "4.7",
    accent: accents[Math.abs(hashCode(row.slug)) % accents.length],
    viewCount: typeof row.view_count === "number" ? row.view_count : null,
    playCount: typeof row.play_count === "number" ? row.play_count : null
  };
}

async function withOptionalCounters(games: Game[]) {
  if (!supabase || !games.length) return games;

  const { data, error } = await supabase
    .from("games")
    .select("slug,view_count,play_count")
    .in("slug", games.map((game) => game.slug));

  if (error || !data) return games;

  const counters = new Map((data as GameRow[]).map((row) => [row.slug, row]));
  return games.map((game) => {
    const counter = counters.get(game.slug);
    return counter
      ? {
          ...game,
          viewCount: typeof counter.view_count === "number" ? counter.view_count : null,
          playCount: typeof counter.play_count === "number" ? counter.play_count : null
        }
      : game;
  });
}

async function withOptionalCounter(game: Game) {
  if (!supabase) return game;

  const { data, error } = await supabase
    .from("games")
    .select("view_count,play_count")
    .eq("slug", game.slug)
    .maybeSingle();

  if (error || !data) return game;

  const row = data as GameRow;
  return {
    ...game,
    viewCount: typeof row.view_count === "number" ? row.view_count : null,
    playCount: typeof row.play_count === "number" ? row.play_count : null
  };
}

function normalizeControlList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length ? value : fallback;
}

function hashCode(value: string) {
  return value.split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
