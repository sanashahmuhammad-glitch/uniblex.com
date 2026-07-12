import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "publish" | "preview" | "unpublish" | "delete" | "rollback";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "") as Action;

  if (["publish", "rollback", "delete"].includes(action) && !areR2GameUploadsEnabled()) {
    return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  }

  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const authorization = request.headers.get("authorization") || "";
    const gameId = String(body.gameId ?? "");
    const buildId = String(body.buildId ?? "");

    if (!gameId || !["publish", "preview", "unpublish", "delete", "rollback"].includes(action)) {
      return NextResponse.json({ error: "A valid game action and game id are required." }, { status: 400 });
    }

    const supabase = createUserSupabaseClient(authorization);

    if (action === "delete") {
      await cleanupGameBuilds(supabase, gameId);
      const { error } = await supabase.from("games").delete().eq("id", gameId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "rollback") {
      if (!buildId) return NextResponse.json({ error: "Select a build to roll back to." }, { status: 400 });
      const { data: build, error: buildError } = await supabase
        .from("game_builds")
        .select("id,version,r2_extract_prefix,index_url,status,manifest")
        .eq("id", buildId)
        .eq("game_id", gameId)
        .maybeSingle();

      if (buildError || !build || build.status !== "ready") {
        return NextResponse.json({ error: buildError?.message || "Selected build is not ready." }, { status: 400 });
      }

      const { error } = await supabase.from("games").update({
        build_id: build.id,
        build_status: "ready",
        build_version: build.version,
        r2_build_prefix: build.r2_extract_prefix,
        iframe_url: build.index_url,
        preview_url: build.index_url,
        build_metadata: build.manifest,
        last_build_error: null
      }).eq("id", gameId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const updates =
      action === "publish"
        ? { status: "published", published_at: new Date().toISOString() }
        : action === "preview"
          ? { status: "preview" }
          : { status: "draft", published_at: null };

    const { error } = await supabase.from("games").update(updates).eq("id", gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update game." },
      { status: 400 }
    );
  }
}

async function cleanupGameBuilds(supabase: ReturnType<typeof createUserSupabaseClient>, gameId: string) {
  const cleanupUrl = process.env.R2_EXTRACT_WORKER_CLEANUP_URL?.trim();
  const workerSecret = process.env.R2_EXTRACT_WORKER_SECRET?.trim();
  if (!cleanupUrl || !workerSecret) return;

  const { data } = await supabase
    .from("game_builds")
    .select("r2_extract_prefix")
    .eq("game_id", gameId);

  const prefixes = (data ?? [])
    .map((build) => String(build.r2_extract_prefix ?? ""))
    .filter(Boolean);

  await Promise.all(prefixes.map((prefix) => fetch(cleanupUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`
    },
    body: JSON.stringify({ prefix })
  }).catch(() => undefined)));
}
