# Workflow, Queue, and recovery design

## Dispatch

Next.js commits an owner-scoped command before enqueueing. The message contains
only command/operation IDs plus a trace ID. Duplicate delivery is expected.
Consumers claim the command using command version, bounded attempts, and an
expiring hashed lease. Only the claimant receives a short-lived Container token.

## Extraction lifecycle

1. Workflow claims `enqueue_extraction`, then asks the database to claim the
   operation lease.
2. Start a Container with operation ID and opaque token. Recommended initial
   timeout: 30 minutes, maximum 60 after staging evidence; heartbeat every 30
   seconds; lease 120 seconds and renewable up to the job deadline.
3. Container retrieves bindings server-side, reserves bounded ephemeral disk,
   downloads and hashes source, validates the complete archive, then streams files
   to the staging prefix.
4. Container uploads a deterministic manifest last. Workflow verifies its receipt
   and calls the fixed extraction finalizer.
5. Crash or lease expiry returns work to the queue after exponential backoff with
   jitter (1m, 5m, 20m, 1h; five attempts). A stale Container cannot finalize.

## Cleanup and dead letters

Failed/aborted operations transition to `cleanup_pending`. A separate cleanup
command claims a lease, lists only the exact database-bound source/staging
prefixes, validates every returned key, deletes bounded batches, and proves both
prefixes empty before finalization. Cleanup is idempotent; missing objects count as
success only after an authoritative empty listing.

After maximum attempts, commands enter a dead-letter queue and retain
`cleanup_pending` or `failed`—never a success state. An admin sees a sanitized
manual-intervention code. Re-drive creates an audited command attempt; it does not
edit state directly.

## Publish recovery

The Workflow copies manifest-listed objects to a newly generated immutable prefix.
If it crashes, replay first compares the exact receipt/manifest and resumes missing
objects; any conflicting existing object fails closed. Activation is one locked
database transaction. A crash before activation leaves the old build live and the
new prefix inactive. A crash after activation replays the recorded success.

## Observability

Structured logs include trace, operation, command, build, game, fixed action,
state/version, attempt, lease age, duration, byte/file counts, and sanitized error
code. Metrics cover queue age, attempt counts, extraction duration, peak disk,
bytes/files, validation failures, cleanup latency, DLQ depth, activation conflicts,
and R2 operation counts. Never log raw leases, multipart IDs, credentials, cookies,
service keys, full signed URLs, or unfiltered provider errors.

