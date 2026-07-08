import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/site/ContactForm";
import { canonicalUrl, defaultAuthors, defaultRobots, pageKeywords, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Uniblex for games, articles, feedback and collaboration.",
  keywords: pageKeywords("contact Uniblex", "game collaboration", "browser game feedback"),
  authors: defaultAuthors,
  robots: defaultRobots,
  alternates: { canonical: canonicalUrl("/contact") },
  openGraph: {
    title: "Contact Uniblex",
    description: "Contact Uniblex for games, articles, feedback and collaboration.",
    url: canonicalUrl("/contact"),
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Contact Uniblex" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    title: "Contact Uniblex",
    description: "Contact Uniblex for games, articles, feedback and collaboration.",
    images: [siteConfig.ogImage]
  }
};

export default function ContactPage() {
  return (
    <main className="container-pad py-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] via-uniblex-card/70 to-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,.22)] md:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,178,255,.18),transparent_30%),radial-gradient(circle_at_85%_14%,rgba(122,60,255,.18),transparent_28%)]" />
          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[.24em] text-uniblex-blue">Contact</p>
            <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Get in Touch</h1>
            <p className="mt-5 leading-8 text-uniblex-gray">
              Send feedback, collaboration notes, game questions, or website support requests. Messages are saved to the Uniblex admin dashboard when Supabase is configured.
            </p>
          </div>
          <div className="relative mt-8 grid gap-4">
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[.045] p-4">
              <Mail className="text-uniblex-blue" />
              <div>
                <h2 className="font-heading text-lg">Email</h2>
                <p className="text-sm text-uniblex-gray">hello.uniblex@gmail.com</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[.045] p-4">
              <MapPin className="text-uniblex-purple" />
              <div>
                <h2 className="font-heading text-lg">Location</h2>
                <p className="text-sm text-uniblex-gray">Lahore, Pakistan</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[.045] p-4">
              <MessageCircle className="text-uniblex-pink" />
              <div>
                <h2 className="font-heading text-lg">Topics</h2>
                <p className="text-sm text-uniblex-gray">Games, 3D art, tutorials, browser content, and platform feedback.</p>
              </div>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </main>
  );
}
