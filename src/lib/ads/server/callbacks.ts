import { createHash } from "crypto";
import type { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";

export type CallbackInput = { headers: Headers; body: Uint8Array; receivedAt: Date };
type VerifiedFields = {
  providerEventId: string;
  requestId: string;
  eventType: "ready" | "started" | "impression" | "completed" | "skipped" | "failed" | "closed" | "adjustment";
  normalizedStatus?: "completed" | "skipped" | "failed" | "unavailable" | "blocked";
  completionId?: string;
  occurredAt: string;
  verificationKeyId?: string;
  /** Verifier-normalized, non-sensitive metadata only. The raw callback body is hashed, never stored here. */
  payload: Record<string, unknown>;
};
const verifiedCallback = Symbol("verified-provider-callback");
export type VerifiedProviderCallback = VerifiedFields & { providerKey: string; payloadHash: string; [verifiedCallback]: true };

export interface ProviderCallbackVerifier {
  readonly providerKey: string;
  verify(input: CallbackInput): Promise<VerifiedFields | null>;
}

const providerKey = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eventId = /^[A-Za-z0-9._:-]{1,240}$/;
const eventTypes = new Set(["ready", "started", "impression", "completed", "skipped", "failed", "closed", "adjustment"]);
const outcomeTypes = new Set(["completed", "skipped", "failed", "unavailable", "blocked"]);

export class ProviderCallbackRegistry {
  private verifiers = new Map<string, ProviderCallbackVerifier>();
  register(verifier: ProviderCallbackVerifier) {
    if (!providerKey.test(verifier.providerKey) || this.verifiers.has(verifier.providerKey)) throw new Error("Provider verifier registration is invalid.");
    this.verifiers.set(verifier.providerKey, verifier);
  }
  async verify(provider: string, input: CallbackInput): Promise<VerifiedProviderCallback | null> {
    const verifier = this.verifiers.get(provider);
    if (!verifier || input.body.byteLength > 65_536) return null;
    const value = await verifier.verify(input);
    if (!value || !validVerifiedFields(value)) return null;
    return { ...value, providerKey: provider, payloadHash: createHash("sha256").update(input.body).digest("hex"), [verifiedCallback]: true };
  }
}

function validVerifiedFields(value: VerifiedFields) {
  return eventId.test(value.providerEventId) && uuid.test(value.requestId) && !Number.isNaN(Date.parse(value.occurredAt))
    && eventTypes.has(value.eventType) && (!value.normalizedStatus || outcomeTypes.has(value.normalizedStatus))
    && (value.normalizedStatus !== "completed" || (value.eventType === "completed" && !!value.completionId))
    && (!value.completionId || eventId.test(value.completionId)) && (!value.verificationKeyId || value.verificationKeyId.length <= 160)
    && !!value.payload && typeof value.payload === "object" && !Array.isArray(value.payload);
}

/** This accepts only values produced by a registered verifier; there is deliberately no generic callback HTTP route. */
export async function ingestVerifiedProviderCallback(db: ReturnType<typeof createServiceSupabaseClient>, value: VerifiedProviderCallback) {
  if (value[verifiedCallback] !== true) throw new Error("Provider callback was not verified.");
  const { data, error } = await db.rpc("record_verified_ad_provider_event", {
    p_provider_key: value.providerKey, p_request_id: value.requestId, p_provider_event_id: value.providerEventId,
    p_event_type: value.eventType, p_normalized_status: value.normalizedStatus || null,
    p_completion_id: value.completionId || null, p_occurred_at: new Date(value.occurredAt).toISOString(),
    p_verification_key_id: value.verificationKeyId || null, p_payload_hash: value.payloadHash, p_payload: value.payload,
  });
  if (error || !data?.accepted) throw new Error("Verified provider event could not be stored.");
  return { accepted: true, duplicate: data.duplicate === true };
}
