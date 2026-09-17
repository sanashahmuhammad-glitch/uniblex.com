import { type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { readAdsRuntimeConfig, runtimeEligibility } from "@/lib/ads/server/config";
import { AD_SCOPE_COOKIE, validAdScope } from "@/lib/ads/scope";
import { secretHash, validAdTicket } from "@/lib/ads/server/tickets";
import { adJson, boundedJson, parseAdBinding, sameOriginRequest, validGameSlug, validUuid } from "@/lib/ads/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!sameOriginRequest(request)) return adJson({ consumed: false, reason: "origin_rejected" }, 403);
  const body = await boundedJson(request);
  const binding = body && parseAdBinding(body);
  const scope = request.cookies.get(AD_SCOPE_COOKIE)?.value;
  if (!body || !binding || !validUuid(body.requestId) || !validAdTicket(body.ticket) || !validAdScope(scope)) return adJson({ consumed: false, reason: "invalid_request" }, 400);
  const decision = runtimeEligibility(readAdsRuntimeConfig(process.env), binding.format);
  if (!decision.allowed) return adJson({ consumed: false, reason: decision.reason });
  const { slug } = await context.params;
  if (!validGameSlug(slug)) return adJson({ consumed: false, reason: "invalid_game" }, 400);
  try {
    const { data, error } = await createServiceSupabaseClient().rpc("consume_ad_request_ticket", {
      p_slug: slug, p_request_id: body.requestId, p_ticket_hash: secretHash(body.ticket), p_session_id: binding.session,
      p_client_request_id: binding.clientRequestId, p_placement: binding.placement, p_format: binding.format,
      p_frame_origin: binding.frameOrigin, p_audience_scope_hash: secretHash(scope),
    });
    if (error || !data || typeof data !== "object") return adJson({ consumed: false, reason: "ticket_unavailable" }, 503);
    const result = data as Record<string, unknown>;
    return adJson({ consumed: result.consumed === true, requestId: result.request_id, reason: result.reason });
  } catch { return adJson({ consumed: false, reason: "ticket_unavailable" }, 503); }
}
