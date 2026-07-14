# Exact API contract matrix

Common rules: first executable guard is
`process.env.R2_GAME_UPLOADS_ENABLED !== "true"` → HTTP 503 with the existing
quarantine body. Then require an authenticated admin. Mutations require a valid
`Idempotency-Key`. Any supplied UUID is a lookup locator, never authority.

| Route | Accepted client input | Authoritative lookup and allowed state | RPC / side effect ordering | Success / failure |
|---|---|---|---|---|
| `POST builds/initiate` | title, `test-webgl-*` slug, description/category metadata, compressed size, requested part size | route resolves admin; RPC validates optional draft game and generates operation/build/key/prefix; new operation only | `webgl_create_upload_operation`; create R2 multipart using returned stored key; `webgl_record_multipart_created`; sign stored part numbers | `201` operation ID, part size/count, expiring part URLs. R2-create then DB failure triggers abort+cleanup record. `400/401/403/409/503`, sanitized. |
| `POST builds/complete` | operation locator, ordered part number/ETag list | owner-scoped locked operation; `uploading`; stored upload ID/key/build/expected size/count | `webgl_request_command(complete)`; R2 complete; HEAD stored key; verify bytes/checksum; `webgl_finalize_complete`; enqueue only after source receipt | `202` operation/state. Replay returns same command result. Queue failure remains `source_ready`. Evidence mismatch `409/422`; cleanup surfaced. |
| `POST builds/abort` | operation locator | owner-scoped operation; only `initiated/uploading`; stored upload ID/key | `webgl_request_command(abort)`; abort exact stored multipart; `webgl_finalize_abort`; enqueue scoped cleanup if source exists | `200` prior/final aborted result. Later state `409`; R2 uncertainty `502` with retryable command, never false success. |
| `GET builds/status` | operation locator | owner-scoped RLS projection | read-only owner view/RPC; no service secrets | `200` sanitized state/progress/results; `404` for missing or foreign locator; never disclose keys, upload IDs, tokens, receipts, signed URLs. |
| `POST actions:preview` | operation locator | owner operation in `ready_for_preview`; sealed manifest | read-only preview-token RPC scoped to operation/build/admin/expiry | `200` short-lived admin-only preview URL/token. No public pointer or status mutation. |
| `POST actions:publish` | operation locator | owner operation in `ready_for_preview`; complete sealed manifest; destination binding | request publish command; Workflow claims; assert destination empty; copy manifest; verify; `webgl_finalize_publish` atomically activates | `202`; status endpoint reports result. Existing prefix/nonempty/stale → command failed, old active build unchanged. |
| `POST actions:rollback` | game locator, historical build locator | DB resolves both; admin; target belongs to same game and is sealed/complete; current pointer locked | request rollback command with DB-validated immutable target; `webgl_finalize_rollback` swaps pointer transactionally; no R2 mutation | `200/202` authoritative pointers. Replay returns same result; stale/current mismatch `409`. |
| `POST actions:unpublish` | game locator | DB resolves current game/build under lock | request command; `webgl_finalize_unpublish` removes public visibility/pointer but preserves build objects | `200`; replay stable. Does not delete R2. |
| `POST actions:delete` | build or operation locator | DB resolves owner/game/build/prefix; rejects active or referenced build | request delete; Workflow rechecks inactive, lists exact recorded prefix, verifies every key, deletes batches, proves empty; `webgl_finalize_delete` | `202`; retries resume. Any active-reference race aborts before deletion; partial delete remains running/cleanup-needed, never deleted. |

The route must map database errors to stable public codes. Internal R2 errors,
receipts, SQL details, signed URLs, tokens, and object identifiers are log-redacted.

