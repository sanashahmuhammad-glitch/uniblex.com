# Implementation and validation plan

## Gate 1 — database review

- Review the new migration independently for PostgreSQL identity semantics,
  service-role checks, RLS, grants, constraints, and forward-only compatibility.
- Add pgTAP/integration tests for all transitions, stale versions, lease expiry,
  idempotency collisions, cross-owner access, activation evidence, active-build
  deletion refusal, and cleanup prefix ownership.
- Do not apply to production. Apply only to an isolated staging database after
  explicit approval.

## Gate 2 — route cutover behind quarantine

- Replace unsafe routes with the exact contracts in `route-contracts.md`.
- Keep the exact feature flag guard as the first executable route operation.
- Mock R2 and Supabase to test client-ID tampering, replay, concurrent complete,
  duplicate abort, queue failure, signed-URL redaction, and cleanup surfacing.

## Gate 3 — Container implementation

- Add reviewed Supabase and R2 adapters; no direct user inputs reach adapters.
- Download ZIP to bounded ephemeral disk with `io.LimitReader`, size reconciliation,
  SHA-256, timeouts, and disk-space reservation.
- Validate central-directory/file count, path normalization, duplicates (including
  case-fold collisions), symlinks/special files, encryption, compression method,
  nested archives, per-file/total sizes, depth, path bytes, and compression ratio.
- Stream one entry at a time, independently count/hash decompressed bytes, reject
  header/stream mismatches, and upload only beneath the operation staging prefix.
- Validate Unity Brotli/Gzip/uncompressed/`.unityweb` and generic HTML5 references,
  then produce a deterministic sorted manifest.
- Heartbeat leases and refuse to finish after lease expiry or state-version change.

## Gate 4 — failure and cleanup tests

- Inject failure at source download, ZIP open, every validation boundary, mid-file
  upload, manifest write, database completion, publish copy, activation, rollback,
  and delete batch.
- Prove cleanup retries delete only operation-owned keys and cannot touch active,
  historical, Moto Rider, or unrelated prefixes.
- Exercise archives with 1, 100, 1,000, and 10,000 small files plus conservative
  maximum byte sizes. Record peak memory, disk, duration, R2 operations, and cost.

## Gate 5 — isolated staging only

- Separate Cloudflare account/bucket, staging Supabase project, staging hostname,
  service identity, queues/workflows, and nonproduction secrets.
- Test slugs must begin `test-webgl-`; public pages remain disabled.
- Do not enable production flag, deploy production Worker/Container, or share a
  production prefix. Staging deployment requires a new explicit approval.

