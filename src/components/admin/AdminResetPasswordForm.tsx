"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AdminResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session));
      if (!data.session) {
        setError("Open this page from the password recovery email to set a new password.");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setError("");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. Redirecting to admin login...");
    await supabase.auth.signOut();
    window.setTimeout(() => router.replace("/admin/login"), 1800);
  }

  if (!supabase) {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <section className="card max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Admin Setup</p>
          <h1 className="mt-3 font-heading text-4xl">Supabase is not configured</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container-pad flex min-h-screen items-center justify-center py-12">
      <section className="card w-full max-w-md p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Password Recovery</p>
        <h1 className="mt-3 font-heading text-4xl gradient-text">Set New Password</h1>
        <form onSubmit={handleUpdatePassword} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            New Password
            <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Confirm Password
            <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required />
          </label>
          {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
          {message ? <p className="rounded-lg border border-uniblex-blue/30 bg-uniblex-blue/10 p-3 text-sm text-blue-100">{message}</p> : null}
          <button className="btn-primary w-full" disabled={!ready || loading} type="submit">
            {loading ? "Updating password..." : "Update Password"}
          </button>
        </form>
        <Link href="/admin/login" className="mt-5 inline-flex text-sm font-bold text-uniblex-gray transition hover:text-white">
          Back to login
        </Link>
      </section>
    </main>
  );
}
