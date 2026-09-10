import type { AdRequest, AdResult, AdType } from "./protocol";

/** Only trusted host code installs an adapter. Provider callbacks never come from game messages. */
export interface AdAdapter {
  readonly name: string;
  initialize(signal: AbortSignal): Promise<void>;
  isAvailable(type: AdType): boolean;
  show(type: AdType, request: AdRequest, context: { signal: AbortSignal; started: () => void }): Promise<{ status: AdResult["status"]; completionId?: string }>;
  destroy(): void;
}
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
  constructor(private adapter: AdAdapter | null, private eligible = false, private emit: (event: AdEvent, type: AdType, placement: string) => void = () => {}, private timeoutMs = 60000) {}
  available(type: AdType) { try { return !this.destroyed && this.eligible && !!this.adapter?.isAvailable(type); } catch { return false; } }
  async show(id: string, type: AdType, request: AdRequest): Promise<AdResult> {
    const result = (status: AdResult["status"], reason?: string): AdResult => ({ status, rewardGranted: false, ...(reason ? { reason } : {}) });
    if (this.destroyed || this.seen.has(id) || this.seen.size >= 256 || this.busy || Date.now() - this.lastStarted < 30000) return result("blocked", "request_limit");
    this.seen.add(id);
    this.publish("ad_request", type, request.placement);
    if (!this.eligible) { this.publish("ad_blocked", type, request.placement); this.publish("ad_closed", type, request.placement); return result("blocked", "not_eligible"); }
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
        if (!this.initialized) { await this.adapter!.initialize(controller.signal); this.initialized = true; }
        if (controller.signal.aborted) return result("failed", "cancelled");
        if (!this.available(type)) return result("unavailable", "no_fill");
        this.publish("ad_available", type, request.placement);
        let started = false;
        const answer = await this.adapter!.show(type, request, { signal: controller.signal, started: () => {
          if (!started && !controller.signal.aborted) { started = true; this.lastStarted = Date.now(); this.publish("ad_started", type, request.placement); }
        } });
        if (controller.signal.aborted) return result("failed", "cancelled");
        if (answer.status !== "completed") return result(["skipped", "failed", "blocked", "unavailable"].includes(answer.status) ? answer.status : "failed");
        if (!started || !answer.completionId || this.completions.has(answer.completionId)) return result("failed", "invalid_completion");
        this.completions.add(answer.completionId);
        return { status: "completed", rewardGranted: type === "rewarded" };
      };
      const answer = await Promise.race([operation(), timeout]);
      this.publish(answer.status === "completed" ? "ad_completed" : answer.status === "skipped" ? "ad_skipped" : answer.status === "blocked" ? "ad_blocked" : "ad_failed", type, request.placement);
      return answer;
    } catch { this.publish("ad_failed", type, request.placement); return result("failed", "provider_error"); }
    finally { clearTimeout(timer); navigationSignal.removeEventListener("abort", abort); this.busy = false; this.publish("ad_closed", type, request.placement); }
  }
  subscribe(callback: (event: AdEvent, type: AdType, placement: string) => void) { this.subscribers.add(callback); return () => this.subscribers.delete(callback); }
  cancelNavigation() { if (this.destroyed) return; this.controller.abort(); this.controller = new AbortController(); this.seen.clear(); }
  destroy() { this.destroyed = true; this.controller.abort(); try { this.adapter?.destroy(); } catch { /* Teardown cannot interrupt navigation. */ } }
  private publish(event: AdEvent, type: AdType, placement: string) {
    try { this.emit(event, type, placement); } catch { /* Telemetry cannot interrupt gameplay. */ }
    for (const callback of this.subscribers) { try { callback(event, type, placement); } catch { /* Subscribers are isolated. */ } }
  }
}
