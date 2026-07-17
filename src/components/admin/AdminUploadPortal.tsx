"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminProfile } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { updateWebglMvp } from "@/lib/webglMvpClient";
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

  function startSubmission(game: AdminGameRow | null = null) {
    setEditingGame(game);
    setNotice("");
    setSection("submit");
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
    setSection("games");
    void loadPortalData();
  }

  const adminLabel = adminProfile.display_name || adminProfile.email || "Uniblex Admin";

  return (
    <div className="admin-portal min-h-screen bg-uniblex-bg text-uniblex-white">
      <AdminPortalMobileHeader onOpen={() => setMobileOpen(true)} />
      <AdminPortalSidebar activeSection={section} adminLabel={adminLabel} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={(next) => { setSection(next); if (next !== "submit") setEditingGame(null); }} onSignOut={onSignOut} />
      <main className="min-w-0 lg:pl-[286px]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs text-uniblex-gray sm:flex-row sm:items-center sm:justify-between">
            <span>Secure browser-to-R2 MVP  -  Admin authorization preserved</span>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-bold ${r2GameUploadsEnabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}><span className={`h-2 w-2 rounded-full ${r2GameUploadsEnabled ? "bg-emerald-300" : "bg-amber-300"}`} />{r2GameUploadsEnabled ? "Uploads enabled" : "Production quarantine active"}</span>
          </div>
          {notice ? <div role="status" className="mb-5 rounded-xl border border-uniblex-blue/25 bg-uniblex-blue/[.07] p-4 text-sm text-white">{notice}</div> : null}
          {section === "games" ? <AdminGamesView games={games} operations={operations} loading={loading} error={error} busyGameId={busyGameId} onRetry={() => void loadPortalData()} onSubmit={() => startSubmission()} onEdit={(game) => startSubmission(game)} onPublish={(operation) => void publish(operation)} onUnpublish={(game) => void unpublish(game)} /> : null}
          {section === "submit" ? <AdminGameWizard key={editingGame?.id || "new"} categories={categories} editingGame={editingGame} r2GameUploadsEnabled={r2GameUploadsEnabled} onCancel={() => { setEditingGame(null); setSection("games"); }} onComplete={completeWizard} /> : null}
          {section === "history" ? <AdminUploadHistory operations={operations} /> : null}
          {section === "guidelines" ? <AdminGuidelines /> : null}
        </div>
      </main>
    </div>
  );
}
