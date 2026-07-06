"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AuthorizedAdminLink } from "@/components/admin/AuthorizedAdminLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-uniblex-border/80 bg-uniblex-bg/78 shadow-[0_10px_40px_rgba(0,0,0,.25)] backdrop-blur-xl">
      <div className="container-pad flex h-16 items-center justify-between gap-5 md:h-[86px]">
        <Link href="/" className="group flex min-w-0 items-center" aria-label="Uniblex home">
          <Image
            src="/brand/horizontal-lockup.png"
            alt="Uniblex"
            width={220}
            height={56}
            priority
            className="h-auto w-[150px] object-contain transition group-hover:scale-[1.02] sm:w-[175px] md:w-[205px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-uniblex-border/40 bg-white/[.02] p-1 md:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-gradient-to-r from-uniblex-blue/20 to-uniblex-purple/20 text-white ring-1 ring-uniblex-blue/40"
                    : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <AuthorizedAdminLink />
          <button
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-uniblex-border bg-white/[.03] text-white transition hover:border-uniblex-blue md:hidden"
            aria-label="Toggle navigation menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden border-t border-uniblex-border/70 bg-uniblex-bg/95 backdrop-blur-xl transition-all duration-300 md:hidden ${open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="container-pad grid gap-2 py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${isActive(link.href) ? "bg-uniblex-blue/10 text-uniblex-blue" : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"}`}
            >
              {link.label}
            </Link>
          ))}
          <AuthorizedAdminLink mobile onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </header>
  );
}
