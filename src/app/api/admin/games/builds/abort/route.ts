import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { abortMultipartUpload, getR2Config } from "@/lib/r2Multipart";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) {
    return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  }

  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const authorization = request.headers.get("authorization") || "";
    const body = await request.json();
    const buildId = String(body.buildId ?? "");
    const gameId = String(body.gameId ?? "");
    const zipKey = String(body.zipKey ?? "");
    const uploadId = String(body.uploadId ?? "");
    const error = String(body.error ?? "Upload was aborted.");

    if (!zipKey || !uploadId) {
      return NextResponse.json({ error: "R2 key and upload id are required." }, { status: 400 });
    }

    await abortMultipartUpload(getR2Config(), zipKey, uploadId);

    const supabase = createUserSupabaseClient(authorization);
    if (buildId) await supabase.from("game_builds").update({ status: "failed", error }).eq("id", buildId);
    if (gameId) await supabase.from("games").update({ build_status: "failed", last_build_error: error }).eq("id", gameId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to abort game build upload." },
      { status: 400 }
    );
  }
}
