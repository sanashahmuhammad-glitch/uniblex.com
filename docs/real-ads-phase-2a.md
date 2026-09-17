# Real Ads Phase 2A foundation

Phase 2A adds provider-neutral control, request, completion, and accounting primitives. It does not integrate a provider, serve an ad, grant a trusted reward, or create revenue. The migration and runtime fail closed.

## Runtime gates

All of these server-only variables are optional during Phase 2A. Missing values are equivalent to disabled values. They must not use the `NEXT_PUBLIC_` prefix.

- `UNIBLEX_ADS_ENABLED`
- `UNIBLEX_ADS_INTERSTITIAL_ENABLED`
- `UNIBLEX_ADS_REWARDED_ENABLED`
- `UNIBLEX_ADS_ROLLOUT_PERCENT`
- `UNIBLEX_ADS_PROVIDER_ENABLED`
- `UNIBLEX_ADS_PROVIDER`
- `UNIBLEX_ADS_SCRIPT_ORIGINS`
- `UNIBLEX_ADS_FRAME_ORIGINS`
- `UNIBLEX_ADS_CONNECT_ORIGINS`
- `UNIBLEX_ADS_MEDIA_ORIGINS`
- `UNIBLEX_GAME_FRAME_ORIGINS`
- `UNIBLEX_CONSENT_STATE_SECRET` (future server-side CMP sealing only)

Phase 2A requires all ad switches to stay absent or `false`, rollout to stay absent or `0`, and all provider origin lists to stay empty. `SDK_TELEMETRY_ENABLED` remains absent or `false`. No provider credentials are defined.

## Consent behavior

The host state supports `unknown`, `allowed`, `limited`, and `denied`, plus a small jurisdiction, framework, policy-version, source, and timestamp record. Unknown and denied block ad requests. Limited requires a future adapter that explicitly supports limited/contextual ads. Withdrawal blocks future requests and destroys the active adapter. Raw consent strings and IP addresses are outside this model. A future provider launch still needs a reviewed CMP and legal implementation; this state machine is only a technical gate.

Analytics loads only when the host state is `allowed`. It stays unloaded for unknown, limited, and denied. Phase 2A does not infer or fabricate consent and does not add a consent prompt. Ad eligibility additionally requires a current server-signed consent state; a browser-supplied `allowed` value cannot authorize an ad. No Phase 2A endpoint issues that seal.

## Trusted request flow

The game sends only an SDK request ID, format, and reviewed placement token. The host adds its private session and exact iframe origin. The server derives game, developer, and current published build from trusted records. Runtime switches, database switches, format, approval, exact build, placement, consent, provider health, rollout, frequency, concurrency, backoff, and exact origin must all pass.

The server then stores only a SHA-256 ticket hash and returns the random short-lived ticket to host code. The ticket is consumed atomically with all bindings rechecked. It is never posted to the game iframe. A verified provider-specific callback must create a signed provider event and server-verified outcome before a rewarded request can be redeemed. Redemption is atomic and one-use.

There is deliberately no generic callback endpoint. A future provider adapter must add a concrete verifier for its signing scheme, key rotation, timestamp window, and nonce semantics before registering a callback route.

## Database migration

`supabase/migrations/20260915235915_real_ads_phase_2a_foundation.sql` is additive. It creates disabled configuration, provider, placement, rollout, frequency, request, verified event, normalized outcome, reward redemption, impression, report import, reconciliation, ledger, allocation, and minimal consent-audit primitives. Transaction-scoped advisory locks make cap decisions atomic without growing a lock table. Public access is revoked and RLS is enabled. Reviewers can read only non-sensitive configuration; requests, provider events, consent audit, and accounting remain service-only. Provider events, outcomes, redemptions, impressions, report rows, ledger entries, allocations, and consent audit are append-only. Corrections use adjustment records.

Rollback before any real data exists is the reverse dependency-order removal of the new trigger, functions, policies, and tables in a maintenance window. After trusted events or financial records exist, do not drop the migration; disable every switch and ship a forward migration that preserves history.

## Future provider launch checklist

1. Select and contract with a provider and choose a revenue allocation agreement outside code review.
2. Perform privacy/legal review and add a jurisdiction-appropriate CMP.
3. Add a provider adapter and a provider-specific callback verifier with test vectors.
4. Add only the provider's documented exact CSP origins and server-side credentials.
5. Create disabled provider, policy, placement, and rollout records; rehearse on isolated staging.
6. Reconcile provider reports to verified impressions before creating ledger entries.
7. Enable in small, monitored steps with rollback and circuit-breaker thresholds.
