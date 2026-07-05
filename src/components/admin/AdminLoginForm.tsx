"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { adminPasswordRecoveryRedirectUrl } from "@/lib/adminAuth";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.replace("/admin");
    });
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setAuthLoading(true);
    setAuthError("");
    setNotice("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    router.replace("/admin");
  }

  async function handlePasswordReset() {
    if (!supabase) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setAuthError("Enter your email address first.");
      return;
    }

    setResetLoading(true);
    setAuthError("");
    setNotice("");

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: adminPasswordRecoveryRedirectUrl
    });

    setResetLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setNotice("Password recovery email sent. Follow the link in your inbox to set a new password.");
  }

  if (!supabase) {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <section className="card max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Admin Setup</p>
          <h1 className="mt-3 font-heading text-4xl">Supabase is not configured</h1>
          <p className="mt-4 leading-7 text-uniblex-gray">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel to enable admin login.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="container-pad flex min-h-screen items-center justify-center py-12">
      <section className="card w-full max-w-md p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Protected Admin</p>
        <h1 className="mt-3 font-heading text-4xl gradient-text">Uniblex Login</h1>
        <form onSubmit={handleLogin} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="w-fit text-sm font-bold text-uniblex-blue transition hover:text-white">
            {resetLoading ? "Sending recovery email..." : "Forgot password?"}
          </button>
          {authError ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{authError}</p> : null}
          {notice ? <p className="rounded-lg border border-uniblex-blue/30 bg-uniblex-blue/10 p-3 text-sm text-blue-100">{notice}</p> : null}
          <button className="btn-primary w-full" disabled={authLoading} type="submit">{authLoading ? "Signing in..." : "Sign In"}</button>
        </form>
        <Link href="/" className="mt-5 inline-flex text-sm font-bold text-uniblex-gray transition hover:text-white">
          Back to site
        </Link>
      </section>
    </main>
  );
}
