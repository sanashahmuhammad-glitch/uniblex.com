"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AdminProfile } from "@/lib/adminAuth";
import { allowedAdminRoles } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";

type GateState = "checking" | "authorized" | "denied";

export function AdminAccessGate() {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setState("denied");
      setMessage("Supabase is not configured for admin access.");
      return;
    }

    let active = true;

    async function verifyCurrentSession() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;

      if (!active) return;
      setUser(sessionUser);

      if (!sessionUser) {
        router.replace("/admin/login");
        return;
      }

      await verifyAdmin(sessionUser.id);
    }

    async function verifyAdmin(userId: string) {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("admins")
        .select("id,email,display_name,role,is_active")
        .eq("id", userId)
        .eq("is_active", true)
        .in("role", allowedAdminRoles)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setAdminProfile(null);
        setMessage("Access denied. Your signed-in account is not an active Uniblex owner or admin.");
        setState("denied");
        return;
      }

      setAdminProfile(data as AdminProfile);
      setMessage("");
      setState("authorized");
    }

    void verifyCurrentSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setAdminProfile(null);

      if (!sessionUser) {
        router.replace("/admin/login");
        return;
      }

      setState("checking");
      void verifyAdmin(sessionUser.id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (state === "checking") {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <div className="card p-8 text-uniblex-gray">Checking admin access...</div>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <section className="card w-full max-w-md p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Access Denied</p>
          <h1 className="mt-3 font-heading text-4xl">Admin Access Required</h1>
          <p className="mt-4 leading-7 text-uniblex-gray">{message}</p>
          {user ? (
            <button className="btn-secondary mt-6 w-full" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return <AdminShell initialAdminProfile={adminProfile} />;
}
