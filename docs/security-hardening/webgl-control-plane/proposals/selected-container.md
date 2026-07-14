# Selected proposal: durable control plane plus Container data plane

## Apply

Use Supabase as the authoritative ledger, Cloudflare Workflow/Queue for durable
orchestration, and a Cloudflare Container for bounded disk-backed ZIP extraction.
Publish only into a new immutable prefix and activate it with one database pointer
transaction after a verified receipt exists.

## Reject

- Do not extend the current single-request Worker extractor.
- Do not let the browser choose bucket, key, prefix, upload ID, build ID, owner, or
  state.
- Do not reuse or clear a prefix belonging to an existing build.
- Do not represent an R2 side effect as successful before verification.
- Do not make cleanup a best-effort log-only action.

## Review threshold

This proposal may advance only after independent SQL/RLS review, route cutover
tests, completed Container adapters, failure injection, and isolated scale tests.

