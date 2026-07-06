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
    icon: ["/favicon.png", "/favicon-16.png"],
    apple: "/apple-touch-icon.png"
  }
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
