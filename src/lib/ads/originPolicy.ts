export type AdOriginKind = "script" | "frame" | "connect" | "media";
export type AdOriginPolicy = Record<AdOriginKind, ReadonlySet<string>>;

export function exactHttpsOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.includes("*")) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin.toLowerCase();
  } catch { return null; }
}

function originSet(value: string | undefined) {
  return new Set((value || "").split(",").map(item => exactHttpsOrigin(item.trim())).filter((item): item is string => !!item));
}

/** Missing provider origin settings produce empty allowlists. */
export function readAdOriginPolicy(env: Record<string, string | undefined>): AdOriginPolicy {
  return {
    script: originSet(env.UNIBLEX_ADS_SCRIPT_ORIGINS),
    frame: originSet(env.UNIBLEX_ADS_FRAME_ORIGINS),
    connect: originSet(env.UNIBLEX_ADS_CONNECT_ORIGINS),
    media: originSet(env.UNIBLEX_ADS_MEDIA_ORIGINS),
  };
}

export function providerOriginAllowed(policy: AdOriginPolicy, kind: AdOriginKind, value: unknown) {
  const origin = exactHttpsOrigin(value);
  return !!origin && policy[kind].has(origin);
}

export function eligibleGameFrameOrigin(entryUrl: string, hostOrigin: string) {
  try {
    const origin = exactHttpsOrigin(new URL(entryUrl, hostOrigin).origin);
    return origin && origin !== exactHttpsOrigin(hostOrigin) ? origin : null;
  } catch { return null; }
}
