# Game monetization and Browser SDK v2

Monetized browser games may be submitted to Uniblex when their advertising is disclosed and passes policy, automated, and human review. Developer-managed advertising remains untrusted game code. Host-managed advertising uses Browser SDK v2 so the game requests an ad while the trusted host retains eligibility, provider, rendering, and completion decisions.

No production ad provider or revenue sharing is enabled by this change. The host returns `blocked` or `unavailable` when no eligible provider adapter is configured, and browser telemetry is never revenue or payout evidence.

## Architecture

```text
Developer Game
      |
Uniblex Browser SDK v2
      |
Validated postMessage bridge
      |
Uniblex Game Player
      |
Host Ad Manager
      |
Provider Adapter
      |
Future approved provider
```

```text
Developer Portal
      |
Game Submission
      |
Monetization Disclosure
      |
Stored-build verification and static scan
      |
Authorized human review
      |
Approval
      |
Publish
```

## SDK contract

Load `/sdk/uniblex-sdk-v2.js` with `defer` and start the game independently. `init()` is optional and failure safe. Lifecycle methods are `game.loadingStart()`, `game.loadingStop()`, `game.ready()`, `game.gameplayStart()`, and `game.gameplayStop()`. The ad API exposes `ads.isAvailable(type?)`, `ads.getCapabilities()`, `ads.showInterstitial(options)`, and `ads.showRewarded(options)`.

Ad calls always settle with `completed`, `skipped`, `failed`, `unavailable`, or `blocked`. A rewarded result grants a reward only after the host adapter reports that the ad started and supplies a new trusted completion ID. The game should pause before the request, resume in `finally`, and award only when both `status === "completed"` and `rewardGranted === true`.

Events are `adRequested`, `adStarted`, `adCompleted`, `adSkipped`, `adFailed`, and `adClosed`. The v1 file and its lifecycle contract are unchanged.

## Trust and permissions

Uploaded game code is untrusted. The host derives the game from the rendered frame and never accepts a game-provided game ID. Privileged messages require the exact frame window, exact frame origin, protocol version, session, unique request ID, and a validated bounded payload. Replies use the known game origin rather than `*`.

The game iframe grants only:

- `allow-scripts` so browser games can execute.
- `allow-same-origin` so cross-origin R2 games retain normal origin behavior required by common engines.
- `allow-pointer-lock` for game controls.

The frame does not grant popups, forms, downloads, top navigation, or presentation privileges. Executable games must use HTTPS and first-party loader URLs must match the exact loader route. Build manifests reject traversal, ambiguous URL delimiters, nested archives, platform executables, excessive depth, file count, file size, extracted size, and compression ratio. R2 objects are checked against the complete stored manifest after paginated verification. Text-capable files receive a bounded server-side indicator scan; limits and suspicious findings force reviewer attention. A scan is a triage aid, not a safety certification.

The SDK receives no user identity, access token, storage credential, provider key, or revenue information. Operational SDK events use a random browser session and contain only event, placement, ad type, SDK version, game relation resolved by the server, and timestamp. They are stored as `unverified_browser` signals. Future impression and earnings accounting must ingest provider-authenticated server data in separate tables and workflows.

## Review workflow

Developers select no monetization, developer-managed ads, host-managed ads, or hybrid. Monetized submissions disclose provider, formats, external destinations, notes, and the accepted policy version. Existing games default to `none`.

Only authorized reviewers can read scan findings. Approval requires the monetization checklist and a stored scan record. Flagged scans require private reviewer notes. Developers cannot directly write submissions, build verification, media verification, review records, or scan records through PostgREST; server endpoints authenticate the bearer session and recheck ownership.

## Configuration

Existing Developer Portal and upload variables remain required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID` or `CLOUDFLARE_R2_ACCOUNT_ID`, `R2_BUCKET` or `CLOUDFLARE_R2_BUCKET`, `R2_ACCESS_KEY_ID` or `CLOUDFLARE_R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` or `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_BASE_URL` or `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.

Set `SDK_TELEMETRY_ENABLED=true` to retain unverified operational SDK events. It defaults off. No provider credentials are defined until an approved adapter is implemented. Provider secrets must remain server-side.

## Local verification

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For an interactive check, run `pnpm dev`, open `/developers/sdk`, `/game-monetization-policy`, and a game detail page at desktop and mobile widths. A standalone test game should continue immediately when the SDK host is absent. A framed game on a separate local origin can call `init({ hostOrigin: "http://localhost:3000" })`; without a configured adapter, ad calls must settle without granting a reward.

Apply `supabase/migrations/20260906110817_game_monetization.sql` only through the normal reviewed migration process after staging validation and a database backup. The local database test applies every migration to a fresh PGlite database and exercises authorization and approval gates.

## Rollback

Before deployment, discard or revert this branch to remove all application changes; no production state has been changed. After a migration deployment, first roll the application back, then use a reviewed database migration that restores the canonical `review_developer_submission` function from `20260809000300_live_game_revisions.sql`, drops the new guard and synchronization triggers/functions, drops `sdk_events`, `sdk_event_buckets`, and `build_security_scans`, removes `game_submissions.monetization` and `games.monetization_mode`, and restores only the prior grants. Back up event and disclosure data before dropping columns or tables.
