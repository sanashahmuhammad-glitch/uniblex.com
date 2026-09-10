import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { SDK_EVENTS } from "@/lib/ads/telemetry";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (process.env.SDK_TELEMETRY_ENABLED !== "true") return new Response(null, { status: 204 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 8192) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (!/^[0-9a-f-]{36}$/.test(body.session) || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 20) return new Response(null, { status: 400 });
    const events = body.events.map((e: Record<string, unknown>) => {
      if (!e || !SDK_EVENTS.includes(e.event as typeof SDK_EVENTS[number])) throw new Error();
      if (e.placement !== undefined && (typeof e.placement !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(e.placement))) throw new Error();
      if (e.adType !== undefined && e.adType !== "rewarded" && e.adType !== "interstitial") throw new Error();
      return { event: e.event, placement: e.placement, ad_type: e.adType };
    });
    const { slug } = await context.params;
    const db = createServiceSupabaseClient();
    const { error } = await db.rpc("record_sdk_events", { p_slug: slug, p_session: body.session, p_events: events });
    return new Response(null, { status: error ? 429 : 204 });
  } catch { return new Response(null, { status: 400 }); }
}
