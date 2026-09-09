import { AdManager } from "./manager";
import { isTrustedGameMessage, LIFECYCLE_METHODS, parseBridgeRequest, type AdRequest } from "./protocol";

/** Bind a single frame, never a game-provided ID. No wildcard privileged replies. */
export function attachGameBridge(frame: HTMLIFrameElement, entryUrl: string, manager = new AdManager(null, false), telemetry: (event: string) => void = () => {}) {
  const origin = new URL(entryUrl, window.location.href).origin;
  // Only a cross-origin executable build can receive host privileges.
  if (origin === window.location.origin || origin === "null") return () => manager.destroy();
  let session = crypto.randomUUID();
  let count = 0;
  let epoch = Date.now();
  let disposed = false;
  const seen = new Set<string>();
  const reset = () => { session = crypto.randomUUID(); seen.clear(); manager.cancelNavigation(); };
  const unsubscribe = manager.subscribe((name, adType, placement) => {
    if (name !== "ad_started" || disposed) return;
    frame.contentWindow?.postMessage({ protocol: "uniblex", version: 2, type: "event", session, event: "adStarted", payload: { adType, placement } }, origin);
  });
  const listener = async (event: MessageEvent) => {
    if (!isTrustedGameMessage(event, frame.contentWindow, origin) || disposed) return;
    if (Date.now() - epoch > 60000) { count = 0; epoch = Date.now(); }
    if (++count > 120) return;
    const m = parseBridgeRequest(event.data);
    if (!m) return;
    if (m.method !== "init" && m.session !== session) return;
    if (seen.has(m.requestId) || seen.size >= 2048) return;
    seen.add(m.requestId);
    const requestSession = session;
    let payload: unknown;
    if (m.method === "init") { telemetry("sdk_init"); payload = { session, interstitial: manager.available("interstitial"), rewarded: manager.available("rewarded") }; }
    else if (m.method === "getCapabilities") payload = { interstitial: manager.available("interstitial"), rewarded: manager.available("rewarded") };
    else if (m.method === "showInterstitial" || m.method === "showRewarded") payload = await manager.show(m.requestId, m.method === "showRewarded" ? "rewarded" : "interstitial", m.payload as AdRequest);
    else if ((LIFECYCLE_METHODS as readonly string[]).includes(m.method)) { telemetry(m.method); payload = { accepted: true }; }
    else payload = { status: "blocked", rewardGranted: false, reason: "unsupported_method" };
    if (!disposed && requestSession === session) frame.contentWindow?.postMessage({ protocol: "uniblex", version: 2, type: "response", requestId: m.requestId, session, payload }, origin);
  };
  frame.addEventListener("load", reset);
  window.addEventListener("message", listener);
  return () => { disposed = true; unsubscribe(); manager.destroy(); frame.removeEventListener("load", reset); window.removeEventListener("message", listener); };
}
