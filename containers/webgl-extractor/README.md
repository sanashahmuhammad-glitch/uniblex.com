# WebGL extractor Container skeleton

This package is the proposed data-plane replacement for the single-request
Cloudflare Worker extractor. It is intentionally not deployable against Uniblex
until the control-plane adapters and isolated staging bindings are implemented.

The Container receives only an operation ID and a short-lived opaque execution
token from a Cloudflare Workflow. It resolves the authoritative source key,
staging prefix, limits, owner, build, and expected checksum from Supabase. The
request cannot select arbitrary R2 keys or prefixes.

Extraction model:

1. Claim the operation with compare-and-set state version and a hashed lease.
2. Download the source ZIP to bounded ephemeral disk while hashing it. Reject it
   before parsing if the compressed byte limit or expected checksum differs.
3. Read the ZIP central directory with bounded file count and metadata. Validate
   every normalized path before writing any object.
4. Stream each accepted file from disk to the operation-owned staging prefix.
   Never buffer an archive or extracted build in memory.
5. Persist a deterministic manifest and checksum, then record extraction success.
6. On any failure, mark cleanup pending. Cleanup lists and deletes only the exact
   operation-owned prefix and is safe to retry.

No production deployment configuration, account ID, bucket name, token, or
secret belongs in this package. A future staging deployment must use a separate
account/bucket and inject credentials through Cloudflare secrets.

