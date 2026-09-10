export const MONETIZATION_MODES = ["none", "developer_ads", "uniblex_ads", "hybrid"] as const;
export type MonetizationMode = (typeof MONETIZATION_MODES)[number];
export const AD_FORMATS = ["rewarded", "interstitial", "banner", "other"] as const;
export const AD_POLICY_VERSION = "2026-09-06";
export type MonetizationDisclosure = {
  mode: MonetizationMode;
  provider: string;
  formats: (typeof AD_FORMATS)[number][];
  externalDestinations: boolean;
  notes: string;
  policyVersion: string | null;
};
export const emptyMonetization = (): MonetizationDisclosure => ({ mode: "none", provider: "", formats: [], externalDestinations: false, notes: "", policyVersion: null });
export function parseMonetization(value: unknown, submitting = false): MonetizationDisclosure {
  if (value == null) return emptyMonetization();
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid monetization disclosure.");
  const input = value as Record<string, unknown>;
  if (!MONETIZATION_MODES.includes(input.mode as MonetizationMode)) throw new Error("Choose a monetization integration type.");
  const mode = input.mode as MonetizationMode;
  if (mode === "none") return emptyMonetization();
  if (typeof input.provider !== "string" || input.provider.length > 160 || typeof input.notes !== "string" || input.notes.length > 2000 || typeof input.externalDestinations !== "boolean") throw new Error("Complete the advertising disclosure.");
  if (!Array.isArray(input.formats) || input.formats.length > 4 || input.formats.some(format => !AD_FORMATS.includes(format))) throw new Error("Select valid ad formats.");
  if (submitting && (!input.formats.length || ((mode === "developer_ads" || mode === "hybrid") && !input.provider.trim()) || input.policyVersion !== AD_POLICY_VERSION)) throw new Error("Disclose the provider and formats and accept the current advertising policy.");
  return { mode, provider: input.provider.trim(), formats: [...new Set(input.formats)], externalDestinations: input.externalDestinations, notes: input.notes.trim(), policyVersion: input.policyVersion === AD_POLICY_VERSION ? AD_POLICY_VERSION : null };
}
