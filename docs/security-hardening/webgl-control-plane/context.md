# WebGL publishing hardening context

## Scope and evidence

This portfolio supersedes the unsafe Phase 1–2 execution design without deleting
its uncommitted evidence. It is based on the working tree at commit
`c31d341f56dceaf2c93e4cad73bf70593302f78b` on
`webgl-upload-hardening`, the quarantined routes, the two local migrations, the
single-request Worker, and its tests.

Production remains protected by the first-route guard
`process.env.R2_GAME_UPLOADS_ENABLED !== "true"`. This design does not enable the
flag, apply migrations, deploy code, or contact live services.

## Trust boundaries

- The browser is untrusted. Its operation ID is only a lookup locator; all owner,
  build, upload, bucket, key, prefix, size, part-count, and state values come from
  a locked database row.
- Next.js admin routes authenticate the administrator but do not own workflow
  state. They call narrowly scoped service-side RPCs.
- Supabase is the authority for identity, immutable resource bindings, state,
  leases, idempotency, activation, cleanup intent, and audit history.
- Cloudflare Workflow/Queue transports only an operation ID and a short-lived
  opaque execution token. It owns retry timing, not resource selection.
- The extraction Container is an untrusted worker relative to authority. It may
  act only under a leased operation and can write only its operation-owned
  staging prefix.
- R2 is a data store, not a source of application state. An immutable manifest
  and verified receipt bridge R2 side effects to a transactional database pointer
  activation.

## Primary failure of the superseded design

The single Worker request performs one or more R2 subrequests per extracted file.
Unity archives with hundreds or thousands of files can exceed request limits and
cannot reliably resume after partial extraction. The existing database operation
model also permits application-owned state completion without a durable lease and
without sufficiently strong, immutable resource ownership.

