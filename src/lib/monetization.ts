export const MONETIZATION_MODES = ["none", "developer_ads", "uniblex_ads", "hybrid"] as const;
export type MonetizationMode = (typeof MONETIZATION_MODES)[number];
export const AD_FORMATS = ["rewarded", "interstitial", "banner", "other"] as const;
export const HOST_AD_FORMATS = ["rewarded", "interstitial"] as const;
export const AUDIENCE_DECLARATIONS = ["not_declared", "general_13_plus", "mixed_or_unknown", "directed_to_children"] as const;
export const AD_POLICY_VERSION = "2026-09-16";
export type PlacementDisclosure = {
  token: string;
  format: (typeof HOST_AD_FORMATS)[number];
  trigger: string;
};
export type MonetizationDisclosure = {
  mode: MonetizationMode;
  provider: string;
  providerVersion: string;
  formats: (typeof AD_FORMATS)[number][];
  placements: PlacementDisclosure[];
  trackers: string[];
  externalHosts: string[];
  audience: (typeof AUDIENCE_DECLARATIONS)[number];
  dataUse: string;
  externalDestinations: boolean;
  notes: string;
  policyVersion: string | null;
};
export const emptyMonetization = (): MonetizationDisclosure => ({ mode: "none", provider: "", providerVersion: "", formats: [], placements: [], trackers: [], externalHosts: [], audience: "not_declared", dataUse: "", externalDestinations: false, notes: "", policyVersion: null });

const placementToken = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
function stringList(value: unknown, label: string, maxItems = 20) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some(item => typeof item !== "string" || !item.trim() || item.length > 200)) throw new Error(`Provide valid ${label}.`);
  return [...new Set((value as string[]).map(item => item.trim()))];
}
function parseExternalHosts(value: unknown) {
  return stringList(value, "external host origins").map(item => {
    try {
      const url = new URL(item);
      if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || item.includes("*")) throw new Error();
      return url.origin.toLowerCase();
    } catch { throw new Error("External hosts must be exact HTTPS origins without paths or wildcards."); }
  });
}
function parsePlacements(value: unknown): PlacementDisclosure[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 24) throw new Error("Provide valid host-managed placements.");
  const parsed = value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Provide valid host-managed placements.");
    const input = item as Record<string, unknown>;
    if (!placementToken.test(String(input.token || "")) || !HOST_AD_FORMATS.includes(input.format as PlacementDisclosure["format"]) || typeof input.trigger !== "string" || !input.trigger.trim() || input.trigger.length > 240) throw new Error("Each host-managed placement needs a safe token, format, and trigger description.");
    return { token: String(input.token), format: input.format as PlacementDisclosure["format"], trigger: input.trigger.trim() };
  });
  if (new Set(parsed.map(item => `${item.format}:${item.token}`)).size !== parsed.length) throw new Error("Host-managed placement tokens must be unique per format.");
  return parsed;
}
export function parseMonetization(value: unknown, submitting = false): MonetizationDisclosure {
  if (value == null) return emptyMonetization();
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid monetization disclosure.");
  const input = value as Record<string, unknown>;
  if (!MONETIZATION_MODES.includes(input.mode as MonetizationMode)) throw new Error("Choose a monetization integration type.");
  const mode = input.mode as MonetizationMode;
  if (mode === "none") return emptyMonetization();
  if (typeof input.provider !== "string" || input.provider.length > 160 || (input.providerVersion != null && (typeof input.providerVersion !== "string" || input.providerVersion.length > 80)) || typeof input.notes !== "string" || input.notes.length > 2000 || (input.dataUse != null && (typeof input.dataUse !== "string" || input.dataUse.length > 1200)) || typeof input.externalDestinations !== "boolean") throw new Error("Complete the advertising disclosure.");
  if (!Array.isArray(input.formats) || input.formats.length > 4 || input.formats.some(format => !AD_FORMATS.includes(format))) throw new Error("Select valid ad formats.");
  const providerVersion = typeof input.providerVersion === "string" ? input.providerVersion.trim() : "";
  const placements = parsePlacements(input.placements);
  const trackers = stringList(input.trackers, "tracker disclosures");
  const externalHosts = parseExternalHosts(input.externalHosts);
  const audience = AUDIENCE_DECLARATIONS.includes(input.audience as MonetizationDisclosure["audience"]) ? input.audience as MonetizationDisclosure["audience"] : "not_declared";
  const dataUse = typeof input.dataUse === "string" ? input.dataUse.trim() : "";
  if (submitting && (!input.formats.length || ((mode === "developer_ads" || mode === "hybrid") && (!input.provider.trim() || !providerVersion)) || ((mode === "uniblex_ads" || mode === "hybrid") && !placements.length) || audience === "not_declared" || !dataUse || input.policyVersion !== AD_POLICY_VERSION)) throw new Error("Disclose provider/version where applicable, formats, host placements, audience, data use, and accept the current advertising policy.");
  return { mode, provider: input.provider.trim(), providerVersion, formats: [...new Set(input.formats)], placements, trackers, externalHosts, audience, dataUse, externalDestinations: input.externalDestinations, notes: input.notes.trim(), policyVersion: input.policyVersion === AD_POLICY_VERSION ? AD_POLICY_VERSION : null };
}
