"use client";
import { useEffect, type RefObject } from "react";
import { attachGameBridge } from "@/lib/ads/bridge";
import { hostConsentState, consentPermitsAds } from "@/lib/ads/consent";
import { createServerEligibilityGate } from "@/lib/ads/eligibility";
import { AdManager } from "@/lib/ads/manager";
import { HostAdSurfaceController } from "@/lib/ads/surface";
import { createSdkTelemetry } from "@/lib/ads/telemetry";
export function useGameBridge(frame: RefObject<HTMLIFrameElement | null>, host: RefObject<HTMLElement | null> | undefined, url: string | undefined, active: boolean, slug?: string, instanceKey?: string | number) {
  useEffect(() => {
    if (!active || !url || !frame.current) return;
    const telemetry = slug ? createSdkTelemetry(slug) : undefined;
    const surface = host?.current ? new HostAdSurfaceController(host.current, frame.current) : undefined;
    const eligibility = slug ? createServerEligibilityGate({ slug }) : false;
    const manager = new AdManager(null, eligibility, (event, type, placement) => telemetry?.emit(event, type, placement), 60000, surface);
    const detach = attachGameBridge(frame.current, url, manager, event => telemetry?.emit(event));
    let previouslyAllowed = consentPermitsAds(hostConsentState.getSnapshot(), true);
    const unsubscribeConsent = hostConsentState.subscribe(() => {
      const allowed = consentPermitsAds(hostConsentState.getSnapshot(), true);
      if (previouslyAllowed && !allowed) manager.withdrawConsent();
      previouslyAllowed = allowed;
    });
    return () => { unsubscribeConsent(); detach(); telemetry?.destroy(); };
  }, [frame, host, url, active, slug, instanceKey]);
}
