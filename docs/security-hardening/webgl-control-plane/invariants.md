# Mandatory security invariants

1. **Quarantine first.** Every high-impact route returns HTTP 503 before auth,
   parsing, signing, database, R2, or orchestration work unless and only unless
   `R2_GAME_UPLOADS_ENABLED === "true"`.
2. **Database authority.** A request-supplied identifier is only a locator. Every
   bucket, key, prefix, upload ID, build ID, game ID, owner, size, part count, and
   expected state is loaded from and reconciled against a locked operation row.
3. **Immutable ownership.** Source and extraction prefixes contain a database-
   generated operation UUID. A production build prefix contains a unique build
   UUID. Bindings cannot be reassigned after operation creation.
4. **No overwrite.** Publishing targets a new empty immutable prefix. Any object
   or database claim already present at that prefix aborts publishing; existing
   prefixes are never merged, replaced, or cleaned by a new operation.
5. **Evidence before success.** Source-ready, extraction-ready, published, and
   deleted states require verified side-effect receipts. No success state is
   written before the corresponding R2 and database work succeeds.
6. **Compare-and-set state.** Every transition supplies the expected state
   version under a row lock. Stale, concurrent, replayed, or out-of-order results
   cannot advance state.
7. **Leased execution.** Workflow and Container work uses expiring, hashed leases,
   bounded attempts, and heartbeats. A stale worker cannot complete a reclaimed
   operation.
8. **Idempotent intent.** Administrator mutation requests require owner-scoped
   idempotency keys. Replays return the recorded result; they do not repeat an R2
   mutation or create a second operation.
9. **Scoped cleanup.** Cleanup may list and delete only the exact source/staging
   prefixes bound to its operation. Production prefixes are deleted only through
   a distinct delete operation after verifying they are not active or referenced.
10. **No secret disclosure.** Logs, events, API errors, manifests, and receipts
    omit credentials, cookies, service keys, full signed URLs, multipart upload
    IDs, and raw lease tokens. Client errors use stable sanitized codes.

