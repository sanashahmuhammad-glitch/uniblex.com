import { consentPermitsAds, hostConsentState, type ConsentState } from "./consent";
import type { AdRequest, AdStatus, AdType } from "./protocol";

export type AdAuthorization = { requestId: string; ticket: string; expiresAt: string; providerKey: string };
export type AdEligibilityContext = { session: string; frameOrigin: string };
export type EligibilityResult = { status: "eligible"; authorization: AdAuthorization } | { status: Extract<AdStatus, "blocked" | "unavailable">; reason: string };

export interface AdEligibilityGate {
  canRequest(type: AdType): boolean;
  authorize(clientRequestId: string, type: AdType, request: AdRequest, context: AdEligibilityContext): Promise<EligibilityResult>;
  consume(authorization: AdAuthorization, clientRequestId: string, type: AdType, request: AdRequest, context: AdEligibilityContext): Promise<boolean>;
  redeem(authorization: AdAuthorization, clientRequestId: string, completionId: string, context: AdEligibilityContext): Promise<boolean>;
}

type ServerGateOptions = { slug: string; consent?: () => ConsentState; fetcher?: typeof fetch };
const token = /^[A-Za-z0-9_-]{1,80}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createServerEligibilityGate({ slug, consent = hostConsentState.getSnapshot, fetcher = fetch }: ServerGateOptions): AdEligibilityGate {
  async function post(path: string, body: Record<string, unknown>) {
    try {
      const response = await fetcher(`/api/games/${encodeURIComponent(slug)}/ads/${path}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      return await response.json() as Record<string, unknown>;
    } catch { return null; }
  }
  return {
    canRequest: () => consentPermitsAds(consent(), true),
    async authorize(clientRequestId, type, request, context) {
      const state = consent();
      if (!consentPermitsAds(state, true)) return { status: "blocked", reason: "consent_required" };
      const data = await post("eligibility", { clientRequestId, format: type, placement: request.placement, frameOrigin: context.frameOrigin, session: context.session, consent: state });
      if (!data || data.status !== "eligible" || data.eligible !== true || !uuid.test(String(data.requestId)) || typeof data.ticket !== "string" || typeof data.expiresAt !== "string" || !token.test(String(data.providerKey))) {
        return { status: data?.status === "blocked" ? "blocked" : "unavailable", reason: typeof data?.reason === "string" ? data.reason : "eligibility_unavailable" };
      }
      return { status: "eligible", authorization: { requestId: String(data.requestId), ticket: data.ticket, expiresAt: data.expiresAt, providerKey: String(data.providerKey) } };
    },
    async consume(authorization, clientRequestId, type, request, context) {
      const data = await post("consume", { ...authorization, clientRequestId, format: type, placement: request.placement, frameOrigin: context.frameOrigin, session: context.session });
      return data?.consumed === true && data.requestId === authorization.requestId;
    },
    async redeem(authorization, clientRequestId, completionId, context) {
      const data = await post("redeem", { requestId: authorization.requestId, clientRequestId, completionId, session: context.session });
      return data?.redeemed === true && data.requestId === authorization.requestId;
    },
  };
}
