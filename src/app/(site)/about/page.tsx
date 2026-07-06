import type { Metadata } from "next";
import Image from "next/image";
import { Brush, Gamepad2, Sparkles } from "lucide-react";
import { canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Uniblex, a WebGL games and game development content platform by Mohsin Shah.",
  keywords: pageKeywords("about Uniblex", "Mohsin Shah", "WebGL game platform"),
  authors: defaultAuthors,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/about") },
  openGraph: {
    title: "About Uniblex",
    description: "Learn about Uniblex, a WebGL games and game development content platform by Mohsin Shah.",
    url: canonicalUrl("/about"),
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "About Uniblex" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    title: "About Uniblex",
    description: "Learn about Uniblex, a WebGL games and game development content platform by Mohsin Shah.",
    images: [siteConfig.ogImage]
  }
};

export default function AboutPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <section className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div className="relative aspect-square max-w-[420px] overflow-hidden rounded-lg border border-uniblex-border bg-white/[.03] p-8">
          <Image src="/brand/main-logo.png" alt="Uniblex logo" fill className="object-contain p-8" priority />
        </div>
        <div>
          <p className="text-uniblex-blue">About Uniblex</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Built for Gamers. Inspired by Creators.</h1>
          <p className="mt-6 text-lg leading-8 text-uniblex-gray">
            Uniblex is a game showcase and content platform focused on WebGL browser games, game development articles, 3D art tutorials, and creator-driven learning. It is built by Mohsin Shah, a Senior 3D Modeler and Game Developer from Lahore, Pakistan.
          </p>
          <p className="mt-4 leading-8 text-uniblex-gray">
            The mission is simple: make playable browser experiences easier to discover, while sharing practical production knowledge for artists and developers who want to build better real-time content.
          </p>
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { icon: Gamepad2, title: "Play", text: "Instant browser games with clear controls, fast pages, and no installation barrier." },
          { icon: Brush, title: "Create", text: "3D art and game production articles based on real workflow decisions." },
          { icon: Sparkles, title: "Inspire", text: "A polished creator platform designed to grow into a trusted content hub." }
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-uniblex-border bg-white/[.03] p-6">
            <item.icon className="mb-4 text-uniblex-blue" size={32} />
            <h2 className="font-heading text-2xl">{item.title}</h2>
            <p className="mt-3 leading-7 text-uniblex-gray">{item.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
