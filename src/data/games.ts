export type Game = {
  title: string;
  slug: string;
  genre: string;
  status: "Published" | "Coming Soon";
  description: string;
  cover: string;
  iframeUrl?: string;
  tags: string[];
  playStyle: string;
  controls: string[];
  highlights: string[];
  technicalNotes: string[];
};

export const games: Game[] = [
  {
    title: "Neon Runner",
    slug: "neon-runner",
    genre: "Arcade Runner",
    status: "Published",
    description: "A fast WebGL runner built around clean timing, glowing lanes, and instant retry sessions for browser players.",
    cover: "/brand/gaming.png",
    iframeUrl: "https://uniblex.com/game-builds/neon-runner/index.html",
    tags: ["WebGL", "Arcade", "Runner", "Keyboard"],
    playStyle: "Short skill-based runs with quick restarts, lane switching, obstacle reading, and score chasing.",
    controls: ["Arrow keys or A/D to move", "Space to jump", "Esc to pause", "R to restart"],
    highlights: ["Lazy loaded player for faster pages", "Mobile-friendly game detail layout", "Original game description for search visibility"],
    technicalNotes: ["Recommended build size under 100MB", "Host WebGL build on Supabase Storage, Cloudinary, or S3-compatible storage", "Use compressed textures where possible"]
  },
  {
    title: "Cyber Drift",
    slug: "cyber-drift",
    genre: "Racing",
    status: "Coming Soon",
    description: "A futuristic drift prototype concept with neon tracks, compact sessions, and creator-first showcase content.",
    cover: "/brand/gaming-icon.png",
    tags: ["Racing", "3D", "Browser", "Prototype"],
    playStyle: "Arcade handling, short circuits, and style scoring designed for quick web sessions.",
    controls: ["WASD or arrow keys to drive", "Shift to drift", "Space for handbrake"],
    highlights: ["Coming soon state", "Ready for screenshots and gameplay trailer", "SEO slug and schema prepared"],
    technicalNotes: ["Upload WebGL folder after compression", "Add at least three screenshots before publishing", "Keep first input delay low by loading on click"]
  },
  {
    title: "Pixel Arena",
    slug: "pixel-arena",
    genre: "Action",
    status: "Coming Soon",
    description: "A compact action arena concept for quick browser sessions, readable combat loops, and indie-style visuals.",
    cover: "/brand/simple-icon.png",
    tags: ["Action", "Indie", "Arena", "WebGL"],
    playStyle: "Wave survival with simple movement, target priority, and escalating enemy patterns.",
    controls: ["WASD to move", "Mouse to aim", "Left click to attack", "Q for special ability"],
    highlights: ["Great for original development notes", "Supports tags and draft publishing", "Prepared for related articles"],
    technicalNotes: ["Use compressed audio", "Avoid autoplay on initial page load", "Document controls and credits before launch"]
  },
  {
    title: "Orbit Forge",
    slug: "orbit-forge",
    genre: "Puzzle",
    status: "Coming Soon",
    description: "A physics puzzle concept about redirecting energy cores through orbital gates and mechanical traps.",
    cover: "/icon-512.png",
    tags: ["Puzzle", "Physics", "Sci-Fi", "Browser"],
    playStyle: "Think-first puzzle stages with clean goals, readable level rules, and gradual difficulty.",
    controls: ["Mouse drag to aim", "Release to launch", "Z to undo", "R to reset"],
    highlights: ["Strong tutorial article potential", "AdSense-safe original concept", "Works well with level screenshots"],
    technicalNotes: ["Use deterministic physics settings", "Preload only the first level", "Publish level notes for long-form content"]
  },
  {
    title: "Skyline Courier",
    slug: "skyline-courier",
    genre: "Adventure",
    status: "Coming Soon",
    description: "A stylized delivery adventure concept focused on rooftop movement, route planning, and atmosphere.",
    cover: "/og-image.png",
    tags: ["Adventure", "Movement", "Stylized", "Web"],
    playStyle: "Exploration and timed routes with light platforming and collectible objectives.",
    controls: ["WASD to move", "Space to jump", "E to interact", "Tab for route map"],
    highlights: ["Suitable for development diary posts", "Readable game overview content", "Future-ready for screenshots"],
    technicalNotes: ["Keep camera motion comfortable", "Use responsive iframe sizing", "Add fallback copy for unsupported devices"]
  },
  {
    title: "Mech Yard Tactics",
    slug: "mech-yard-tactics",
    genre: "Strategy",
    status: "Coming Soon",
    description: "A turn-based tactics concept about small squads, modular machines, and decisions that fit browser play.",
    cover: "/brand/horizontal-lockup.png",
    tags: ["Strategy", "Tactics", "Mechs", "Turn-Based"],
    playStyle: "Compact tactical turns with ability cooldowns, terrain choices, and mission scoring.",
    controls: ["Click to select units", "Right click to inspect", "Number keys for abilities", "Enter to end turn"],
    highlights: ["High-value original content angle", "Great for guide articles", "Prepared for future published status"],
    technicalNotes: ["Persist saves only after privacy review", "Avoid large first-load asset bundles", "Keep UI readable on tablets"]
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
