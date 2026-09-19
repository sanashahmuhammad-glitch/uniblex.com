/** @type {import('next').NextConfig} */
const isPreview = process.env.VERCEL_ENV === "preview";
const supabaseUrl = isPreview ? "https://ddhbmaofuwegdresevur.supabase.co" : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = isPreview ? "sb_publishable_uoqUpQ3OdKtnI6-gKbUmkw_HKifUwYl" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

function exactHttpsOrigins(...values) {
  const origins = new Set();
  for (const item of values.flatMap(value => String(value || "").split(","))) {
    if (!item.trim() || item.includes("*")) continue;
    try {
      const url = new URL(item.trim());
      if (url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) origins.add(url.origin);
    } catch { /* Invalid allowlist entries stay blocked. */ }
  }
  return [...origins];
}

const supabaseOrigin = exactHttpsOrigins(supabaseUrl);
const gameFrameOrigins = exactHttpsOrigins("https://games.uniblex.com", supabaseUrl, process.env.R2_PUBLIC_BASE_URL, process.env.UNIBLEX_GAME_FRAME_ORIGINS);
const hostedWebglFrameOrigins = exactHttpsOrigins("https://uniblex-webgl-assets.sanashahmuhammad.workers.dev");
const adScriptOrigins = exactHttpsOrigins(process.env.UNIBLEX_ADS_SCRIPT_ORIGINS);
const adFrameOrigins = exactHttpsOrigins(process.env.UNIBLEX_ADS_FRAME_ORIGINS);
const adConnectOrigins = exactHttpsOrigins(process.env.UNIBLEX_ADS_CONNECT_ORIGINS);
const adMediaOrigins = exactHttpsOrigins(process.env.UNIBLEX_ADS_MEDIA_ORIGINS);
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com ${adScriptOrigins.join(" ")}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com ${gameFrameOrigins.join(" ")} ${adMediaOrigins.join(" ")}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com ${supabaseOrigin.join(" ")} ${gameFrameOrigins.join(" ")} ${adConnectOrigins.join(" ")}`.trim(),
  `frame-src 'self' ${gameFrameOrigins.join(" ")} ${hostedWebglFrameOrigins.join(" ")} ${adFrameOrigins.join(" ")}`.trim(),
  `media-src 'self' blob: ${gameFrameOrigins.join(" ")} ${adMediaOrigins.join(" ")}`.trim(),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

if (process.env.VERCEL_ENV === "production" && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "Missing required Vercel Production environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*.js.br",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Content-Encoding", value: "br" }
        ]
      },
      {
        source: "/:path*.wasm.br",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Content-Encoding", value: "br" }
        ]
      },
      {
        source: "/:path*.data.br",
        headers: [
          { key: "Content-Type", value: "application/octet-stream" },
          { key: "Content-Encoding", value: "br" }
        ]
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};
export default nextConfig;
