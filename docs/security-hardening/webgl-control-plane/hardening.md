# WebGL control-plane hardening proposal

## Decision

Replace the current single-request extraction and application-owned state model
with Supabase authority, Workflow/Queue orchestration, Container extraction,
operation-owned staging prefixes, and immutable transactional activation.

## Security outcome

The redesign removes client authority over R2 identities, makes state transitions
compare-and-set and auditable, prevents overwriting existing prefixes, separates
data-plane failure from public activation, and makes cleanup both retryable and
scope-verifiable. It preserves the production quarantine throughout migration.

## Tradeoffs

This adds a Container runtime, a durable orchestration layer, and more database
RPC surface. It also adds immutable-copy storage/operation cost. Those costs buy
bounded memory, recoverable extraction, explicit ownership, and a publication
commit point that a large WebGL pipeline requires.

## Current readiness

The architecture and local schema are ready for independent review, not staging.
The Container is only a fail-closed skeleton. Routes still implement the
superseded operation design. No migration has been applied and no adapter,
Workflow, Queue, staging binding, or deployment configuration exists.

