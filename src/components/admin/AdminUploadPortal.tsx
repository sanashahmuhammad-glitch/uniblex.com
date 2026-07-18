"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import type { AdminProfile } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { updateWebglMvp } from "@/lib/webglMvpClient";
import { deleteAdminSubmissionDraft, loadLatestAdminSubmissionDraft, type AdminSubmissionDraft } from "@/lib/adminSubmissionDraft";
import { cleanupGameMedia } from "@/lib/gameMediaUploadClient";
import { AdminGameWizard } from "@/components/admin/AdminGameWizard";
import { AdminGamesView } from "@/components/admin/AdminGamesView";
import { AdminGuidelines } from "@/components/admin/AdminGuidelines";
import { AdminPortalMobileHeader, AdminPortalSidebar } from "@/components/admin/AdminPortalSidebar";
import { AdminUploadHistory } from "@/components/admin/AdminUploadHistory";
import { sanitizeAdminError, type AdminPortalSection } from "@/components/admin/adminUploadLogic";
import type { AdminCategory, AdminGameRow, AdminUploadOperation } from "@/components/admin/adminPortalTypes";

type AdminUploadPortalProps = {
  adminProfile: AdminProfile;
  r2GameUploadsEnabled: boolean;
  onSignOut: () => void;
};

export function AdminUploadPortal({ adminProfile, r2GameUploadsEnabled, onSignOut }: AdminUploadPortalProps) {
  const [section, setSection] = useState<AdminPortalSection>("games");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [games, setGames] = useState<AdminGameRow[]>([]);
  const [operations, setOperations] = useState<AdminUploadOperation[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editingGame, setEditingGame] = useState<AdminGameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyGameId, setBusyGameId] = useState("");
  const [availableDraft, setAvailableDraft] = useState<AdminSubmissionDraft | null>(null);
  const [wizardDraft, setWizardDraft] = useState<AdminSubmissionDraft | null>(null);
  const [draftChoiceOpen, setDraftChoiceOpen] = useState(false);

  const loadPortalData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const [gamesResult, categoriesResult, operationsResult] = await Promise.all([
        supabase.from("games").select("*").order("updated_at", { ascending: false }),
        supabase.from("categories").select("id,name").eq("type", "game").order("sort_order", { ascending: true }),
        supabase.from("webgl_mvp_upload_operations").select("id,game_id,slug,state,build_type,compression_mode,file_count,total_bytes,verified_file_count,public_entry_url,created_at,updated_at,last_error_message").order("created_at", { ascending: false })
      ]);
      if (gamesResult.error) throw gamesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      setGames((gamesResult.data || []) as AdminGameRow[]);
      setCategories((categoriesResult.data || []) as AdminCategory[]);
      setOperations(operationsResult.error ? [] : (operationsResult.data || []) as AdminUploadOperation[]);
    } catch (cause) {
      setError(sanitizeAdminError(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPortalData(); }, [loadPortalData]);
  useEffect(() => { void loadLatestAdminSubmissionDraft(adminProfile.id).then(setAvailableDraft).catch(() => setNotice("Local draft storage is unavailable in this browser.")); }, [adminProfile.id]);

  function startSubmission(game: AdminGameRow | null = null) {
    if (!game && availableDraft) { setDraftChoiceOpen(true); return; }
    setEditingGame(game);
    setWizardDraft(null);
    setNotice("");
    setSection("submit");
  }

  function resumeDraft() {
    setEditingGame(null);
    setWizardDraft(availableDraft);
    setDraftChoiceOpen(false);
    setNotice("");
    setSection("submit");
  }

  async function discardAvailableDraft(startNew: boolean) {
    if (!availableDraft || !window.confirm(startNew ? "Discard the saved local submission and start a new one? Uploaded draft media will be cleaned up." : "Discard this saved local submission and clean up its uploaded draft media?")) return;
    try {
      const keys = availableDraft.buildResult ? [] : availableDraft.media.map((item) => item.objectKey).filter((key): key is string => Boolean(key));
      await cleanupGameMedia(availableDraft.draftId, keys);
      await deleteAdminSubmissionDraft(adminProfile.id, availableDraft.draftId);
      setAvailableDraft(null);
      setWizardDraft(null);
      setDraftChoiceOpen(false);
      if (startNew) { setEditingGame(null); setSection("submit"); }
      else setNotice("Local submission draft discarded.");
    } catch (cause) {
      setNotice(`Draft was not discarded: ${sanitizeAdminError(cause)}`);
    }
  }

  async function publish(operation: AdminUploadOperation) {
    if (!window.confirm(`Publish the verified build for "${operation.slug}"?`)) return;
    setBusyGameId(operation.game_id);
    setNotice("");
    try {
      await updateWebglMvp(operation.id, "publish");
      setNotice("Verified game published successfully.");
      await loadPortalData();
    } catch (cause) { setNotice(sanitizeAdminError(cause)); }
    finally { setBusyGameId(""); }
  }

  async function unpublish(game: AdminGameRow) {
    if (!supabase || !window.confirm(`Unpublish "${game.title}" and return it to draft?`)) return;
    setBusyGameId(game.id);
    setNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Admin session expired. Sign in again.");
      const response = await fetch("/api/admin/games/actions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "unpublish", gameId: game.id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Game could not be unpublished.");
      setNotice("Game moved back to draft.");
      await loadPortalData();
    } catch (cause) { setNotice(sanitizeAdminError(cause)); }
    finally { setBusyGameId(""); }
  }

  function completeWizard(message: string) {
    setNotice(message);
    setEditingGame(null);
    setWizardDraft(null);
    setSection("games");
    void loadPortalData();
  }

  const adminLabel = adminProfile.display_name || adminProfile.email || "Uniblex Admin";

  return (
    <div className="admin-portal min-h-screen bg-uniblex-bg text-uniblex-white">
      <AdminPortalMobileHeader onOpen={() => setMobileOpen(true)} />
      <AdminPortalSidebar activeSection={section} adminLabel={adminLabel} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={(next) => { if (next === "submit") startSubmission(); else { setSection(next); setEditingGame(null); setWizardDraft(null); } }} onSignOut={onSignOut} />
      {draftChoiceOpen && availableDraft ? <DraftRecoveryDialog draft={availableDraft} onResume={resumeDraft} onStartNew={() => void discardAvailableDraft(true)} onDiscard={() => void discardAvailableDraft(false)} onClose={() => setDraftChoiceOpen(false)} /> : null}
      <main className="min-w-0 lg:pl-[286px]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs text-uniblex-gray sm:flex-row sm:items-center sm:justify-between">
            <span>Secure browser-to-R2 MVP  -  Admin authorization preserved</span>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-bold ${r2GameUploadsEnabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}><span className={`h-2 w-2 rounded-full ${r2GameUploadsEnabled ? "bg-emerald-300" : "bg-amber-300"}`} />{r2GameUploadsEnabled ? "Uploads enabled" : "Production quarantine active"}</span>
          </div>
          {notice ? <div role="status" className="mb-5 rounded-xl border border-uniblex-blue/25 bg-uniblex-blue/[.07] p-4 text-sm text-white">{notice}</div> : null}
          {section === "games" ? <AdminGamesView games={games} operations={operations} loading={loading} error={error} busyGameId={busyGameId} onRetry={() => void loadPortalData()} onSubmit={() => startSubmission()} onEdit={(game) => startSubmission(game)} onPublish={(operation) => void publish(operation)} onUnpublish={(game) => void unpublish(game)} /> : null}
          {section === "submit" ? <AdminGameWizard key={editingGame?.id || wizardDraft?.draftId || "new"} adminId={adminProfile.id} categories={categories} editingGame={editingGame} initialDraft={wizardDraft} r2GameUploadsEnabled={r2GameUploadsEnabled} onDraftSaved={setAvailableDraft} onDraftDiscarded={() => { setAvailableDraft(null); setWizardDraft(null); setEditingGame(null); setSection("games"); setNotice("Local submission draft discarded."); }} onCancel={() => { setEditingGame(null); setWizardDraft(null); setSection("games"); }} onComplete={completeWizard} /> : null}
          {section === "history" ? <AdminUploadHistory operations={operations} /> : null}
          {section === "guidelines" ? <AdminGuidelines /> : null}
        </div>
      </main>
    </div>
  );
}

function DraftRecoveryDialog({ draft, onResume, onStartNew, onDiscard, onClose }: { draft: AdminSubmissionDraft; onResume: () => void; onStartNew: () => void; onDiscard: () => void; onClose: () => void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" role="presentation" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="draft-recovery-title" className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#111822] p-6 shadow-2xl"><h2 id="draft-recovery-title" className="font-heading text-2xl text-white">Resume unfinished submission?</h2><p className="mt-3 text-sm leading-6 text-uniblex-gray">A local draft for <strong className="text-white">{draft.form.title || "Untitled game"}</strong> was saved {new Date(draft.updatedAt).toLocaleString()}. Local files that were not uploaded must be selected again.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" autoFocus onClick={onResume} className="btn-primary">Resume draft</button><button type="button" onClick={onStartNew} className="btn-secondary">Start new</button><button type="button" onClick={onDiscard} className="min-h-11 rounded-xl border border-red-400/25 px-4 text-sm font-bold text-red-200 sm:col-span-2">Discard draft</button><button type="button" onClick={onClose} className="min-h-11 text-sm font-bold text-uniblex-gray sm:col-span-2">Cancel</button></div></section></div>;
}
