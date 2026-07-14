# Estimated implementation phases

1. **Schema completion and independent review (3–5 engineering days):** finish
   narrow finalizers, pgTAP tests, RLS/grants review, and migration rehearsal in an
   disposable database.
2. **Route authority cutover (3–5 days):** implement contracts behind quarantine,
   mocks, tamper/replay/concurrency tests, and redaction.
3. **Container engine (7–12 days):** adapters, disk/download controls, two-pass ZIP
   validation, format detection, manifest/metadata, cleanup, and fault injection.
4. **Workflow/Queue control plane (4–7 days):** leases, retries, publish/copy,
   cleanup/delete, DLQ/re-drive, observability, and integration tests.
5. **Isolated staging and scale validation (5–10 days plus soak):** provision only
   after approval; run representative Unity archives and failure matrix; measure
   cost/capacity.
6. **Production-readiness review (2–4 days):** threat-model delta, rollback drill,
   operational runbook, PR review, and explicit owner approval. Production remains
   disabled until this gate passes.

Ranges are planning estimates, not commitments; ZIP fixture diversity and staging
runtime behavior are the main uncertainty.

