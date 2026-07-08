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
    <main className="container-pad py-8 md:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/70 to-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] md:p-8 lg:grid lg:grid-cols-[.75fr_1.25fr] lg:items-center lg:gap-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,178,255,.18),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(122,60,255,.18),transparent_28%)]" />
        <div className="relative aspect-square max-w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-8 shadow-[0_24px_80px_rgba(0,178,255,.12)]">
          <Image src="/brand/main-logo.png" alt="Uniblex logo" fill className="object-contain p-8" priority />
        </div>
        <div className="relative mt-7 lg:mt-0">
          <p className="text-sm font-black uppercase tracking-[.24em] text-uniblex-blue">About Uniblex</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-6xl">Built for Gamers. Inspired by Creators.</h1>
          <p className="mt-5 text-base leading-7 text-uniblex-gray md:text-lg md:leading-8">
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
          <div key={item.title} className="rounded-xl border border-white/10 bg-white/[.045] p-6 shadow-[0_18px_70px_rgba(0,0,0,.18)] backdrop-blur">
            <item.icon className="mb-4 text-uniblex-blue" size={32} />
            <h2 className="font-heading text-2xl">{item.title}</h2>
            <p className="mt-3 leading-7 text-uniblex-gray">{item.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
