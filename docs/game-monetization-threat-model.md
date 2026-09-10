# Game monetization threat model

## Scope and security objective

This review covers the Browser SDK v2, the game iframe host bridge, ad manager boundary, Developer Portal disclosure and review flow, build upload verification and static scanning, operational SDK telemetry, and the additive database migration. The objective is to let untrusted browser games request approved platform capabilities without letting game code impersonate another game, authorize ads or rewards, mutate review state, escape build boundaries, obtain secrets, or create trusted revenue records.

## Assets

- User sessions, Supabase access tokens, service-role credentials, R2 credentials, and future provider credentials.
- Published game identity and immutable approved build/media relationships.
- Reviewer decisions, private scan findings, and monetization disclosures.
- Ad eligibility, provider completion identities, reward decisions, and future revenue integrity.
- The top-level Uniblex page, navigation, user interaction, and service availability.

## Trust boundaries and data flow

1. Untrusted uploaded JavaScript runs in a sandboxed, normally cross-origin iframe. `src/lib/gameFramePolicy.ts:1-9` limits capabilities and executable URLs.
2. SDK requests cross the iframe boundary. `src/lib/ads/bridge.ts:19-35` validates the exact frame source and origin, session, request identity, method, and response session. `src/lib/ads/protocol.ts:14-26` bounds the message structure and tokens.
3. The host ad manager is trusted to install a provider adapter. `src/lib/ads/manager.ts:23-60` applies eligibility, concurrency, cooldown, timeout, started-state, completion-ID, and replay checks. No adapter is configured by default.
4. Developer requests cross an authenticated API boundary. Routes verify the bearer session and recheck owner IDs before service-role mutations. Direct database mutation grants are revoked by `supabase/migrations/20260906110817_game_monetization.sql:26-45`.
5. Build metadata and bytes cross the upload/storage boundary. `src/lib/webglMvpManifest.ts:43-91` rejects dangerous paths and resource abuse. `src/app/api/developer/uploads/build/route.ts:53-63` rechecks the full manifest and exact prefix contents before recording a server scan and verification.
6. Browser lifecycle events cross an untrusted telemetry boundary. `src/app/api/games/[slug]/sdk-events/route.ts:5-23` bounds the request and the database stores it only as `unverified_browser`; SQL adds global and session budgets.

## Attacker capabilities

- A game developer controls all HTML, JavaScript, WASM, asset names, declared metadata, SDK calls, and network activity inside their frame.
- The game can generate arbitrary `postMessage` traffic, repeat or reorder messages, navigate or destroy its frame, and fabricate browser telemetry.
- A developer user can call public/authenticated HTTP and PostgREST endpoints directly and tamper with request bodies, cursors, manifests, object keys, and IDs.
- A third-party page or sibling iframe can send messages to the host window but does not control the trusted game frame's `WindowProxy` or browser-supplied origin.
- An attacker does not initially possess Supabase service-role, R2 secret, reviewer, or future provider credentials.

## Primary threats and controls

- **Cross-game or cross-origin command spoofing:** game identity comes from the mounted player; exact source/origin and rotating sessions are required. Duplicate IDs and excessive calls are rejected.
- **Reward spoofing or replay:** game messages cannot submit completion. Completion must come through the host-only adapter after its `started` signal and include a previously unseen completion ID. Every unsuccessful state returns `rewardGranted: false`.
- **Top-page escape and phishing:** sandbox tokens omit top navigation, popups, forms, and downloads. HTTPS and first-party loader URL validation reject active and credential-bearing URL schemes.
- **Upload verification bypass:** server-owned manifests bind owner, operation, path, size, digest, and object prefix. The final step re-heads every file and compares the complete prefix, independent of the client cursor. Paths, nested archives, executables, size, depth, and compression ratio are bounded.
- **Reviewer-state forgery:** developers lose direct insert/update/delete privileges on submission, media, and build tables. Scan rows are reviewer-readable and service-writable only; approval is a reviewer-authorized database function with disclosure and scan gates.
- **Telemetry and revenue fraud:** browser events are explicitly unverified, contain no client revenue value, and have size, batch, origin, game, session, and per-minute limits. Future accounting requires provider-authenticated server ingestion.
- **Credential disclosure:** the game-facing SDK and bridge payloads contain capability flags, session/request correlation, lifecycle acknowledgements, and ad results only. Provider and storage secrets remain server-side.
- **SDK/provider failure denial of service:** SDK initialization and calls time out and settle to safe results; adapter, telemetry, subscriber, navigation, teardown, and missing-host failures do not block game startup.

## Residual risk and assumptions

- Static indicators cannot prove arbitrary JavaScript or WASM safe. Publication still requires human review, and flagged or limit-exceeding scans require private notes.
- `allow-scripts` and `allow-same-origin` are required for common cross-origin game engines. Isolation therefore depends on games being hosted away from the application origin and on the restrictive sandbox and URL policy remaining intact.
- Developer-managed ads remain code inside the untrusted game origin. Uniblex does not attest to provider completions from those ads.
- Browser telemetry can be forged and is suitable only for operational diagnosis. It cannot support billing, rewards, revenue share, or payouts.
- A future production adapter needs provider-specific server callback verification, consent/privacy review, domain allowlisting, and isolated rendering before eligibility can be enabled.
