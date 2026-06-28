import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-uniblex-border bg-uniblex-card/50">
      <div className="container-pad grid gap-10 py-12 md:grid-cols-[1.4fr_.8fr_.8fr]">
        <div>
          <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={220} height={55} className="mb-4 h-auto w-[220px]" />
          <p className="max-w-md text-sm leading-6 text-uniblex-gray">
            Create • Play • Inspire. Built for gamers, inspired by creators, and driven by passion.
          </p>
        </div>
        <div>
          <h3 className="mb-4 font-heading text-lg">Explore</h3>
          <div className="grid gap-2 text-sm text-uniblex-gray">
            <Link href="/games">Games</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-heading text-lg">Legal</h3>
          <div className="grid gap-2 text-sm text-uniblex-gray">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-uniblex-border py-5 text-center text-xs text-uniblex-gray">
        © {new Date().getFullYear()} Uniblex. All rights reserved.
      </div>
    </footer>
  );
}
