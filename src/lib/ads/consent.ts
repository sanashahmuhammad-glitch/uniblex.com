export const CONSENT_STATUSES = ["unknown", "allowed", "limited", "denied"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];
export type ConsentJurisdiction = "unknown" | "eea_uk_ch" | "us" | "other";
export type ConsentFramework = "none" | "tcf" | "gpp" | "custom";

export type ConsentState = {
  status: ConsentStatus;
  jurisdiction: ConsentJurisdiction;
  framework: ConsentFramework;
  policyVersion: string | null;
  source: "host" | "cmp" | "user";
  updatedAt: string | null;
};

const UNKNOWN_CONSENT: ConsentState = Object.freeze({
  status: "unknown",
  jurisdiction: "unknown",
  framework: "none",
  policyVersion: null,
  source: "host",
  updatedAt: null,
});

const jurisdictionValues = new Set<ConsentJurisdiction>(["unknown", "eea_uk_ch", "us", "other"]);
const frameworkValues = new Set<ConsentFramework>(["none", "tcf", "gpp", "custom"]);
const sourceValues = new Set<ConsentState["source"]>(["host", "cmp", "user"]);
const shortToken = /^[A-Za-z0-9._-]{1,80}$/;

export function unknownConsentState(): ConsentState {
  return { ...UNKNOWN_CONSENT };
}

/** Provider-neutral metadata only. Raw consent strings and network identifiers are intentionally excluded. */
export function normalizeConsentState(value: unknown): ConsentState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return unknownConsentState();
  const input = value as Partial<ConsentState>;
  const status = CONSENT_STATUSES.includes(input.status as ConsentStatus) ? input.status as ConsentStatus : "unknown";
  const jurisdiction = jurisdictionValues.has(input.jurisdiction as ConsentJurisdiction) ? input.jurisdiction as ConsentJurisdiction : "unknown";
  const framework = frameworkValues.has(input.framework as ConsentFramework) ? input.framework as ConsentFramework : "none";
  const source = sourceValues.has(input.source as ConsentState["source"]) ? input.source as ConsentState["source"] : "host";
  const policyVersion = typeof input.policyVersion === "string" && shortToken.test(input.policyVersion) ? input.policyVersion : null;
  const updatedAt = typeof input.updatedAt === "string" && !Number.isNaN(Date.parse(input.updatedAt)) ? new Date(input.updatedAt).toISOString() : null;
  return { status, jurisdiction, framework, policyVersion, source, updatedAt };
}

export function consentPermitsAds(state: ConsentState, supportsLimited = false) {
  return state.status === "allowed" || (state.status === "limited" && supportsLimited);
}

export function consentPermitsAnalytics(state: ConsentState) {
  return state.status === "allowed";
}

export class ConsentStateStore {
  private state: ConsentState = unknownConsentState();
  private listeners = new Set<() => void>();

  getSnapshot = () => this.state;
  getServerSnapshot = () => UNKNOWN_CONSENT;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };

  set(next: unknown) {
    const normalized = normalizeConsentState(next);
    if (normalized.status !== "unknown" && !normalized.updatedAt) normalized.updatedAt = new Date().toISOString();
    this.state = Object.freeze(normalized);
    for (const listener of this.listeners) listener();
  }

  withdraw(metadata: Partial<Omit<ConsentState, "status">> = {}) {
    this.set({ ...this.state, ...metadata, status: "denied", source: metadata.source || "user", updatedAt: new Date().toISOString() });
  }

  reset() { this.set(UNKNOWN_CONSENT); }
}

export const hostConsentState = new ConsentStateStore();
