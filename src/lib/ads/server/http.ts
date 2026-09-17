import { NextResponse } from "next/server";
import { exactHttpsOrigin } from "@/lib/ads/originPolicy";
import type { AdType } from "@/lib/ads/protocol";

const bridgeToken = /^[A-Za-z0-9_-]{1,80}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export async function boundedJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    if (total === 0) return null;
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export function parseAdBinding(body: Record<string, unknown>) {
  const format = body.format === "interstitial" || body.format === "rewarded" ? body.format as AdType : null;
  const frameOrigin = exactHttpsOrigin(body.frameOrigin);
  return format && frameOrigin && uuid.test(String(body.session || "")) && bridgeToken.test(String(body.clientRequestId || "")) && bridgeToken.test(String(body.placement || ""))
    ? { format, frameOrigin, session: String(body.session), clientRequestId: String(body.clientRequestId), placement: String(body.placement) }
    : null;
}

export function adJson(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}

export function validUuid(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
export function validCompletion(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9._:-]{1,240}$/.test(value); }
export function validGameSlug(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120; }
