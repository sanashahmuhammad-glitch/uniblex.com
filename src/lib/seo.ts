export const siteConfig = {
  name: "Uniblex",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.uniblex.com").toLowerCase().replace(/\/$/, ""),
  title: "Uniblex - Create - Play - Inspire",
  displayTitle: "Uniblex — Create • Play • Inspire",
  description: "Discover WebGL browser games, tutorials, and game development articles. Play instantly with no downloads.",
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
  return `${siteConfig.url}${normalizedPath}`;
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

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return canonicalUrl(pathOrUrl);
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/android-chrome-512x512.png"),
    founder: { "@type": "Person", name: siteConfig.author },
    sameAs: [
      "https://youtube.com/@uniblex",
      "https://facebook.com/uniblex",
      "https://linkedin.com/company/uniblex",
      "https://instagram.com/uniblexhq"
    ]
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: { "@type": "Organization", name: siteConfig.name },
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalUrl("/games")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
