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
  viewCount?: number | null;
  playCount?: number | null;
};

const cover = "/cards/game-cover-sprite.png";

export const games: Game[] = [
  {
    title: "Neon Runner",
    slug: "neon-runner",
    genre: "Arcade Runner",
    status: "Published",
    description: "A cyberpunk sprint game where a neon armored runner dodges traffic beams, glass bridges, and speed gates.",
    cover,
    iframeUrl: "https://uniblex.com/game-builds/neon-runner/index.html",
    tags: ["Runner", "Cyberpunk", "Reflex", "WebGL"],
    playStyle: "Short high-speed runs with lane switching, jumps, boost pads, and instant retries.",
    controls: ["A/D or arrows to switch lanes", "Space to jump", "Shift to boost", "R to restart"],
    highlights: ["Strong hero thumbnail", "Instant arcade gameplay", "Great for high-score expansion"],
    technicalNotes: ["Lazy load player after click", "Use pooled obstacles", "Keep first level under 100MB"],
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
    status: "Published",
    description: "A glossy night racing game with yellow supercars, wet cyber streets, drift boosts, and neon checkpoints.",
    cover,
    tags: ["Racing", "Cars", "Drift", "3D"],
    playStyle: "Arcade handling with short circuits, drift scoring, boost timing, and replayable lap goals.",
    controls: ["WASD or arrows to drive", "Shift to drift", "Space for handbrake", "C to change camera"],
    highlights: ["Looks like a real racing game card", "Clear genre at first glance", "Ready for car screenshots and upgrades"],
    technicalNotes: ["Compress vehicle textures", "Use baked reflections", "Keep camera motion comfortable"],
    difficulty: "Hard",
    sessionLength: "4-6 min",
    players: "Solo",
    rating: "4.7",
    accent: "#7A3CFF"
  },
  {
    title: "Moto Rider 3D Bike Race Game",
    slug: "moto-rider-3d-bike-race-game",
    genre: "Racing",
    status: "Published",
    description: "Ride powerful motorcycles, complete exciting racing challenges, unlock new bikes, and become the ultimate bike racing champion in this realistic 3D WebGL racing game.",
    cover,
    iframeUrl: "/games/moto-rider-3d-bike-race-game-webgl-v2/index.html",
    tags: ["WebGL", "Racing", "Bike", "Motorcycle", "3D", "Driving", "Arcade"],
    playStyle: "Fast 3D motorcycle racing with road challenges, bike handling, rewards, and quick replayable sessions.",
    controls: ["WASD or Arrow Keys to control the bike", "Space for brake or action", "Mouse to select menus"],
    highlights: ["Playable from Cloudflare R2", "Lazy loaded WebGL iframe", "Bike racing experience with no install"],
    technicalNotes: ["External iframe URL is saved in Supabase metadata.", "The R2-hosted WebGL build loads only after Play Now."],
    difficulty: "Medium",
    sessionLength: "5-10 min",
    players: "Solo",
    rating: "4.8",
    accent: "#00B2FF"
  },
  {
    title: "Neon Ops FPS",
    slug: "neon-ops-fps",
    genre: "FPS Shooter",
    status: "Coming Soon",
    description: "A tactical first-person shooter concept set in rainy neon alleys with sci-fi armor and compact missions.",
    cover,
    tags: ["FPS", "Shooter", "Tactical", "Cyberpunk"],
    playStyle: "Mission-based shooting with cover routes, scanner objectives, limited ammo, and fast extraction goals.",
    controls: ["WASD to move", "Mouse to aim", "Left click to fire", "R to reload"],
    highlights: ["FPS card instantly reads as shooter", "Client-demo friendly genre variety", "Prepared for future mission pages"],
    technicalNotes: ["Avoid heavy post-processing on mobile", "Keep enemy AI lightweight", "Add content rating notes before launch"],
    difficulty: "Hard",
    sessionLength: "6-9 min",
    players: "Solo",
    rating: "4.9",
    accent: "#00B2FF"
  },
  {
    title: "Metro Vice Chase",
    slug: "metro-vice-chase",
    genre: "Open World",
    status: "Coming Soon",
    description: "A GTA-style city chase concept with police lights, helicopters, sports cars, and open-world mission energy.",
    cover,
    tags: ["Open World", "City", "Chase", "Driving"],
    playStyle: "Drive through neon districts, avoid patrols, collect mission markers, and survive cinematic pursuits.",
    controls: ["WASD to drive", "Shift for nitro", "E to interact", "M for city map"],
    highlights: ["Open-world style thumbnail", "Strong client presentation value", "Supports mission/blog content later"],
    technicalNotes: ["Stream city chunks carefully", "Use low-cost traffic AI", "Keep map UI responsive"],
    difficulty: "Medium",
    sessionLength: "8-12 min",
    players: "Solo",
    rating: "4.8",
    accent: "#FF4DDB"
  },
  {
    title: "Pixel Arena",
    slug: "pixel-arena",
    genre: "Action Arena",
    status: "Published",
    description: "A stylized arena combat game where blocky heroes fight waves of dungeon enemies with glowing weapons.",
    cover,
    tags: ["Action", "Arena", "Indie", "Combat"],
    playStyle: "Wave survival with movement, target priority, upgrades, and escalating enemy patterns.",
    controls: ["WASD to move", "Mouse to aim", "Left click to attack", "Q for special ability"],
    highlights: ["Reads as combat immediately", "Good fantasy/action category", "Expandable with power-up guides"],
    technicalNotes: ["Use compressed audio", "Avoid autoplay on initial load", "Document controls and credits"],
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
    status: "Published",
    description: "A premium sci-fi puzzle game about aligning glowing energy cores, orbit rings, and color circuits.",
    cover,
    tags: ["Puzzle", "Physics", "Sci-Fi", "Logic"],
    playStyle: "Think-first puzzle stages with clean goals, readable rules, and gradual complexity.",
    controls: ["Mouse drag to aim", "Release to launch", "Z to undo", "R to reset"],
    highlights: ["High-quality puzzle thumbnail", "AdSense-safe original concept", "Works well with level articles"],
    technicalNotes: ["Use deterministic physics", "Preload only first level", "Publish level notes for long-form content"],
    difficulty: "Hard",
    sessionLength: "6-10 min",
    players: "Solo",
    rating: "4.9",
    accent: "#26E6D0"
  },
  {
    title: "Skyline Courier",
    slug: "skyline-courier",
    genre: "Parkour",
    status: "Coming Soon",
    description: "A rooftop parkour game with neon city jumps, delivery routes, wall runs, and time-trial objectives.",
    cover,
    tags: ["Parkour", "Adventure", "Movement", "City"],
    playStyle: "Exploration and timed routes with light platforming and collectible objectives.",
    controls: ["WASD to move", "Space to jump", "E to interact", "Tab for route map"],
    highlights: ["Clearly reads as rooftop action", "Great for movement gameplay", "Ready for route challenge articles"],
    technicalNotes: ["Keep camera motion comfortable", "Use responsive iframe sizing", "Add unsupported-device fallback copy"],
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
    description: "A turn-based mech tactics game with industrial battlefields, squad commands, and modular upgrades.",
    cover,
    tags: ["Strategy", "Mechs", "Turn-Based", "Tactics"],
    playStyle: "Compact tactical turns with ability cooldowns, terrain choices, and mission scoring.",
    controls: ["Click to select units", "Right click to inspect", "Number keys for abilities", "Enter to end turn"],
    highlights: ["Big mech thumbnail sells genre", "Good for guide content", "Prepared for future campaign maps"],
    technicalNotes: ["Avoid large first-load bundles", "Keep UI readable on tablets", "Persist saves only after privacy review"],
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
    description: "A glowing cave exploration game with crystal mining, scanner tools, and atmospheric discovery.",
    cover,
    tags: ["Exploration", "Cave", "3D", "Atmospheric"],
    playStyle: "Slow exploration with environmental puzzles, collectible lore fragments, and short objective chains.",
    controls: ["WASD to move", "Mouse to look", "E to scan", "F to focus beam"],
    highlights: ["Premium adventure thumbnail", "Good fit for 3D art breakdowns", "Supports screenshot-heavy updates"],
    technicalNotes: ["Bake lighting for web performance", "Use occlusion culling", "Keep shader variants low"],
    difficulty: "Easy",
    sessionLength: "12-18 min",
    players: "Solo",
    rating: "4.7",
    accent: "#26E6D0"
  },
  {
    title: "Turbo Tunnels",
    slug: "turbo-tunnels",
    genre: "Space Racing",
    status: "Published",
    description: "A spaceship speed game where players fly through neon tunnel rings and avoid high-speed barriers.",
    cover,
    tags: ["Space", "Speed", "Arcade", "Reflex"],
    playStyle: "Fast reaction-based flying with clear lanes, score multipliers, and rapid restarts.",
    controls: ["Mouse or arrows to steer", "Space to boost", "R to retry"],
    highlights: ["Instantly reads as sci-fi racer", "Strong arcade loop", "Great for leaderboard expansion"],
    technicalNotes: ["Use object pooling", "Keep motion blur optional", "Reserve stable iframe height"],
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
    description: "A cozy alien farming game with space crops, dome gardens, cute workers, and upgrade loops.",
    cover,
    tags: ["Casual", "Simulation", "Cozy", "Space"],
    playStyle: "Relaxed resource loops with short harvest timers, upgrades, and visual progress.",
    controls: ["Click to plant", "Drag to harvest", "E to upgrade", "Tab for inventory"],
    highlights: ["Clear casual game thumbnail", "Family-friendly content angle", "Easy to expand with guides"],
    technicalNotes: ["Avoid forced accounts in phase 1", "Keep timers client-safe", "Store progress only after privacy review"],
    difficulty: "Easy",
    sessionLength: "10-20 min",
    players: "Solo",
    rating: "4.4",
    accent: "#00B2FF"
  },
  {
    title: "Rift Defense",
    slug: "rift-defense",
    genre: "Tower Defense",
    status: "Coming Soon",
    description: "A tower defense game with energy turrets, monster rifts, upgrade lanes, and tactical wave control.",
    cover,
    tags: ["Defense", "Strategy", "Turrets", "Sci-Fi"],
    playStyle: "Wave-based defense with readable enemy paths, tower upgrades, and map-specific challenges.",
    controls: ["Click to place towers", "1-4 to select tower type", "Space to start wave", "U to upgrade"],
    highlights: ["Looks like a real defense game", "Strong monetizable guide topic", "Ready for future maps"],
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
