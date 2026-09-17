import type { AdRequest, AdResult, AdType } from "./protocol";
import type { AdAuthorization, AdEligibilityContext, AdEligibilityGate } from "./eligibility";
import type { HostAdSurfaceController } from "./surface";

/** Only trusted host code installs an adapter. Provider callbacks never come from game messages. */
export interface AdAdapter {
  readonly name: string;
  initialize(context: { signal: AbortSignal; surface?: HostAdSurfaceController }): Promise<void>;
  isAvailable(type: AdType): boolean;
  showInterstitial(request: AdRequest, context: ProviderShowContext): Promise<ProviderAdResult>;
  showRewarded(request: AdRequest, context: ProviderShowContext): Promise<ProviderAdResult>;
  destroy(): void;
}
export type ProviderAdResult = { status: AdResult["status"]; completionId?: string; verification?: "provider_client" | "server_verified" };
export type ProviderShowContext = { signal: AbortSignal; started: () => void; authorization?: AdAuthorization; surface?: HostAdSurfaceController };
export type AdEvent = "ad_request" | "ad_available" | "ad_started" | "ad_completed" | "ad_skipped" | "ad_failed" | "ad_blocked" | "ad_closed";
export class AdManager {
  private busy = false;
  private destroyed = false;
  private initialized = false;
  private seen = new Set<string>();
  private completions = new Set<string>();
  private controller = new AbortController();
  private lastStarted = -Infinity;
  private subscribers = new Set<(event: AdEvent, type: AdType, placement: string) => void>();
  constructor(private adapter: AdAdapter | null, private eligibility: boolean | AdEligibilityGate = false, private emit: (event: AdEvent, type: AdType, placement: string) => void = () => {}, private timeoutMs = 60000, private surface?: HostAdSurfaceController) {}
  available(type: AdType) { try { return !this.destroyed && (typeof this.eligibility === "boolean" ? this.eligibility : this.eligibility.canRequest(type)) && !!this.adapter?.isAvailable(type); } catch { return false; } }
  async show(id: string, type: AdType, request: AdRequest, eligibilityContext?: AdEligibilityContext): Promise<AdResult> {
    const result = (status: AdResult["status"], reason?: string): AdResult => ({ status, rewardGranted: false, ...(reason ? { reason } : {}) });
    if (this.destroyed || this.seen.has(id) || this.seen.size >= 256 || this.busy || Date.now() - this.lastStarted < 30000) return result("blocked", "request_limit");
    this.seen.add(id);
    this.publish("ad_request", type, request.placement);
    if (typeof this.eligibility === "boolean" && !this.eligibility) { this.publish("ad_blocked", type, request.placement); this.publish("ad_closed", type, request.placement); return result("blocked", "not_eligible"); }
    if (!this.adapter) { this.publish("ad_failed", type, request.placement); this.publish("ad_closed", type, request.placement); return result("unavailable", "no_provider"); }
    this.busy = true;
    const controller = new AbortController();
    const navigationSignal = this.controller.signal;
    const abort = () => controller.abort();
    navigationSignal.addEventListener("abort", abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<AdResult>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(result("failed", "cancelled")), { once: true });
        timer = setTimeout(() => controller.abort(), this.timeoutMs);
      });
      const operation = async (): Promise<AdResult> => {
        let authorization: AdAuthorization | undefined;
        if (typeof this.eligibility !== "boolean") {
          if (!eligibilityContext) return result("blocked", "eligibility_context_missing");
          const decision = await this.eligibility.authorize(id, type, request, eligibilityContext);
          if (decision.status !== "eligible") return result(decision.status, decision.reason);
          authorization = decision.authorization;
        }
        if (!this.initialized) { await this.adapter!.initialize({ signal: controller.signal, surface: this.surface }); this.initialized = true; }
        if (controller.signal.aborted) return result("failed", "cancelled");
        if (!this.available(type)) return result("unavailable", "no_fill");
        if (authorization && typeof this.eligibility !== "boolean" && eligibilityContext
          && !await this.eligibility.consume(authorization, id, type, request, eligibilityContext)) return result("blocked", "ticket_rejected");
        this.publish("ad_available", type, request.placement);
        let started = false;
        const show = type === "rewarded" ? this.adapter!.showRewarded.bind(this.adapter) : this.adapter!.showInterstitial.bind(this.adapter);
        const answer = await show(request, { signal: controller.signal, authorization, surface: this.surface, started: () => {
          if (!started && !controller.signal.aborted) { started = true; this.lastStarted = Date.now(); this.publish("ad_started", type, request.placement); }
        } });
        if (controller.signal.aborted) return result("failed", "cancelled");
        if (answer.status !== "completed") return result(["skipped", "failed", "blocked", "unavailable"].includes(answer.status) ? answer.status : "failed");
        if (!started) return result("failed", "invalid_completion");
        if (type === "interstitial") return { status: "completed", rewardGranted: false };
        if (!answer.completionId || answer.verification !== "server_verified" || this.completions.has(answer.completionId) || !authorization || typeof this.eligibility === "boolean" || !eligibilityContext) return result("failed", "unverified_completion");
        if (!await this.eligibility.redeem(authorization, id, answer.completionId, eligibilityContext)) return result("failed", "redemption_rejected");
        this.completions.add(answer.completionId);
        return { status: "completed", rewardGranted: true };
      };
      const answer = await Promise.race([operation(), timeout]);
      this.publish(answer.status === "completed" ? "ad_completed" : answer.status === "skipped" ? "ad_skipped" : answer.status === "blocked" ? "ad_blocked" : "ad_failed", type, request.placement);
      return answer;
    } catch { this.publish("ad_failed", type, request.placement); return result("failed", "provider_error"); }
    finally { clearTimeout(timer); navigationSignal.removeEventListener("abort", abort); this.surface?.close("request_finished"); this.busy = false; this.publish("ad_closed", type, request.placement); }
  }
  subscribe(callback: (event: AdEvent, type: AdType, placement: string) => void) { this.subscribers.add(callback); return () => this.subscribers.delete(callback); }
  cancelNavigation() { if (this.destroyed) return; this.controller.abort(); this.controller = new AbortController(); this.seen.clear(); this.surface?.close("navigation"); }
  withdrawConsent() { if (this.destroyed) return; this.controller.abort(); this.controller = new AbortController(); this.initialized = false; this.surface?.close("consent_withdrawn"); try { this.adapter?.destroy(); } catch { /* Consent withdrawal must remain failure-safe. */ } this.adapter = null; }
  destroy() { this.destroyed = true; this.controller.abort(); this.surface?.destroy(); try { this.adapter?.destroy(); } catch { /* Teardown cannot interrupt navigation. */ } }
  private publish(event: AdEvent, type: AdType, placement: string) {
    try { this.emit(event, type, placement); } catch { /* Telemetry cannot interrupt gameplay. */ }
    for (const callback of this.subscribers) { try { callback(event, type, placement); } catch { /* Subscribers are isolated. */ } }
  }
}
