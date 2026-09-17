import { type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { readAdsRuntimeConfig, runtimeEligibility } from "@/lib/ads/server/config";
import { AD_SCOPE_COOKIE, validAdScope } from "@/lib/ads/scope";
import { secretHash } from "@/lib/ads/server/tickets";
import { adJson, boundedJson, sameOriginRequest, validCompletion, validGameSlug, validUuid } from "@/lib/ads/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bridgeToken = /^[A-Za-z0-9_-]{1,80}$/;

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!sameOriginRequest(request)) return adJson({ redeemed: false, reason: "origin_rejected" }, 403);
  const body = await boundedJson(request);
  const scope = request.cookies.get(AD_SCOPE_COOKIE)?.value;
  if (!body || !validUuid(body.requestId) || !validUuid(body.session) || !bridgeToken.test(String(body.clientRequestId || "")) || !validCompletion(body.completionId) || !validAdScope(scope)) {
    return adJson({ redeemed: false, reason: "invalid_request" }, 400);
  }
  const decision = runtimeEligibility(readAdsRuntimeConfig(process.env), "rewarded");
  if (!decision.allowed) return adJson({ redeemed: false, reason: decision.reason });
  const { slug } = await context.params;
  if (!validGameSlug(slug)) return adJson({ redeemed: false, reason: "invalid_game" }, 400);
  try {
    const { data, error } = await createServiceSupabaseClient().rpc("redeem_ad_reward", {
      p_slug: slug, p_request_id: body.requestId, p_session_id: body.session, p_client_request_id: body.clientRequestId,
      p_completion_id: body.completionId, p_audience_scope_hash: secretHash(scope),
    });
    if (error || !data || typeof data !== "object") return adJson({ redeemed: false, reason: "redemption_unavailable" }, 503);
    const result = data as Record<string, unknown>;
    return adJson({ redeemed: result.redeemed === true, requestId: result.request_id, reason: result.reason });
  } catch { return adJson({ redeemed: false, reason: "redemption_unavailable" }, 503); }
}
