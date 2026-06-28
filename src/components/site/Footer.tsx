import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

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
    <footer className="border-t border-uniblex-border bg-uniblex-card/40">
      <div className="container-pad grid gap-10 py-12 lg:grid-cols-[1.4fr_.8fr_.8fr_1fr]">
        <div>
          <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={230} height={60} className="mb-5 h-auto w-[210px]" />
          <p className="max-w-md text-sm leading-7 text-uniblex-gray">
            Browser games, game development knowledge, 3D art tutorials, and creator-focused articles by Mohsin Shah.
          </p>
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
            <Link href="/privacy-policy" className="transition hover:text-uniblex-blue">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition hover:text-uniblex-blue">Terms</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-lg">Connect</h3>
          <div className="flex flex-wrap gap-3">
            {socials.map((social) => (
              <a key={social.href} href={social.href} aria-label={social.label} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-lg border border-uniblex-border bg-white/[.03] text-uniblex-gray transition hover:border-uniblex-blue hover:text-uniblex-blue">
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-uniblex-border py-5 text-center text-xs text-uniblex-gray">
        Copyright {new Date().getFullYear()} Uniblex. All rights reserved.
      </div>
    </footer>
  );
}
