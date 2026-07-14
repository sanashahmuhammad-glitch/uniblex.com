# Fail-closed route contracts

All routes apply the quarantine guard before any operation. All mutation routes
require an authenticated admin and an `Idempotency-Key` matching the documented
format. Errors expose `{ "error": "<sanitized message>", "code": "<stable code>" }`.
No response contains signed URLs except the short-lived part URL response from
initiate, and signed URLs are never logged.

## POST `/api/admin/games/builds/initiate`

Input: title/slug metadata, compressed byte size, optional existing draft game
locator, and requested upload characteristics. The slug is validated and must use
an approved staging/test namespace until production approval.

Server transaction: resolve `auth.uid()`, verify admin, resolve any game, generate
operation/build IDs and unique source/staging/destination bindings, create the
authoritative operation, then create multipart upload using only stored values.
Persist the returned upload ID before returning URLs. If persistence fails, abort
the multipart upload and record cleanup failure visibly.

Output: operation ID, safe build summary, part size/count, and short-lived signed
part URLs. Never return the raw multipart upload ID, bucket, credentials, or a
caller-selectable object key.

## POST `/api/admin/games/builds/complete`

Input: operation ID and ordered `{partNumber, etag}` evidence only. Lock the
owner-scoped operation; load stored upload/build/key/size/count; reject wrong
state, duplicates, gaps, invalid ETags, expired intent, or stale version. Complete
R2 multipart, HEAD the exact stored source key, reconcile size/checksum, then mark
`source_ready` and enqueue the operation. Replays return the stored outcome. A
queue failure leaves a retryable `source_ready` state, never extraction success.

## POST `/api/admin/games/builds/abort`

Input: operation ID. Resolve owner and stored multipart identity. `initiated` or
`uploading` may abort; already aborted/cleaned returns the prior result; source-
ready or later states require the explicit cleanup/delete contract. Record abort
success only after R2 abort succeeds or R2 authoritatively reports it absent.

## GET `/api/admin/games/builds/status?operationId=...`

Owner-scoped read projection only: sanitized state, progress counters, detected
build type, safe validation messages, timestamps, and retry availability. Omit
bucket/key details, upload IDs, tokens, receipts, signed URLs, and internal errors.

## POST `/api/admin/games/actions` — `preview`

Input: operation ID. Requires `ready_for_preview`, owner match, valid manifest,
and an unexpired admin session. Return a short-lived admin-only preview URL or
proxy token scoped to the immutable staging manifest. It never changes the public
game pointer.

## POST `/api/admin/games/actions` — `publish`

Input: operation ID. Claim a publish operation from `ready_for_preview`. Workflow
copies only manifest-listed objects into a new empty immutable build prefix,
verifies object count/bytes/checksums, stores a receipt, then calls transactional
activation. Database activation atomically changes the active build pointer only
when operation, build, game, prefix, and manifest evidence match.

## POST `/api/admin/games/actions` — `rollback`

Input: game locator plus target historical build locator. The database resolves
both, verifies the target belongs to the same game and remains complete, and
creates an operation with immutable from/to pointers. No R2 copy or deletion is
performed. Transactional activation swaps the pointer once; replay returns the
same receipt.

## POST `/api/admin/games/actions` — `unpublish`

Input: game locator. The database captures the current active build and clears
public visibility/pointer transactionally while retaining immutable build objects.
It cannot target another game or delete objects.

## POST `/api/admin/games/actions` — `delete`

Input: build/operation locator. The database resolves the owned build and rejects
an active or referenced prefix. Workflow lists the exact recorded prefix, verifies
every key remains under it, deletes bounded batches, repeats to empty, records a
receipt, and only then marks deleted. Retry resumes from database intent. A build
that becomes active causes compare-and-set failure before deletion starts.

