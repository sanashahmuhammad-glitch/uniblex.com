"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { allowedAdminRoles } from "@/lib/adminAuth";

type AuthorizedAdminLinkProps = {
  mobile?: boolean;
  onNavigate?: () => void;
  variant?: "nav" | "cta";
};

export function AuthorizedAdminLink({ mobile = false, onNavigate, variant = "nav" }: AuthorizedAdminLinkProps) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function verify() {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        if (active) setAuthorized(false);
        return;
      }

      const { data } = await supabase
        .from("admins")
        .select("id")
        .eq("id", userId)
        .eq("is_active", true)
        .in("role", allowedAdminRoles)
        .maybeSingle();

      if (active) setAuthorized(Boolean(data));
    }

    void verify();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void verify();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!authorized) return null;

  if (variant === "cta") {
    return (
      <Link href="/admin" onClick={onNavigate} className="btn-primary shrink-0">
        <UserRound size={18} /> Open Admin
      </Link>
    );
  }

  if (mobile) {
    return (
      <Link href="/admin" onClick={onNavigate} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-uniblex-purple/40 px-4 py-2 text-sm font-bold text-white">
        <UserRound size={16} /> Admin Panel
      </Link>
    );
  }

  return (
    <Link href="/admin" className="hidden items-center gap-2 rounded-full border border-uniblex-purple/40 bg-uniblex-purple/5 px-5 py-2 text-sm font-bold text-white transition hover:border-uniblex-blue hover:text-uniblex-blue md:inline-flex">
      <UserRound size={16} /> Admin
    </Link>
  );
}
