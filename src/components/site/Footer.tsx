import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { AuthAwareDeveloperLink } from "@/components/developers/AuthAwareDeveloperLink";

const quickLinks = [
  ["Home", "/"],
  ["Games", "/games"],
  ["Blog", "/blog"],
  ["About", "/about"],
  ["Contact", "/contact"]
];

const socials = [
  { href: "https://youtube.com/@uniblex", label: "YouTube", icon: Youtube },
  { href: "https://facebook.com/uniblex", label: "Facebook", icon: Facebook },
  { href: "https://linkedin.com/company/uniblex", label: "LinkedIn", icon: Linkedin },
  { href: "https://instagram.com/uniblexhq", label: "Instagram", icon: Instagram }
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#070b13]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(0,178,255,.14),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(122,60,255,.16),transparent_28%)]" />
      <div className="container-pad relative grid gap-10 py-12 lg:grid-cols-[1.4fr_.8fr_.8fr_1fr]">
        <div>
          <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={230} height={60} className="mb-5 h-auto w-[210px]" />
          <p className="max-w-md text-sm leading-7 text-uniblex-gray">
            Browser games, game development knowledge, 3D art tutorials, and creator-focused articles by Mohsin Shah.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-uniblex-blue/25 bg-uniblex-blue/10 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-uniblex-blue">
            Dark WebGL Gaming Hub
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-lg">Quick Links</h3>
          <div className="grid gap-2 text-sm text-uniblex-gray">
            {quickLinks.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-uniblex-blue">{label}</Link>)}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-lg">Resources</h3>
          <div className="grid gap-2 text-sm text-uniblex-gray">
            <Link href="/blog" className="transition hover:text-uniblex-blue">Articles</Link>
            <Link href="/blog/practical-pipeline-for-webgl-build-uploads" className="transition hover:text-uniblex-blue">Tutorials</Link>
            <Link href="/games" className="transition hover:text-uniblex-blue">Game Library</Link>
            <Link href="/developers" className="transition hover:text-uniblex-blue">Developer Portal</Link>
            <Link href="/developers/login" className="transition hover:text-uniblex-blue">Developer Login</Link>
            <AuthAwareDeveloperLink guestHref="/developers/register" authenticatedHref="/developers/games/new" className="transition hover:text-uniblex-blue">
              Submit a Game
            </AuthAwareDeveloperLink>
            <Link href="/privacy-policy" className="transition hover:text-uniblex-blue">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition hover:text-uniblex-blue">Terms</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-lg">Connect</h3>
          <div className="flex flex-wrap gap-3">
            {socials.map((social) => (
              <a key={social.href} href={social.href} aria-label={social.label} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[.045] text-uniblex-gray shadow-[0_12px_30px_rgba(0,0,0,.18)] transition hover:border-uniblex-blue hover:bg-uniblex-blue/10 hover:text-uniblex-blue">
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-5 text-center text-xs text-uniblex-gray">
        Copyright {new Date().getFullYear()} Uniblex. All rights reserved.
      </div>
    </footer>
  );
}
