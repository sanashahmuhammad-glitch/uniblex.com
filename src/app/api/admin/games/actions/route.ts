import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { claimBuildOperation, finishBuildOperation, requireIdempotencyKey } from "@/lib/gameBuildState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Action = "publish" | "preview" | "unpublish" | "delete" | "rollback";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "") as Action;
  if (["publish", "rollback", "delete"].includes(action) && !areR2GameUploadsEnabled()) return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const authorization = request.headers.get("authorization") || "";
    const gameId = String(body.gameId ?? "");
    if (!gameId || !["publish", "preview", "unpublish", "delete", "rollback"].includes(action)) return NextResponse.json({ error: "A valid game action and game id are required." }, { status: 400 });
    const supabase = createUserSupabaseClient(authorization);
    if (action === "preview" || action === "unpublish") {
      const updates = action === "preview" ? { status: "preview" } : { status: "draft", published_at: null };
      const { error } = await supabase.from("games").update(updates).eq("id", gameId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    const { data: game, error: gameError } = await supabase.from("games").select("id,build_id").eq("id", gameId).maybeSingle();
    const operationBuildId = String(body.operationBuildId ?? game?.build_id ?? "");
    if (gameError || !operationBuildId) return NextResponse.json({ error: "Game does not have an operation build." }, { status: 400 });

    if (action === "publish") {
      const operation = await claimBuildOperation(supabase, { buildId: operationBuildId, operation: "publish", idempotencyKey, targetState: "publishing" });
      if (operation.replayed) return NextResponse.json({ ok: operation.status === "succeeded", replayed: true, state: operation.state });
      const { error } = await supabase.from("games").update({ status: "published", published_at: new Date().toISOString() }).eq("id", gameId);
      if (error) { await finishBuildOperation(supabase, operation.operation_id, "failed", "ready_for_preview", "GAME_PUBLISH_FAILED"); return NextResponse.json({ error: error.message }, { status: 400 }); }
      await finishBuildOperation(supabase, operation.operation_id, "succeeded", "published");
      return NextResponse.json({ ok: true });
    }

    if (action === "rollback") {
      const selectedBuildId = String(body.buildId ?? "");
      const { data: selected } = await supabase.from("game_builds").select("id,version,r2_extract_prefix,index_url,status,manifest").eq("id", selectedBuildId).eq("game_id", gameId).in("status", ["ready_for_preview", "published", "rolled_back"]).maybeSingle();
      if (!selected) return NextResponse.json({ error: "Selected build is not eligible for rollback." }, { status: 400 });
      const operation = await claimBuildOperation(supabase, { buildId: operationBuildId, operation: "rollback", idempotencyKey, targetState: "rolled_back" });
      if (operation.replayed) return NextResponse.json({ ok: operation.status === "succeeded", replayed: true, state: operation.state });
      const { error } = await supabase.from("games").update({ build_id: selected.id, build_status: selected.status, build_version: selected.version, r2_build_prefix: selected.r2_extract_prefix, iframe_url: selected.index_url, preview_url: selected.index_url, build_metadata: selected.manifest, last_build_error: null }).eq("id", gameId);
      if (error) { await finishBuildOperation(supabase, operation.operation_id, "failed", "published", "GAME_ROLLBACK_FAILED"); return NextResponse.json({ error: error.message }, { status: 400 }); }
      await finishBuildOperation(supabase, operation.operation_id, "succeeded", "rolled_back");
      return NextResponse.json({ ok: true });
    }

    const operation = await claimBuildOperation(supabase, { buildId: operationBuildId, operation: "delete", idempotencyKey, targetState: "deleting" });
    if (operation.replayed) {
      if (operation.status === "running") await finishBuildOperation(supabase, operation.operation_id, "succeeded", "deleted");
      return NextResponse.json({ ok: operation.status !== "failed", replayed: true, state: operation.status === "running" ? "deleted" : operation.state });
    }
    const cleanup = await cleanupGameBuilds(supabase, gameId);
    if (!cleanup.ok) { await finishBuildOperation(supabase, operation.operation_id, "failed", "cleanup_failed", "GAME_DELETE_CLEANUP_FAILED"); return NextResponse.json({ error: "Unable to clean up game build objects." }, { status: 503 }); }
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) { await finishBuildOperation(supabase, operation.operation_id, "failed", "cleanup_failed", "GAME_ROW_DELETE_FAILED"); return NextResponse.json({ error: error.message }, { status: 400 }); }
    await finishBuildOperation(supabase, operation.operation_id, "succeeded", "deleted");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update game." }, { status: 400 });
  }
}

async function cleanupGameBuilds(supabase: ReturnType<typeof createUserSupabaseClient>, gameId: string) {
  const cleanupUrl = process.env.R2_EXTRACT_WORKER_CLEANUP_URL?.trim();
  const workerSecret = process.env.R2_EXTRACT_WORKER_SECRET?.trim();
  if (!cleanupUrl || !workerSecret) return { ok: false };
  const { data, error } = await supabase.from("game_builds").select("r2_extract_prefix").eq("game_id", gameId);
  if (error) return { ok: false };
  for (const build of data ?? []) {
    const prefix = String(build.r2_extract_prefix ?? "");
    if (!prefix) continue;
    const response = await fetch(cleanupUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` }, body: JSON.stringify({ prefix }) }).catch(() => null);
    if (!response?.ok) return { ok: false };
  }
  return { ok: true };
}
