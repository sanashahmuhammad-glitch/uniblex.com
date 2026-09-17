import type { AdType } from "@/lib/ads/protocol";

export type AdsRuntimeConfig = {
  globalEnabled: boolean;
  interstitialEnabled: boolean;
  rewardedEnabled: boolean;
  providerEnabled: boolean;
  providerKey: string | null;
  rolloutPercent: number;
};

const providerKey = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const enabled = (value: string | undefined) => value === "true";

export function readAdsRuntimeConfig(env: Record<string, string | undefined>): AdsRuntimeConfig {
  const rawProvider = (env.UNIBLEX_ADS_PROVIDER || "").trim();
  const rawRollout = Number(env.UNIBLEX_ADS_ROLLOUT_PERCENT);
  return {
    globalEnabled: enabled(env.UNIBLEX_ADS_ENABLED),
    interstitialEnabled: enabled(env.UNIBLEX_ADS_INTERSTITIAL_ENABLED),
    rewardedEnabled: enabled(env.UNIBLEX_ADS_REWARDED_ENABLED),
    providerEnabled: enabled(env.UNIBLEX_ADS_PROVIDER_ENABLED),
    providerKey: providerKey.test(rawProvider) ? rawProvider : null,
    rolloutPercent: Number.isInteger(rawRollout) && rawRollout >= 0 && rawRollout <= 100 ? rawRollout : 0,
  };
}

export function runtimeEligibility(config: AdsRuntimeConfig, type: AdType) {
  if (!config.globalEnabled || config.rolloutPercent === 0) return { allowed: false, status: "unavailable" as const, reason: "platform_disabled" };
  if (type === "interstitial" ? !config.interstitialEnabled : !config.rewardedEnabled) return { allowed: false, status: "unavailable" as const, reason: "format_disabled" };
  if (!config.providerEnabled || !config.providerKey) return { allowed: false, status: "unavailable" as const, reason: "provider_disabled" };
  return { allowed: true as const };
}
