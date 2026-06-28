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
  difficulty: "Easy" | "Medium" | "Hard";
  sessionLength: string;
  players: string;
  rating: string;
  accent: string;
};

export const games: Game[] = [
  {
    title: "Neon Runner",
    slug: "neon-runner",
    genre: "Arcade Runner",
    status: "Published",
    description: "Dash through glowing lanes, dodge reactive gates, and chase high scores in a fast browser runner.",
    cover: "/brand/gaming.png",
    iframeUrl: "https://uniblex.com/game-builds/neon-runner/index.html",
    tags: ["WebGL", "Arcade", "Runner", "Keyboard"],
    playStyle: "Short skill-based runs with quick restarts, lane switching, obstacle reading, and score chasing.",
    controls: ["Arrow keys or A/D to move", "Space to jump", "Esc to pause", "R to restart"],
    highlights: ["Lazy loaded player for faster pages", "Mobile-friendly game detail layout", "Original game description for search visibility"],
    technicalNotes: ["Recommended build size under 100MB", "Host WebGL build on Supabase Storage, Cloudinary, or S3-compatible storage", "Use compressed textures where possible"],
    difficulty: "Medium",
    sessionLength: "3-5 min",
    players: "Solo",
    rating: "4.8",
    accent: "#00B2FF"
  },
  {
    title: "Cyber Drift",
    slug: "cyber-drift",
    genre: "Racing",
    status: "Coming Soon",
    description: "Slide across neon corners, chain drift boosts, and master compact sci-fi racing tracks.",
    cover: "/brand/gaming-icon.png",
    tags: ["Racing", "3D", "Browser", "Prototype"],
    playStyle: "Arcade handling, short circuits, and style scoring designed for quick web sessions.",
    controls: ["WASD or arrow keys to drive", "Shift to drift", "Space for handbrake"],
    highlights: ["Coming soon state", "Ready for screenshots and gameplay trailer", "SEO slug and schema prepared"],
    technicalNotes: ["Upload WebGL folder after compression", "Add at least three screenshots before publishing", "Keep first input delay low by loading on click"],
    difficulty: "Hard",
    sessionLength: "4-6 min",
    players: "Solo",
    rating: "4.7",
    accent: "#7A3CFF"
  },
  {
    title: "Pixel Arena",
    slug: "pixel-arena",
    genre: "Action",
    status: "Coming Soon",
    description: "Survive wave-based arena combat with readable attacks, quick upgrades, and compact action loops.",
    cover: "/brand/simple-icon.png",
    tags: ["Action", "Indie", "Arena", "WebGL"],
    playStyle: "Wave survival with simple movement, target priority, and escalating enemy patterns.",
    controls: ["WASD to move", "Mouse to aim", "Left click to attack", "Q for special ability"],
    highlights: ["Great for original development notes", "Supports tags and draft publishing", "Prepared for related articles"],
    technicalNotes: ["Use compressed audio", "Avoid autoplay on initial page load", "Document controls and credits before launch"],
    difficulty: "Medium",
    sessionLength: "5-8 min",
    players: "Solo",
    rating: "4.6",
    accent: "#FF4DDB"
  },
  {
    title: "Orbit Forge",
    slug: "orbit-forge",
    genre: "Puzzle",
    status: "Coming Soon",
    description: "Redirect energy cores through orbital gates, timing fields, and compact mechanical traps.",
    cover: "/icon-512.png",
    tags: ["Puzzle", "Physics", "Sci-Fi", "Browser"],
    playStyle: "Think-first puzzle stages with clean goals, readable level rules, and gradual difficulty.",
    controls: ["Mouse drag to aim", "Release to launch", "Z to undo", "R to reset"],
    highlights: ["Strong tutorial article potential", "AdSense-safe original concept", "Works well with level screenshots"],
    technicalNotes: ["Use deterministic physics settings", "Preload only the first level", "Publish level notes for long-form content"],
    difficulty: "Hard",
    sessionLength: "6-10 min",
    players: "Solo",
    rating: "4.9",
    accent: "#26E6D0"
  },
  {
    title: "Skyline Courier",
    slug: "skyline-courier",
    genre: "Adventure",
    status: "Coming Soon",
    description: "Plan rooftop delivery routes, collect bonus parcels, and move through a stylized night city.",
    cover: "/og-image.png",
    tags: ["Adventure", "Movement", "Stylized", "Web"],
    playStyle: "Exploration and timed routes with light platforming and collectible objectives.",
    controls: ["WASD to move", "Space to jump", "E to interact", "Tab for route map"],
    highlights: ["Suitable for development diary posts", "Readable game overview content", "Future-ready for screenshots"],
    technicalNotes: ["Keep camera motion comfortable", "Use responsive iframe sizing", "Add fallback copy for unsupported devices"],
    difficulty: "Easy",
    sessionLength: "8-12 min",
    players: "Solo",
    rating: "4.5",
    accent: "#00B2FF"
  },
  {
    title: "Mech Yard Tactics",
    slug: "mech-yard-tactics",
    genre: "Strategy",
    status: "Coming Soon",
    description: "Command modular machines in short turn-based missions built for thoughtful browser sessions.",
    cover: "/brand/horizontal-lockup.png",
    tags: ["Strategy", "Tactics", "Mechs", "Turn-Based"],
    playStyle: "Compact tactical turns with ability cooldowns, terrain choices, and mission scoring.",
    controls: ["Click to select units", "Right click to inspect", "Number keys for abilities", "Enter to end turn"],
    highlights: ["High-value original content angle", "Great for guide articles", "Prepared for future published status"],
    technicalNotes: ["Persist saves only after privacy review", "Avoid large first-load asset bundles", "Keep UI readable on tablets"],
    difficulty: "Hard",
    sessionLength: "10-15 min",
    players: "Solo",
    rating: "4.8",
    accent: "#7A3CFF"
  },
  {
    title: "Crystal Depths",
    slug: "crystal-depths",
    genre: "Explorer",
    status: "Published",
    description: "Explore glowing caves, scan crystal clusters, and solve light-path puzzles in a calm WebGL journey.",
    cover: "/brand/gaming.png",
    tags: ["Exploration", "Puzzle", "Atmospheric", "WebGL"],
    playStyle: "Slow exploration with environmental puzzles, collectible lore fragments, and short objective chains.",
    controls: ["WASD to move", "Mouse to look", "E to scan", "F to focus beam"],
    highlights: ["Premium-looking demo entry", "Good fit for 3D art breakdowns", "Supports screenshot-heavy updates"],
    technicalNotes: ["Bake lighting for web performance", "Use occlusion culling where possible", "Keep shader variants low"],
    difficulty: "Easy",
    sessionLength: "12-18 min",
    players: "Solo",
    rating: "4.7",
    accent: "#26E6D0"
  },
  {
    title: "Turbo Tunnels",
    slug: "turbo-tunnels",
    genre: "Reflex",
    status: "Published",
    description: "Fly through rotating tunnel gates, collect charge rings, and keep your speed alive.",
    cover: "/brand/gaming-icon.png",
    tags: ["Reflex", "Arcade", "Speed", "WebGL"],
    playStyle: "Fast reaction-based flying with clear lanes, score multipliers, and rapid restarts.",
    controls: ["Mouse or arrow keys to steer", "Space to boost", "R to retry"],
    highlights: ["Instant-play arcade concept", "Strong thumbnail presence", "Great for leaderboard expansion"],
    technicalNotes: ["Use object pooling for obstacles", "Keep motion blur optional", "Reserve stable iframe height"],
    difficulty: "Hard",
    sessionLength: "2-4 min",
    players: "Solo",
    rating: "4.6",
    accent: "#FF4DDB"
  },
  {
    title: "Astro Harvest",
    slug: "astro-harvest",
    genre: "Casual Sim",
    status: "Coming Soon",
    description: "Grow alien crops on floating platforms, manage energy, and unlock cozy space upgrades.",
    cover: "/icon-192.png",
    tags: ["Casual", "Simulation", "Cozy", "Space"],
    playStyle: "Relaxed resource loops with short harvest timers, upgrades, and visual progress.",
    controls: ["Click to plant", "Drag to harvest", "E to upgrade", "Tab for inventory"],
    highlights: ["Family-friendly content angle", "Strong AdSense-safe topic", "Easy to expand with guides"],
    technicalNotes: ["Avoid forced accounts in phase 1", "Keep timers client-safe", "Store progress only after privacy review"],
    difficulty: "Easy",
    sessionLength: "10-20 min",
    players: "Solo",
    rating: "4.4",
    accent: "#00B2FF"
  },
  {
    title: "Blade Circuit",
    slug: "blade-circuit",
    genre: "Action Platformer",
    status: "Coming Soon",
    description: "Slice through circuit guardians, wall-jump between neon panels, and unlock precision routes.",
    cover: "/brand/simple-icon.png",
    tags: ["Platformer", "Combat", "Neon", "Keyboard"],
    playStyle: "Tight 2.5D action stages with checkpoints, timing windows, and optional challenge medals.",
    controls: ["A/D to move", "Space to jump", "J to attack", "K to dash"],
    highlights: ["Great for controls documentation", "Strong speedrun potential", "Clear progression content"],
    technicalNotes: ["Keep input latency low", "Use fixed timestep movement", "Compress sprite and VFX atlases"],
    difficulty: "Medium",
    sessionLength: "6-9 min",
    players: "Solo",
    rating: "4.8",
    accent: "#7A3CFF"
  },
  {
    title: "Mystic Blocks",
    slug: "mystic-blocks",
    genre: "Match Puzzle",
    status: "Published",
    description: "Match runes, trigger chain reactions, and clear puzzle boards with relaxing magical effects.",
    cover: "/og-image.png",
    tags: ["Puzzle", "Casual", "Match", "Mobile-Friendly"],
    playStyle: "Board-based matching with combos, power tiles, level goals, and short daily-style sessions.",
    controls: ["Click or tap to select", "Drag to swap", "H for hint", "R to restart"],
    highlights: ["Mobile-friendly dummy game", "Easy article tie-ins", "Accessible casual category"],
    technicalNotes: ["Reserve touch target sizes", "Use simple animated transitions", "Avoid layout shifts around board"],
    difficulty: "Easy",
    sessionLength: "3-7 min",
    players: "Solo",
    rating: "4.5",
    accent: "#FF4DDB"
  },
  {
    title: "Rift Defense",
    slug: "rift-defense",
    genre: "Tower Defense",
    status: "Coming Soon",
    description: "Build energy towers, slow rift creatures, and tune upgrade paths across compact strategy maps.",
    cover: "/brand/horizontal-lockup.png",
    tags: ["Defense", "Strategy", "Upgrades", "Sci-Fi"],
    playStyle: "Wave-based defense with readable enemy paths, tower upgrades, and map-specific challenges.",
    controls: ["Click to place towers", "1-4 to select tower type", "Space to start wave", "U to upgrade"],
    highlights: ["Strong monetizable guide topic", "Good internal links to strategy posts", "Ready for future maps"],
    technicalNotes: ["Preload only current map", "Pool enemy objects", "Keep UI legible on tablets"],
    difficulty: "Medium",
    sessionLength: "12-16 min",
    players: "Solo",
    rating: "4.7",
    accent: "#26E6D0"
  }
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
