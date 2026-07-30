"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { HelpCircle, Search, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const faq = [
  ["Why did my upload stop near completion?", "The portal separates transfer from server-side HEAD verification. The displayed phase identifies whether authorization, transfer, or checksum verification failed."],
  ["Can I submit an external game URL?", "Self-contained ZIP builds are preferred. External runtime dependencies must be declared and approved during review."],
  ["Why do files need reselection after refresh?", "Browsers intentionally do not restore access to local file bytes. Draft metadata remains available and clearly marks files that need reselection."],
  ["When can an approved game go live?", "Approval and publication are separate actions. Only an authorized Uniblex owner or admin can publish an approved release."],
  ["Does Uniblex collect payment details?", "No. Revenue and payment setup is not active, and the portal does not request card or banking information."]
] as const;

type Ticket = { id: string; subject: string; category: string; status: string; created_at: string };

export function SupportCenter() {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void (async () => {
    const session = (await supabase?.auth.getSession())?.data.session;
    setAuthenticated(Boolean(session));
    if (!session) return;
    const response = await fetch("/api/developer/support", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (response.ok) setTickets(((await response.json()) as { tickets?: Ticket[] }).tickets || []);
  })(); }, []);
  const filtered = useMemo(() => faq.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(query.toLowerCase())), [query]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session) return setMessage("Log in to create and track a support ticket.");
    setBusy(true);
    const form = event.currentTarget;
    const response = await fetch("/api/developer/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json().catch(() => ({})) as { ticket?: Ticket; error?: string };
    setBusy(false);
    if (!response.ok || !payload.ticket) return setMessage(payload.error || "The support request could not be saved.");
    setTickets((current) => [payload.ticket!, ...current]);
    form.reset();
    setMessage(`Request received. Reference ${payload.ticket.id.slice(0, 8).toUpperCase()}.`);
  }
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Developer support</p>
      <h1 className="mt-3 font-heading text-4xl text-white sm:text-6xl">Find an answer or contact us.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-uniblex-gray">Search publishing guidance publicly. Signed-in developers can create a private ticket and follow its status here.</p>
      <section className="mt-10">
        <label className="relative block"><Search className="absolute left-4 top-4 text-uniblex-gray" size={20} /><span className="sr-only">Search frequently asked questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account, upload, review, or publishing help" className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-white outline-none focus:border-uniblex-blue" /></label>
        <div className="mt-5 grid gap-3">{filtered.map(([question, answer]) => <details key={question} className="card p-5"><summary className="cursor-pointer list-none font-bold text-white">{question}</summary><p className="mt-3 leading-7 text-uniblex-gray">{answer}</p></details>)}</div>
      </section>
      <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <form onSubmit={submit} className="card p-6">
          <div className="flex items-center gap-3"><HelpCircle className="text-uniblex-blue" /><h2 className="font-heading text-2xl text-white">Create a support ticket</h2></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field name="subject" label="Subject" required minLength={5} maxLength={140} /><label className="text-sm font-semibold text-white">Category<select name="category" className="admin-select mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4" defaultValue="submission_issue"><option value="account_issue">Account issue</option><option value="submission_issue">Submission issue</option><option value="upload_issue">Upload issue</option><option value="review_appeal">Review appeal</option><option value="technical_issue">Technical issue</option><option value="general_question">General question</option></select></label></div>
          <label className="mt-4 block text-sm font-semibold text-white">How can we help?<textarea name="message" required minLength={20} maxLength={5000} rows={7} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-4 outline-none focus:border-uniblex-blue" /></label>
          {message ? <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">{message}</p> : null}
          <button disabled={busy} className="btn-primary mt-5 disabled:opacity-60"><Send size={17} />{busy ? "Sending…" : authenticated ? "Send request" : "Log in to send"}</button>
        </form>
        <div className="card p-6"><h2 className="font-heading text-2xl text-white">Your ticket history</h2><div className="mt-5">{tickets.length ? tickets.map((ticket) => <article key={ticket.id} className="border-b border-white/10 py-4 last:border-0"><div className="flex justify-between gap-4"><p className="font-bold text-white">{ticket.subject}</p><span className="text-xs font-bold uppercase text-uniblex-blue">{ticket.status}</span></div><p className="mt-1 text-sm text-uniblex-gray">{ticket.category.replaceAll("_", " ")} · {new Date(ticket.created_at).toLocaleDateString()} · {ticket.id.slice(0, 8).toUpperCase()}</p></article>) : <p className="mt-5 text-sm leading-6 text-uniblex-gray">{authenticated ? "No support tickets yet." : "Log in to see your private ticket history."}</p>}</div></div>
      </section>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="text-sm font-semibold text-white">{label}<input {...input} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 outline-none focus:border-uniblex-blue" /></label>;
}
