import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const exo = Exo_2({ subsets: ["latin"], variable: "--font-exo" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uniblex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uniblex — Create • Play • Inspire",
    template: "%s | Uniblex"
  },
  description: "Discover WebGL browser games, tutorials, and game dev articles. Play instantly, no installs.",
  openGraph: {
    title: "Uniblex — Browser Games & Game Dev Content",
    description: "Play WebGL games instantly. Read game dev tutorials and articles by Mohsin Shah.",
    url: siteUrl,
    siteName: "Uniblex",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: "@uniblexhq",
    title: "Uniblex — Create • Play • Inspire",
    description: "Discover WebGL browser games, tutorials, and game dev articles."
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
      <body>{children}</body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
