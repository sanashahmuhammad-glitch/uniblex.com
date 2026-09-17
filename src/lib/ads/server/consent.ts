import { createHmac, timingSafeEqual } from "crypto";
import { normalizeConsentState, type ConsentState } from "@/lib/ads/consent";

export const CONSENT_STATE_COOKIE = "__Host-uniblex_consent_state";
type SealedConsent = ConsentState & { expiresAt: string };

function validSecret(secret: string | undefined): secret is string { return typeof secret === "string" && secret.length >= 32; }
function sign(payload: string, secret: string) { return createHmac("sha256", secret).update(payload).digest("base64url"); }

/** For a future trusted CMP/server callback. Phase 2A exposes no browser setter. */
export function sealConsentState(value: ConsentState, secret: string, expiresAt: Date) {
  if (!validSecret(secret) || value.status === "unknown" || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) throw new Error("Consent state cannot be sealed.");
  const payload = Buffer.from(JSON.stringify({ ...normalizeConsentState(value), expiresAt: expiresAt.toISOString() } satisfies SealedConsent)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Client-provided consent is never authoritative; only a current server seal is accepted. */
export function verifySealedConsent(token: string | undefined, secret: string | undefined): ConsentState | null {
  if (!token || token.length > 1600 || !validSecret(secret)) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SealedConsent>;
    const state = normalizeConsentState(decoded);
    if (state.status === "unknown" || typeof decoded.expiresAt !== "string" || Date.parse(decoded.expiresAt) <= Date.now()) return null;
    return state;
  } catch { return null; }
}
