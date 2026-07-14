# Automated and scale test plan

## Database/RLS

- Cross-game and cross-owner operation, build, command, preview, publish, rollback,
  unpublish, delete, and cleanup attempts.
- Authenticated direct INSERT/UPDATE/DELETE against builds, operations, commands,
  and events; forged success/final state; service RPC called as anon/authenticated.
- Duplicate idempotency key, duplicate delivery, stale version, concurrent claim,
  lease expiry/reclaim, stale lease completion, and attempt/DLQ boundaries.
- Replayed publish/rollback/delete and concurrent active-pointer transitions.

## Archive and Container

- CRC mismatch; local/central header mismatch; encrypted, symlink, special-file,
  nested, malformed, traversal, absolute, drive, UNC, NUL, invalid UTF-8, duplicate
  normalized/case-folded path, unsupported method, ZIP64 overflow, overlapping
  entry, excessive count/size/depth/path/ratio, and decompressed stream overrun.
- Valid Unity Brotli/Gzip/uncompressed/`.unityweb` and generic HTML5 fixtures;
  missing/mismatched references and mixed compression.
- Deterministic manifest and source/object checksums across repeated runs.
- 100, 1,000, and 10,000 small files; peak memory/disk, duration, heartbeat,
  Container timeout, R2 operation count, and cost.

## Failure injection and cleanup

- Crash after source completion; before/after queue send; during source download;
  during validation; mid-file upload; after all objects but before manifest; after
  manifest but before DB finalization; mid-publish copy; before/after activation.
- Cleanup/delete crash per batch, empty-list races, malicious unexpected key,
  prefix mismatch, active-build race, and unrelated prefix visibility.
- Prove the old live pointer and all existing prefixes remain unchanged for every
  failed publish, rollback, delete, and cleanup test.

