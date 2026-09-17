import { type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { consentPermitsAds, normalizeConsentState } from "@/lib/ads/consent";
import { readAdsRuntimeConfig, runtimeEligibility } from "@/lib/ads/server/config";
import { CONSENT_STATE_COOKIE, verifySealedConsent } from "@/lib/ads/server/consent";
import { AD_SCOPE_COOKIE, validAdScope } from "@/lib/ads/scope";
import { newAdTicket, secretHash } from "@/lib/ads/server/tickets";
import { adJson, boundedJson, parseAdBinding, sameOriginRequest, validGameSlug } from "@/lib/ads/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!sameOriginRequest(request)) return adJson({ eligible: false, status: "blocked", reason: "origin_rejected" }, 403);
  const body = await boundedJson(request);
  const binding = body && parseAdBinding(body);
  if (!body || !binding) return adJson({ eligible: false, status: "blocked", reason: "invalid_request" }, 400);
  const config = readAdsRuntimeConfig(process.env);
  const runtimeDecision = runtimeEligibility(config, binding.format);
  if (!runtimeDecision.allowed) return adJson({ eligible: false, status: runtimeDecision.status, reason: runtimeDecision.reason });
  const reportedConsent = normalizeConsentState(body.consent);
  const consent = verifySealedConsent(request.cookies.get(CONSENT_STATE_COOKIE)?.value, process.env.UNIBLEX_CONSENT_STATE_SECRET);
  if (!consent || !consentPermitsAds(consent, true)
    || consent.status !== reportedConsent.status || consent.jurisdiction !== reportedConsent.jurisdiction
    || consent.framework !== reportedConsent.framework || consent.policyVersion !== reportedConsent.policyVersion
    || consent.source !== reportedConsent.source) return adJson({ eligible: false, status: "blocked", reason: "consent_required" });
  const existingScope = request.cookies.get(AD_SCOPE_COOKIE)?.value;
  if (!validAdScope(existingScope)) return adJson({ eligible: false, status: "blocked", reason: "host_scope_required" }, 403);
  const { slug } = await context.params;
  if (!validGameSlug(slug)) return adJson({ eligible: false, status: "blocked", reason: "invalid_game" }, 400);
  const ticket = newAdTicket();
  try {
    const db = createServiceSupabaseClient();
    const { data, error } = await db.rpc("issue_ad_request_ticket", {
      p_slug: slug,
      p_provider_key: config.providerKey,
      p_format: binding.format,
      p_placement: binding.placement,
      p_frame_origin: binding.frameOrigin,
      p_session_id: binding.session,
      p_client_request_id: binding.clientRequestId,
      p_audience_scope_hash: secretHash(existingScope),
      p_ticket_hash: secretHash(ticket),
      p_consent_status: consent.status,
      p_consent_jurisdiction: consent.jurisdiction,
      p_consent_framework: consent.framework,
      p_consent_source: consent.source,
      p_consent_policy_version: consent.policyVersion,
    });
    if (error || !data || typeof data !== "object") return adJson({ eligible: false, status: "unavailable", reason: "eligibility_unavailable" }, 503);
    const result = data as Record<string, unknown>;
    if (result.eligible !== true) return adJson({ eligible: false, status: result.status === "blocked" ? "blocked" : "unavailable", reason: String(result.reason || "ineligible") });
    return adJson({ eligible: true, status: "eligible", requestId: result.request_id, expiresAt: result.expires_at, providerKey: result.provider_key, ticket });
  } catch { return adJson({ eligible: false, status: "unavailable", reason: "eligibility_unavailable" }, 503); }
}
