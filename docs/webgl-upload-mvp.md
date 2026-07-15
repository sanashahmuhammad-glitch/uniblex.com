# WebGL client-upload MVP

The MVP is disabled unless `R2_GAME_UPLOADS_ENABLED` is exactly `true`. The
browser validates and extracts ZIP files in a dedicated Web Worker, stores one
extracted file at a time in IndexedDB, obtains short-lived exact-key signatures in
batches of 20, uploads directly to an operation-owned R2 prefix, and asks the
server to verify every expected object before preview or publication.

## Staging prerequisites

1. Create a separate Supabase staging project and apply the three
   `20260714000*webgl_client_upload*` migrations there only.
2. Create a separate R2 staging bucket. Do not share a bucket or prefix with live
   games.
3. Configure R2 CORS for the staging admin origin. Allow `PUT`, `GET`, and `HEAD`;
   allow `Content-Type`, `Content-Encoding`, `Cache-Control`,
   `X-Amz-Meta-Sha256`, `X-Amz-Checksum-Sha256`, and `If-None-Match`;
   expose `Content-Length` and `X-Amz-Meta-Sha256`.
4. Configure staging-only Supabase URL/anon/service-role values and R2 account,
   bucket, access key, secret, and public base URL in the staging deployment.
5. Keep `R2_GAME_UPLOADS_ENABLED=false` until migrations, CORS, bucket isolation,
   and a staging build have been independently reviewed. Enable it only in the
   isolated staging deployment for testing.
6. Run `node scripts/test-webgl-mvp.mjs`, TypeScript, and the production build
   before any staged upload.

The R2 public domain must return the manifest-provided MIME, Content-Encoding,
and cache behavior and must permit cross-origin GET requests from the reusable
loader. No extraction Worker, Container, Queue, or Workflow is used.

## Operational limits

- ZIP: 1 GB
- Extracted build: 4 GB
- Individual file: 512 MB
- Files: 5,000
- Path: 512 characters and 20 segments
- Compression ratio: 200:1
- Signed batch: 20 files; URL lifetime: 60 seconds

Incomplete operations expire after 24 hours and remain queryable for an approved
cleanup job. Cancellation lists and deletes only the exact operation prefix and
fails visibly if the prefix cannot be proven empty. Abort remains in `aborting`
until every recorded signed-upload lease has expired, then a retry performs the
final exact-prefix cleanup.
