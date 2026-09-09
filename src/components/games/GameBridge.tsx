"use client";
import { useEffect, type RefObject } from "react";
import { attachGameBridge } from "@/lib/ads/bridge";
import { AdManager } from "@/lib/ads/manager";
import { createSdkTelemetry } from "@/lib/ads/telemetry";
export function useGameBridge(frame: RefObject<HTMLIFrameElement | null>, url: string | undefined, active: boolean, slug?: string, instanceKey?: string | number) {
  useEffect(() => {
    if (!active || !url || !frame.current) return;
    const telemetry = slug ? createSdkTelemetry(slug) : undefined;
    const manager = new AdManager(null, false, (event, type, placement) => telemetry?.emit(event, type, placement));
    const detach = attachGameBridge(frame.current, url, manager, event => telemetry?.emit(event));
    return () => { detach(); telemetry?.destroy(); };
  }, [frame, url, active, slug, instanceKey]);
}
