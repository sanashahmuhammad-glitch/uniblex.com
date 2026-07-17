"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { allowedAdminRoles, type AdminProfile } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { AdminUploadPortal } from "@/components/admin/AdminUploadPortal";

type GateState = "checking" | "authorized" | "denied";

export function AdminPortalAccessGate({ r2GameUploadsEnabled }: { r2GameUploadsEnabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) { setState("denied"); setMessage("Supabase is not configured for admin access."); return; }
    let active = true;
    async function verify(userId: string) {
      if (!supabase) return;
      const { data, error } = await supabase.from("admins").select("id,email,display_name,role,is_active").eq("id", userId).eq("is_active", true).in("role", allowedAdminRoles).maybeSingle();
      if (!active) return;
      if (error || !data) { setProfile(null); setMessage("Access denied. Your account is not an active Uniblex owner or admin."); setState("denied"); }
      else { setProfile(data as AdminProfile); setState("authorized"); }
    }
    void supabase.auth.getSession().then(({ data }) => { const nextUser = data.session?.user || null; if (!active) return; setUser(nextUser); if (!nextUser) router.replace("/admin/login"); else void verify(nextUser.id); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { const nextUser = session?.user || null; setUser(nextUser); setProfile(null); if (!nextUser) router.replace("/admin/login"); else { setState("checking"); void verify(nextUser.id); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router]);

  async function signOut() { if (!supabase) return; await supabase.auth.signOut(); router.replace("/admin/login"); }

  if (state === "checking") return <main className="grid min-h-screen place-items-center bg-uniblex-bg"><div className="card p-8 text-uniblex-gray">Checking admin access…</div></main>;
  if (state === "denied" || !profile) return <main className="grid min-h-screen place-items-center bg-uniblex-bg p-4"><section className="card w-full max-w-md p-7"><p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Access denied</p><h1 className="mt-3 font-heading text-3xl text-white">Admin access required</h1><p className="mt-4 text-sm leading-6 text-uniblex-gray">{message}</p>{user ? <button type="button" onClick={() => void signOut()} className="btn-secondary mt-6 w-full">Sign out</button> : null}</section></main>;
  return <AdminUploadPortal adminProfile={profile} r2GameUploadsEnabled={r2GameUploadsEnabled} onSignOut={() => void signOut()} />;
}
