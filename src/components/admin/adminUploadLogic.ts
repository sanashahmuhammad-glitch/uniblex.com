import { slugify } from "@/lib/slug";

export const ADMIN_PORTAL_SECTIONS = ["games", "submit", "history", "guidelines"] as const;
export type AdminPortalSection = (typeof ADMIN_PORTAL_SECTIONS)[number];

export const SUBMISSION_STEPS = ["Game Details", "Game Options", "Media", "WebGL Build", "Review"] as const;

export const GAME_ENGINES = [
  "Externally hosted iframe",
  "HTML5",
  "Unity 6",
  "Unity 2023",
  "Unity 2022",
  "Unity 2021",
  "Unity 2020",
  "Unity 2019",
  "Unity 2018",
  "Unity 2017",
  "Unity 5.6",
  "Godot",
  "Unreal",
  "Construct",
  "Defold",
  "GameMaker",
  "GDevelop",
  "Cocos",
  "PlayCanvas",
  "LayaAir",
  "Other"
] as const;

export type GameEngine = (typeof GAME_ENGINES)[number];

export type GameFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  tags: string;
  engine: GameEngine;
  iframeUrl: string;
  desktopSupport: boolean;
  mobileSupport: boolean;
  keyboardControls: boolean;
  touchControls: boolean;
  gamepadSupport: boolean;
  multiplayer: boolean;
  savesProgress: boolean;
  orientation: "landscape" | "portrait" | "any";
  aspectRatio: "16/9" | "16/10" | "4/3" | "9/16" | "1/1";
  loadingInstructions: string;
  controls: string;
  coverUrl: string;
  thumbnailUrl: string;
  screenshotUrls: string[];
};

export const EMPTY_GAME_FORM: GameFormState = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  tags: "",
  engine: "HTML5",
  iframeUrl: "",
  desktopSupport: true,
  mobileSupport: false,
  keyboardControls: true,
  touchControls: false,
  gamepadSupport: false,
  multiplayer: false,
  savesProgress: false,
  orientation: "landscape",
  aspectRatio: "16/9",
  loadingInstructions: "",
  controls: ""
  ,coverUrl: "",
  thumbnailUrl: "",
  screenshotUrls: []
};

export function getSlugPreview(title: string, requestedSlug: string) {
  return slugify(requestedSlug || title);
}

export function validateSubmissionStep(step: number, form: GameFormState, hasCover: boolean, hasThumbnail: boolean, hasZip: boolean) {
  const errors: string[] = [];
  if (step === 0) {
    if (!form.title.trim()) errors.push("Game name is required.");
    if (!getSlugPreview(form.title, form.slug)) errors.push("A valid game slug is required.");
    if (form.shortDescription.trim().length < 20) errors.push("Short description must be at least 20 characters.");
    if (form.description.trim().length < 40) errors.push("Full description must be at least 40 characters.");
    if (!form.categoryId) errors.push("Choose a category.");
    if (!GAME_ENGINES.includes(form.engine)) errors.push("Choose a supported game engine.");
  }
  if (step === 1) {
    if (!form.desktopSupport && !form.mobileSupport) errors.push("Choose at least one supported platform.");
    if (!form.controls.trim()) errors.push("Add player controls or instructions.");
  }
  if (step === 2) {
    if (!hasCover && !form.coverUrl) errors.push("A cover image is required.");
    if (!hasThumbnail && !form.thumbnailUrl && !hasCover && !form.coverUrl) errors.push("A card thumbnail is required.");
  }
  if (step === 3) {
    if (form.engine === "Externally hosted iframe") {
      if (!isHttpUrl(form.iframeUrl)) errors.push("Enter a valid HTTPS iframe URL.");
    } else if (!hasZip) {
      errors.push("Choose a WebGL ZIP build.");
    }
  }
  return errors;
}

export function canPublishVerifiedBuild(verified: boolean, operationId: string) {
  return verified && Boolean(operationId);
}

export function sanitizeAdminError(error: unknown) {
  const fallback = "Something went wrong. Please retry safely.";
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  const cleaned = raw
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/[^\s]+X-Amz-[^\s]+/gi, "[signed URL redacted]")
    .replace(/[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, "[token redacted]")
    .slice(0, 300)
    .trim();
  return cleaned || fallback;
}

export function splitTags(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
}

function isHttpUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
