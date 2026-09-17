import Link from "next/link";
const example = `<script src="/sdk/uniblex-sdk-v2.js" defer></script>
<script>
// Start your game independently of SDK readiness.
startGame();
const sdk = window.UniblexSDK;
if (sdk) {
  sdk.init().then(() => sdk.game.ready()).catch(() => {});
}
async function levelComplete() {
  pauseGame();
  try {
    await sdk?.ads?.showInterstitial({ placement: "level_complete" });
  } finally { resumeGame(); }
}
// Call this only from the player's explicit reward choice.
async function chooseReward() {
  pauseGame();
  try {
    const result = await sdk?.ads?.showRewarded({ placement: "reward", reward: "coins" });
    if (result?.status === "completed" && result.rewardGranted) grantCoins();
  } finally { resumeGame(); }
}
</script>`;
export function SdkV2Docs() {
  return <section className="mx-auto max-w-6xl px-5 py-10 text-white"><h2 className="font-heading text-3xl">SDK v2 · optional host-managed advertising</h2><p className="mt-4 leading-7 text-uniblex-gray">Use one SDK version per page. The v1 download and lifecycle API remain unchanged. Version 2 keeps init() and game.loadingStart(), loadingStop(), ready(), gameplayStart(), and gameplayStop(). Games must start and remain playable when the SDK or host is absent.</p>
    <a className="btn-secondary mt-5" href="/sdk/uniblex-sdk-v2.js" download>Download SDK v2</a><pre className="mt-5 overflow-x-auto rounded-xl bg-black/30 p-5 text-sm"><code>{example}</code></pre>
    <div className="mt-6 grid gap-5 md:grid-cols-2">{[
      ["Availability", "ads.isAvailable() returns a cached boolean; await ads.getCapabilities() refreshes interstitial and rewarded capability flags. Availability may change. The host currently fails closed: real ads are disabled and no production provider is configured."],
      ["Results and events", "Ad promises settle with completed, skipped, failed, unavailable, or blocked and rewardGranted. Subscribe with on(event, callback), which returns an unsubscribe function. Events: adRequested, adStarted, adCompleted, adSkipped, adFailed, adClosed. Pause before the call and resume in finally; do not depend on an ad starting."],
      ["Timeouts and errors", "Initialization times out after 2.5 seconds; ad requests after 65 seconds. Invalid requests, blockers, missing host, provider errors, and navigation fail gracefully. No reward is granted for a failed, skipped, unavailable, or blocked ad. Prevent concurrent reward button clicks."],
      ["Security and privacy", "The bridge validates source, exact origin, protocol version, session, and request ID. A requested placement must match the reviewed game and published build before the host can issue a short-lived one-use ticket. Games receive no ticket, account identity, private credentials, or revenue data. A local game can alter its own score; authoritative rewards require independently verified provider completion and atomic server redemption."],
      ["Local development", "Serve the game on a separate origin, such as localhost:3001 inside localhost:3000. init({ hostOrigin: 'http://localhost:3000' }) supports explicit local hosting. Normally the SDK uses document.referrer. Standalone play needs no host."],
      ["Review and rendering", "Disclose provider/version, formats, placement tokens and triggers, trackers, exact external hosts, audience, data use, and ad destinations in the Developer Portal. Scans and manual review precede publication. The SDK is independent of WebGL/WebGPU; rendering fallback must be implemented and tested by each game build."],
    ].map(([title, body]) => <section className="card p-5" key={title}><h3 className="font-bold">{title}</h3><p className="mt-3 leading-7 text-uniblex-gray">{body}</p></section>)}</div><Link className="mt-5 block text-uniblex-blue underline" href="/game-monetization-policy">Game Monetization &amp; Advertising Policy</Link></section>;
}
