export const SDK_EVENTS = ["sdk_init", "game_loading_start", "game_loading_stop", "game_ready", "gameplay_start", "gameplay_stop", "ad_request", "ad_available", "ad_started", "ad_completed", "ad_skipped", "ad_failed", "ad_blocked", "ad_closed"] as const;
export function createSdkTelemetry(slug: string) {
  const session = crypto.randomUUID();
  let events: Array<{ event: string; placement?: string; adType?: string }> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer); timer = undefined;
    if (!events.length) return;
    const batch = events; events = [];
    void fetch(`/api/games/${encodeURIComponent(slug)}/sdk-events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, events: batch }), keepalive: true }).catch(() => {});
  };
  return { emit(event: string, adType?: string, placement?: string) { if (events.length >= 20) return; events.push({ event, adType, placement }); if (!timer) timer = setTimeout(flush, 5000); }, destroy: flush };
}
