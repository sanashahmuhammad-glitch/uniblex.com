"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Menu, X } from "lucide-react";
import { useState } from "react";
import { AuthorizedAdminLink } from "@/components/admin/AuthorizedAdminLink";
import { AuthAwareDeveloperLink } from "@/components/developers/AuthAwareDeveloperLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/developers", label: "Developers", authAware: true },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-uniblex-blue/20 bg-[#060a12]/88 shadow-[0_14px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
      <div className="hidden border-b border-white/10 bg-white/[.035] py-1.5 text-center text-[11px] font-black uppercase tracking-[.24em] text-uniblex-blue md:block">
        Uniblex Arena | Free WebGL Games | Creator Articles
      </div>
      <div className="container-pad flex h-14 items-center justify-between gap-4 md:h-[74px]">
        <Link href="/" className="group flex min-w-0 items-center" aria-label="Uniblex home">
          <Image
            src="/brand/horizontal-lockup.png"
            alt="Uniblex"
            width={220}
            height={56}
            priority
            className="h-auto w-[132px] object-contain transition group-hover:scale-[1.02] sm:w-[175px] md:w-[205px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.05] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] lg:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            const className = `rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue ${
              active
                ? "bg-gradient-to-r from-uniblex-blue to-uniblex-purple text-white shadow-[0_10px_28px_rgba(0,178,255,.2)]"
                : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"
            }`;
            return link.authAware ? (
              <AuthAwareDeveloperLink
                key={link.href}
                guestHref="/developers"
                authenticatedHref="/developers/dashboard"
                className={className}
              >
                {link.label}
              </AuthAwareDeveloperLink>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <AuthorizedAdminLink />
          <Link href="/games" className="hidden min-h-[42px] items-center justify-center gap-2 rounded-lg bg-uniblex-blue px-4 py-2 text-sm font-black text-white shadow-[0_14px_32px_rgba(0,178,255,.22)] transition hover:bg-uniblex-purple lg:inline-flex">
            <Gamepad2 size={17} /> Play Now
          </Link>
          <button
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[.055] text-white shadow-[0_10px_24px_rgba(0,0,0,.2)] transition hover:border-uniblex-blue lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden border-t border-uniblex-blue/20 bg-[#060a12]/98 backdrop-blur-xl transition-all duration-300 lg:hidden ${open ? "max-h-[460px] opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="container-pad grid gap-2 py-3">
          {links.map((link) => {
            const className = `rounded-lg px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue ${isActive(link.href) ? "bg-gradient-to-r from-uniblex-blue to-uniblex-purple text-white" : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"}`;
            return link.authAware ? (
              <AuthAwareDeveloperLink
                key={link.href}
                guestHref="/developers"
                authenticatedHref="/developers/dashboard"
                onClick={() => setOpen(false)}
                className={className}
              >
                {link.label}
              </AuthAwareDeveloperLink>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={className}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/games" onClick={() => setOpen(false)} className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-uniblex-blue px-4 py-3 text-sm font-black text-white">
            <Gamepad2 size={17} /> Play Now
          </Link>
          <AuthorizedAdminLink mobile onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </header>
  );
}
