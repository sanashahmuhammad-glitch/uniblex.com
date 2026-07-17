"use client";

import Image from "next/image";
import { BookOpen, Gamepad2, History, LayoutDashboard, LogOut, Menu, UploadCloud, X } from "lucide-react";
import type { AdminPortalSection } from "@/components/admin/adminUploadLogic";

const navigation = [
  { id: "games", label: "Dashboard / My Games", icon: LayoutDashboard },
  { id: "submit", label: "Submit Game", icon: UploadCloud },
  { id: "history", label: "Upload History", icon: History },
  { id: "guidelines", label: "Documentation", icon: BookOpen }
] as const;

type AdminPortalSidebarProps = {
  activeSection: AdminPortalSection;
  adminLabel: string;
  mobileOpen: boolean;
  onClose: () => void;
  onNavigate: (section: AdminPortalSection) => void;
  onSignOut: () => void;
};

export function AdminPortalMobileHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-uniblex-bg/95 px-4 backdrop-blur lg:hidden">
      <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={150} height={38} className="h-8 w-auto object-contain" priority />
      <button type="button" onClick={onOpen} className="rounded-lg border border-white/10 p-2 text-white focus:outline-none focus:ring-2 focus:ring-uniblex-blue" aria-label="Open admin navigation">
        <Menu size={22} />
      </button>
    </header>
  );
}

export function AdminPortalSidebar({ activeSection, adminLabel, mobileOpen, onClose, onNavigate, onSignOut }: AdminPortalSidebarProps) {
  return (
    <>
      {mobileOpen ? <button className="fixed inset-0 z-40 bg-black/70 lg:hidden" aria-label="Close admin navigation" onClick={onClose} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-white/10 bg-[#0a0e14] p-5 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Image src="/brand/horizontal-lockup.png" alt="Uniblex" width={178} height={44} className="h-10 w-auto object-contain" priority />
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-uniblex-gray hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close admin navigation"><X size={20} /></button>
        </div>
        <div className="mt-7 rounded-xl border border-uniblex-blue/20 bg-uniblex-blue/[.06] p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-uniblex-blue to-uniblex-purple text-white"><Gamepad2 size={20} /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{adminLabel}</p>
              <p className="text-xs text-uniblex-gray">Uniblex game publishing</p>
            </div>
          </div>
        </div>
        <nav className="mt-7 grid gap-2" aria-label="Admin portal">
          {navigation.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button key={id} type="button" onClick={() => { onNavigate(id); onClose(); }} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-uniblex-blue ${active ? "bg-gradient-to-r from-uniblex-blue/15 to-uniblex-purple/10 text-white ring-1 ring-uniblex-blue/30" : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"}`}>
                <Icon size={19} className={active ? "text-uniblex-blue" : ""} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <button type="button" onClick={onSignOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-uniblex-gray transition hover:bg-red-500/10 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
