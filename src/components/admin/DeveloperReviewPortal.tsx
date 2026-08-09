"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, ExternalLink, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Media = { role: string; public_url: string };
type Submission = {
  id: string;
  title: string;
  slug: string;
  status: string;
  engine: string;
  short_description: string;
  full_description: string;
  build_verified: boolean;
  updated_at: string;
  options?: Record<string, unknown>;
  developer_profiles?: { studio_name?: string; display_name?: string };
  developer_game_builds?: Array<{ verification_status: string; preview_url?: string; build_type: string; compression_mode: string; file_count: number; total_bytes: number }>;
  game_media?: Media[];
};

const statuses = ["submitted", "under_review", "changes_requested", "approved", "rejected", "published", "unpublished"];

export function DeveloperReviewPortal() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("Loading reviewer queue…");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session) return setMessage("Sign in with an authorized reviewer account.");
    const response = await fetch("/api/admin/developer-submissions", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = await response.json().catch(() => ({})) as { submissions?: Submission[]; role?: string; hostingRepairSubmissionIds?: string[]; error?: string };
    if (!response.ok) return setMessage(payload.error || "Reviewer access is required.");
    if (payload.hostingRepairSubmissionIds?.length) {
      setMessage("Repairing verified WebGL hosting metadata…");
      for (const submissionId of payload.hostingRepairSubmissionIds) {
        const repair = await fetch("/api/admin/developer-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "repair_hosting", submissionId })
        });
        const repairPayload = await repair.json().catch(() => ({})) as { error?: string };
        if (!repair.ok) return setMessage(repairPayload.error || "WebGL hosting metadata could not be repaired.");
      }
      return load();
    }
    setRows(payload.submissions || []);
    setRole(payload.role || "");
    setMessage("");
  }

  const filtered = useMemo(() => rows.filter((row) =>
    (status === "all" || row.status === status) &&
    `${row.title} ${row.slug} ${row.developer_profiles?.studio_name || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [query, rows, status]);

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const form = event.currentTarget;
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session) return setMessage("Your reviewer session expired. Sign in again.");
    const body = Object.fromEntries(new FormData(form));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/developer-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...body,
          submissionId: selected.id,
          checklist: { load: body.load === "on", controls: body.controls === "on", responsive: body.responsive === "on", content: body.content === "on" }
        })
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setMessage(response.ok ? "Review decision recorded." : payload.error || "Decision could not be recorded.");
      if (response.ok) { setSelected(null); await load(); }
    } catch {
      setMessage("Decision request failed. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0D1118] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Admin · Developer Portal</p>
            <h1 className="mt-2 font-heading text-3xl sm:text-5xl">Submission review queue</h1>
            <p className="mt-3 text-uniblex-gray">Server-authorized QA and publishing · role: {role || "checking"}</p>
          </div>
          <Link href="/admin" className="btn-secondary">Back to admin</Link>
        </header>

        {message ? <p role="status" className="mt-6 rounded-xl border border-uniblex-blue/20 bg-uniblex-blue/10 p-4 text-sm">{message}</p> : null}

        <div className="card mt-8 grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <label className="relative"><Search className="absolute left-3 top-3.5 text-uniblex-gray" size={18} /><span className="sr-only">Search submissions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search game or studio" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 outline-none focus:border-uniblex-blue" /></label>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="admin-select rounded-xl border border-white/10 bg-black/20 px-4"><option value="all">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          {filtered.map((row) => <article key={row.id} className="flex flex-col gap-4 border-b border-white/10 p-5 last:border-0 md:flex-row md:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{row.title}</h2><span className="rounded-full bg-white/5 px-2 py-1 text-xs uppercase text-uniblex-gray">{row.status}</span>{row.build_verified ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">BUILD VERIFIED</span> : null}</div><p className="mt-2 text-sm text-uniblex-gray">{row.developer_profiles?.studio_name || row.developer_profiles?.display_name || "Developer"} · {row.engine || "Engine not set"} · {new Date(row.updated_at).toLocaleString()}</p></div>
            <button onClick={() => setSelected(row)} className="btn-secondary !min-h-10 text-sm"><Eye size={16} />Review</button>
          </article>)}
          {!filtered.length ? <div className="p-12 text-center text-uniblex-gray">No submissions match this queue.</div> : null}
        </section>
      </div>

      {selected ? <ReviewDialog submission={selected} role={role} busy={busy} message={message} onClose={() => setSelected(null)} onSubmit={decide} /> : null}
    </main>
  );
}

function ReviewDialog({ submission, role, busy, message, onClose, onSubmit }: { submission: Submission; role: string; busy: boolean; message: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const cover = submission.game_media?.find((media) => media.role === "cover");
  const screenshots = submission.game_media?.filter((media) => media.role.startsWith("screenshot-")) || [];
  const build = submission.developer_game_builds?.find((item) => item.verification_status === "verified") || submission.developer_game_builds?.[0];
  const canPublish = ["owner", "admin"].includes(role) && submission.status === "approved";
  const canUnpublish = ["owner", "admin"].includes(role) && submission.status === "published";
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
    <form onSubmit={onSubmit} className="card mx-auto my-8 max-w-5xl p-6 sm:p-8">
      <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase text-uniblex-blue">Reviewing · {submission.status}</p><h2 id="review-title" className="mt-2 font-heading text-3xl">{submission.title}</h2><p className="mt-2 max-w-3xl text-uniblex-gray">{submission.full_description}</p></div><button type="button" onClick={onClose} className="h-10 rounded-lg p-2 text-uniblex-gray hover:bg-white/5 hover:text-white" aria-label="Close review"><X /></button></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">{cover ? <div className="relative aspect-video"><Image src={cover.public_url} alt={`${submission.title} cover`} fill unoptimized sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" /></div> : <div className="grid aspect-video place-items-center text-sm text-uniblex-gray">Cover missing</div>}<div className="p-4"><p className="font-bold">{submission.short_description}</p><p className="mt-2 text-sm text-uniblex-gray">/{submission.slug} · {submission.engine}</p></div></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-5"><h3 className="font-bold">Build report</h3>{build ? <div className="mt-3 text-sm text-uniblex-gray"><p>{build.verification_status} · {build.build_type} · {build.compression_mode}</p><p>{build.file_count} files · {Math.round(build.total_bytes / 1024 / 1024)} MB</p>{build.preview_url ? <a href={build.preview_url} target="_blank" rel="noreferrer" className="btn-secondary mt-4 !min-h-10 text-sm">Open safe preview <ExternalLink size={15} /></a> : null}</div> : <p className="mt-3 text-sm text-amber-200">No build report is attached.</p>}<div className="mt-5 grid grid-cols-3 gap-2">{screenshots.slice(0, 3).map((media) => <div key={media.role} className="relative aspect-video"><Image src={media.public_url} alt={`${submission.title} ${media.role}`} fill unoptimized sizes="20vw" className="rounded-lg object-cover" /></div>)}</div></div>
      </div>
      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5"><h3 className="font-bold">Required QA checklist</h3><p className="mt-1 text-xs text-uniblex-gray">All four checks are mandatory for approval and publication.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[["load", "Loads without missing files"], ["controls", "Controls work as declared"], ["responsive", "Canvas and mobile layout pass"], ["content", "Content, IP, privacy and safety pass"]].map(([name, label]) => <label key={name} className="flex gap-3 rounded-lg border border-white/10 p-3 text-sm"><input name={name} type="checkbox" className="mt-0.5 accent-[#00B2FF]" />{label}</label>)}</div></div>
      <label className="mt-5 block text-sm font-bold">Developer-visible feedback<textarea name="developerFeedback" rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-4 outline-none focus:border-uniblex-blue" /></label>
      <label className="mt-5 block text-sm font-bold">Private internal notes<textarea name="internalNotes" rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-4 outline-none focus:border-uniblex-purple" /></label>
      <label className="mt-5 block text-sm font-bold">Decision<select name="decision" className="admin-select mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"><option value="under_review">Start review</option><option value="changes_requested">Request changes</option><option value="approved">Approve</option><option value="rejected">Reject</option>{canPublish ? <option value="published">Publish to Uniblex Games</option> : null}{canUnpublish ? <option value="unpublished">Unpublish</option> : null}</select></label>
      {submission.status !== "approved" && ["owner", "admin"].includes(role) ? <p className="mt-3 text-xs text-uniblex-gray">Publishing becomes available after an explicit Approved decision.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-uniblex-blue/20 bg-uniblex-blue/10 p-4 text-sm">{message}</p> : null}
      <button disabled={busy} className="btn-primary mt-6 disabled:opacity-50"><CheckCircle2 size={18} />{busy ? "Saving…" : "Confirm decision"}</button>
    </form>
  </div>;
}
