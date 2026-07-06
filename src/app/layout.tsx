import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalUrl, defaultAuthors, defaultRobots, siteConfig } from "@/lib/seo";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
const exo = Exo_2({ subsets: ["latin"], variable: "--font-exo", display: "swap" });

const siteUrl = siteConfig.url;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uniblex - Create, Play, Inspire",
    template: "%s | Uniblex"
  },
  description: "Discover WebGL browser games, tutorials, and game dev articles. Play instantly, no installs.",
  keywords: siteConfig.keywords,
  authors: defaultAuthors,
  creator: siteConfig.author,
  publisher: siteConfig.name,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "Uniblex - Browser Games & Game Dev Content",
    description: "Play WebGL games instantly. Read game dev tutorials and articles by Mohsin Shah.",
    url: siteUrl,
    siteName: "Uniblex",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Uniblex browser games and game development content" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: "@uniblexhq",
    creator: "@uniblexhq",
    title: "Uniblex - Create, Play, Inspire",
    description: "Discover WebGL browser games, tutorials, and game dev articles.",
    images: [siteConfig.ogImage]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${orbitron.variable} ${exo.variable}`}>
      <body>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.name,
          url: siteUrl,
          logo: canonicalUrl("/icon-512.png"),
          founder: { "@type": "Person", name: siteConfig.author },
          sameAs: [
            "https://youtube.com/@uniblex",
            "https://facebook.com/uniblex",
            "https://linkedin.com/company/uniblex",
            "https://instagram.com/uniblexhq"
          ]
        }} />
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteUrl,
          description: siteConfig.description,
          publisher: { "@type": "Organization", name: siteConfig.name }
        }} />
        {children}
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
