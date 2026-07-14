# Current 21-file patch classification

## Reusable unchanged

- `src/lib/r2UploadValidation.ts` — bounded multipart input validation remains a
  route-side validation layer; database reconciliation is still mandatory.
- `workers/r2-game-extractor/zip-security.ts` — reusable as a behavioral
  specification and small-fixture validator.
- `workers/r2-game-extractor/build-detection.ts` — reusable detection rules after
  results are independently verified by the Container.
- `workers/r2-game-extractor/tests/zip-security.test.ts`
- `workers/r2-game-extractor/tests/build-detection.test.ts`
- `workers/r2-game-extractor/tests/multipart-validation.test.ts`

## Reusable after modification

- `src/lib/r2Multipart.ts` — retain only as an R2 signing primitive; callers must
  supply identifiers resolved from the authoritative operation row.
- `workers/r2-game-extractor/tests/streaming-extraction.test.ts` — port fixtures
  and assertions to the disk-backed Container extractor.
- `workers/r2-game-extractor/tests/state-machine.test.ts` — retarget to RPC-level
  compare-and-set, lease, activation, and cleanup semantics.
- `workers/r2-game-extractor/package.json`
- `workers/r2-game-extractor/package-lock.json`
- `workers/r2-game-extractor/tsconfig.json`
- `workers/r2-game-extractor/vitest.config.ts` — retain temporarily to run the
  TypeScript validation corpus during migration to Container tests.

## Unsafe; replace in the next implementation phase

- `src/app/api/admin/games/builds/initiate/route.ts`
- `src/app/api/admin/games/builds/complete/route.ts`
- `src/app/api/admin/games/builds/abort/route.ts`
- `src/app/api/admin/games/actions/route.ts` — keep quarantine unchanged, then
  replace old operation RPC use with the contracts in `route-contracts.md`.
- `src/lib/gameBuildState.ts` — application-owned transitions are superseded by
  service-only, versioned database transitions.
- `supabase/migrations/20260713000100_harden_game_build_state_machine.sql` — do not
  apply; it is retained as review evidence and superseded by the new control-plane
  migration.
- `workers/r2-game-extractor.ts` — single-request extraction is not reliable for
  large Unity archives and is replaced by Workflow plus Container.
- `workers/r2-game-extractor/wrangler.toml` — Worker staging config is not the
  selected extraction runtime; replace later with reviewed Workflow bindings.

## Temporary/test-only

- No Codex scratch artifact remains. `.codex-zip-insert.txt` is absent and was not
  required by application code, tests, build tooling, or documentation.
- The existing Worker package is test-only until its reusable validation corpus is
  ported. It must not be deployed.

