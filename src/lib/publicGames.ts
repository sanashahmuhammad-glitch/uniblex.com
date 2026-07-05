import { supabase } from "@/lib/supabase";
import { games as fallbackGames, type Game } from "@/data/games";

type GameRow = {
  title: string;
  slug: string;
  genre: string | null;
  status: string;
  description: string;
  cover_url: string | null;
  iframe_url: string | null;
  tags: string[] | null;
  sort_order: number | null;
  published_at: string | null;
};

const accents = ["#00B2FF", "#7A3CFF", "#FF4DDB", "#26E6D0"];

export async function getPublishedGames() {
  if (!supabase) return fallbackGames;

  const { data, error } = await supabase
    .from("games")
    .select("title,slug,genre,status,description,cover_url,iframe_url,tags,sort_order,published_at")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error || !data?.length) return fallbackGames;

  return (data as GameRow[]).map(mapGameRow);
}

export async function getPublishedGame(slug: string) {
  if (!supabase) return fallbackGames.find((game) => game.slug === slug);

  const { data, error } = await supabase
    .from("games")
    .select("title,slug,genre,status,description,cover_url,iframe_url,tags,sort_order,published_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return fallbackGames.find((game) => game.slug === slug);

  return mapGameRow(data as GameRow);
}

function mapGameRow(row: GameRow): Game {
  const tags = row.tags?.length ? row.tags : ["WebGL"];
  const genre = row.genre || "WebGL Game";

  return {
    title: row.title,
    slug: row.slug,
    genre,
    status: "Published",
    description: row.description,
    cover: row.cover_url || "/cards/game-cover-sprite.png",
    iframeUrl: row.iframe_url || undefined,
    tags,
    playStyle: row.description,
    controls: ["Use the in-game controls after pressing Play."],
    highlights: ["Playable in browser", "WebGL build uploaded through Uniblex admin", "No install required"],
    technicalNotes: ["Game files are served from the uploaded WebGL build.", "The iframe loads only after the player clicks Play."],
    difficulty: "Medium",
    sessionLength: "5-10 min",
    players: "Solo",
    rating: "4.7",
    accent: accents[Math.abs(hashCode(row.slug)) % accents.length]
  };
}

function hashCode(value: string) {
  return value.split("").reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
