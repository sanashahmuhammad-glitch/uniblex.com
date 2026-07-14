# Expected implementation file plan

## Replace or modify later

- Four existing admin route files: replace old RPC use but retain first quarantine
  guard.
- `src/lib/gameBuildState.ts`: replace with generated/read-only state projections.
- `src/lib/r2Multipart.ts`: restrict to stored-authority signing primitives.
- Existing Worker source/config/package: retire from extraction deployment after
  validation tests are ported.
- `docs/r2-game-publishing.md` and `.env.example`: document final architecture and
  keep the production flag disabled.

## Proposed new code

- `src/lib/webgl/controlPlane.ts`, `commands.ts`, `redaction.ts`, and route tests.
- Cloudflare Workflow/Queue package with dispatch, extraction, publish, cleanup,
  delete, DLQ/re-drive, and contract tests.
- Container control/R2 adapters, disk-backed extractor, manifest builder, Unity/
  HTML5 detector, metadata mapper, service endpoint, and tests.
- Database integration/pgTAP tests for RLS, RPCs, leases, commands, activation,
  rollback, unpublish, delete, and cleanup.
- Separate staging-only infrastructure configuration with placeholder bindings;
  no production account IDs or bucket names in source.

