"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export function DeveloperAuthForm({ mode }: { mode: "login" | "register" | "recover" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setMessage("Developer authentication is not configured.");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const studio = String(data.get("studio") || "").trim();
    setBusy(true);
    setMessage("");
    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/developers/login` });
      setMessage(error ? error.message : "Check your email for a secure password recovery link.");
    } else if (mode === "register") {
      const accepted = data.get("accept") === "on";
      if (!accepted) { setBusy(false); return setMessage("Accept the Terms and Privacy Policy to create an account."); }
      const { data: result, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: studio, studio_name: studio } } });
      if (error) setMessage(error.message);
      else if (result.session) {
        const response = await fetch("/api/developer/profile", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${result.session.access_token}` }, body: JSON.stringify({ studio_name: studio, display_name: studio, terms_accepted: true, privacy_accepted: true }) });
        if (!response.ok) setMessage("Your account was created, but profile setup needs attention.");
        else router.replace("/developers/dashboard");
      } else setMessage("Check your email to confirm the account, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else router.replace("/developers/dashboard");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1200px] items-center gap-10 px-5 py-16 lg:grid-cols-2">
      <section>
        <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Developer workspace</p>
        <h1 className="mt-3 font-heading text-4xl text-white sm:text-6xl">{mode === "login" ? "Welcome back." : mode === "recover" ? "Recover your account." : "Create your studio workspace."}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-uniblex-gray">{mode === "login" ? "Continue a draft, track review feedback, or prepare your next browser-game release." : mode === "recover" ? "We will send a short-lived recovery link to your verified developer email." : "Submit games, manage builds and media, and follow every release through the Uniblex review process."}</p>
      </section>
      <form onSubmit={submit} className="card mx-auto w-full max-w-lg p-6 sm:p-8">
        <h2 className="font-heading text-2xl text-white">{mode === "login" ? "Log in" : mode === "recover" ? "Password recovery" : "Developer sign-up"}</h2>
        {mode === "register" ? <Field name="studio" label="Studio or developer name" required minLength={2} autoComplete="organization" /> : null}
        <Field name="email" label="Email" type="email" required autoComplete="email" />
        {mode !== "recover" ? <Field name="password" label="Password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /> : null}
        {mode === "register" ? <label className="mt-5 flex gap-3 text-sm leading-6 text-uniblex-gray"><input name="accept" type="checkbox" className="mt-1 h-4 w-4 accent-[#00B2FF]" /><span>I accept the <Link className="text-uniblex-blue" href="/terms-of-service">Terms</Link> and <Link className="text-uniblex-blue" href="/privacy-policy">Privacy Policy</Link>.</span></label> : null}
        {message ? <p role="status" className="mt-5 rounded-lg border border-uniblex-blue/20 bg-uniblex-blue/10 p-3 text-sm text-white">{message}</p> : null}
        <button disabled={busy} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "recover" ? "Send recovery link" : "Create account"}</button>
        <p className="mt-5 text-center text-sm text-uniblex-gray">{mode === "login" ? <>New to Uniblex? <Link className="font-bold text-uniblex-blue" href="/developers/register">Create an account</Link><br /><Link className="mt-2 inline-block text-uniblex-gray hover:text-white" href="/developers/recover">Forgot password?</Link></> : <>Already registered? <Link className="font-bold text-uniblex-blue" href="/developers/login">Log in</Link></>}</p>
      </form>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label className="mt-5 block text-sm font-semibold text-white">{label}<input {...inputProps} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-white outline-none transition placeholder:text-uniblex-gray focus:border-uniblex-blue focus:ring-2 focus:ring-uniblex-blue/20" /></label>;
}

