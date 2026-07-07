import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import Script from "next/script";
import { JsonLd } from "@/components/seo/JsonLd";
import { canonicalUrl, defaultAuthors, defaultRobots, organizationJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
const exo = Exo_2({ subsets: ["latin"], variable: "--font-exo", display: "swap" });

const siteUrl = siteConfig.url;
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingSiteVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.displayTitle,
    template: "%s | Uniblex"
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: defaultAuthors,
  creator: siteConfig.author,
  publisher: siteConfig.name,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: siteConfig.displayTitle,
    description: siteConfig.description,
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
    title: siteConfig.displayTitle,
    description: siteConfig.description,
    images: [siteConfig.ogImage]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
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
  manifest: "/manifest.webmanifest",
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(bingSiteVerification ? { other: { "msvalidate.01": bingSiteVerification } } : {})
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${orbitron.variable} ${exo.variable}`}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        {children}
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
