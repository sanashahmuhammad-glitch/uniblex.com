export const AD_PROTOCOL = "uniblex";
export const AD_PROTOCOL_VERSION = 2;
export const LIFECYCLE_METHODS = ["sdk_init", "game_loading_start", "game_loading_stop", "game_ready", "gameplay_start", "gameplay_stop"] as const;
export const AD_RESULTS = ["completed", "skipped", "failed", "unavailable", "blocked"] as const;
export type AdStatus = (typeof AD_RESULTS)[number];
export type AdType = "interstitial" | "rewarded";
export type AdResult = { status: AdStatus; rewardGranted: boolean; reason?: string };
export type AdRequest = { placement: string; reward?: string };
export type BridgeRequest = { protocol: "uniblex"; version: 2; type: "request"; requestId: string; session?: string; method: string; payload: AdRequest | Record<string, never> };
const token = /^[a-zA-Z0-9_-]{1,80}$/;
export function isTrustedGameMessage(event: Pick<MessageEvent, "source" | "origin">, expectedSource: MessageEventSource | null, expectedOrigin: string) {
  return event.source === expectedSource && event.origin === expectedOrigin;
}
export function parseBridgeRequest(value: unknown): BridgeRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const m = value as Record<string, unknown>;
  if (m.protocol !== AD_PROTOCOL || m.version !== 2 || m.type !== "request" || typeof m.requestId !== "string" || !token.test(m.requestId) || typeof m.method !== "string" || m.method.length > 64) return null;
  if (m.session !== undefined && (typeof m.session !== "string" || !token.test(m.session))) return null;
  if (!m.payload || typeof m.payload !== "object" || Array.isArray(m.payload)) return null;
  const payload = m.payload as Record<string, unknown>;
  if (Object.keys(payload).some(key => !["placement", "reward"].includes(key))) return null;
  if (m.method === "showInterstitial" || m.method === "showRewarded") {
    if (typeof payload.placement !== "string" || !token.test(payload.placement)) return null;
    if (payload.reward !== undefined && (typeof payload.reward !== "string" || !token.test(payload.reward))) return null;
  } else if (Object.keys(payload).length) return null;
  return m as BridgeRequest;
}
