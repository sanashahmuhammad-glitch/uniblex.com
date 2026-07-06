export const siteConfig = {
  name: "Uniblex",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://uniblex.com").toLowerCase().replace(/\/$/, ""),
  title: "Uniblex - Create, Play, Inspire",
  description: "Discover WebGL browser games, tutorials, and game dev articles. Play instantly, no installs.",
  twitter: "@uniblexhq",
  author: "Mohsin Shah",
  keywords: [
    "Uniblex",
    "WebGL games",
    "free browser games",
    "online games",
    "racing games",
    "arcade games",
    "game development",
    "3D art tutorials"
  ],
  ogImage: "/og-image.png"
};

export function canonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`.toLowerCase();
}

export function pageKeywords(...keywords: string[]) {
  return Array.from(new Set([...siteConfig.keywords, ...keywords.filter(Boolean)]));
}

export const defaultRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1
  }
};

export const defaultAuthors = [{ name: siteConfig.author, url: siteConfig.url }];
