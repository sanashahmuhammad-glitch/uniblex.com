"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PUBLIC_PORTAL_NAV } from "@/lib/developerPortal";
import { supabase } from "@/lib/supabase";

export function DeveloperHeader() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let active = true;
    void supabase?.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user || null); });
    const listener = supabase?.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { active = false; listener?.data.subscription.unsubscribe(); };
  }, []);
  const accountLabel = String(user?.user_metadata?.studio_name || user?.user_metadata?.display_name || user?.email || "Developer account");
  async function signOut() { await supabase?.auth.signOut(); setOpen(false); }
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D1118]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue" aria-label="Uniblex home">
          <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={600} height={150} className="h-11 w-auto object-contain sm:h-12" priority />
          <span className="hidden border-l border-white/15 py-1 pl-4 text-[11px] font-extrabold uppercase leading-[1.15] tracking-[.16em] text-white transition group-hover:text-uniblex-blue sm:block">Developer<br />Portal</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex" aria-label="Developer resources">
          {PUBLIC_PORTAL_NAV.map((item) => <Link key={item.href} href={item.href} className="text-sm font-semibold text-uniblex-gray transition hover:text-white">{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {user ? <><Link href="/developers/dashboard" className="btn-secondary !min-h-10 !px-4 !py-2 text-sm"><LayoutDashboard size={16} />Dashboard</Link><Link href="/developers/profile" title={accountLabel} className="btn-primary !min-h-10 !max-w-52 !px-4 !py-2 text-sm"><UserRound size={16} /><span className="truncate">{accountLabel}</span></Link><button type="button" onClick={() => void signOut()} className="rounded-xl border border-white/10 p-2.5 text-uniblex-gray transition hover:text-white" aria-label="Log out"><LogOut size={17} /></button></> : <><Link href="/developers/login" className="btn-secondary !min-h-10 !px-4 !py-2 text-sm">Log in</Link><Link href="/developers/register" className="btn-primary !min-h-10 !px-4 !py-2 text-sm">Create account</Link></>}
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-white/10 p-2.5 text-white sm:hidden" aria-expanded={open} aria-label="Toggle developer navigation">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open ? (
        <nav className="grid gap-1 border-t border-white/10 bg-[#0b0f16] p-4 sm:hidden" aria-label="Mobile developer resources">
          {PUBLIC_PORTAL_NAV.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-uniblex-gray hover:bg-white/5 hover:text-white">{item.label}</Link>)}
          {user ? <div className="mt-2 grid gap-2"><Link href="/developers/dashboard" onClick={() => setOpen(false)} className="btn-secondary !px-3 text-sm"><LayoutDashboard size={16} />Dashboard</Link><Link href="/developers/profile" onClick={() => setOpen(false)} className="btn-primary !px-3 text-sm"><UserRound size={16} /><span className="truncate">{accountLabel}</span></Link><button type="button" onClick={() => void signOut()} className="btn-secondary !px-3 text-sm"><LogOut size={16} />Log out</button></div> : <div className="mt-2 grid grid-cols-2 gap-2"><Link href="/developers/login" className="btn-secondary !px-3 text-sm">Log in</Link><Link href="/developers/register" className="btn-primary !px-3 text-sm">Create account</Link></div>}
        </nav>
      ) : null}
    </header>
  );
}

export function DeveloperFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-heading text-lg text-white">Build remarkable browser games.</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-uniblex-gray">Original tools, clear quality standards, and a controlled path from draft to publication.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-uniblex-gray">
          <Link href="/developers/docs">Docs</Link>
          <Link href="/developers/support">Support</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms-of-service">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

