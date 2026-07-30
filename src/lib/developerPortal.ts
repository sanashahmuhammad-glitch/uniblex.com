export const DEVELOPER_STATUSES = [
  "draft",
  "uploading",
  "upload_failed",
  "verification_pending",
  "verification_failed",
  "ready_for_review",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "published",
  "unpublished",
  "archived"
] as const;

export type DeveloperSubmissionStatus = (typeof DEVELOPER_STATUSES)[number];

export const STATUS_COPY: Record<DeveloperSubmissionStatus, { label: string; detail: string }> = {
  draft: { label: "Draft", detail: "Only your studio can see this submission." },
  uploading: { label: "Uploading", detail: "Files are transferring directly to secure object storage." },
  upload_failed: { label: "Upload failed", detail: "One or more files need to be retried." },
  verification_pending: { label: "Verification pending", detail: "Uniblex is checking the build manifest and media." },
  verification_failed: { label: "Verification failed", detail: "The build report contains issues that must be fixed." },
  ready_for_review: { label: "Ready for review", detail: "All required submission checks have passed." },
  submitted: { label: "Submitted", detail: "Your submission is safely queued." },
  under_review: { label: "Under review", detail: "A reviewer is testing the game and listing." },
  changes_requested: { label: "Changes requested", detail: "Review the developer-visible feedback and resubmit." },
  approved: { label: "Approved", detail: "The submission passed review and is ready for publishing." },
  rejected: { label: "Rejected", detail: "The submission cannot be accepted in its current form." },
  published: { label: "Published", detail: "The approved game is live on Uniblex." },
  unpublished: { label: "Unpublished", detail: "This release is no longer public and remains in your history." },
  archived: { label: "Archived", detail: "This submission is retained as read-only history." }
};

export const PUBLIC_PORTAL_NAV = [
  { href: "/developers/docs", label: "Documentation" },
  { href: "/developers/sdk", label: "SDK" },
  { href: "/developers/guidelines", label: "Guidelines" },
  { href: "/developers/publishing", label: "Publishing" },
  { href: "/developers/monetization", label: "Monetization" },
  { href: "/developers/faq", label: "FAQ" },
  { href: "/developers/support", label: "Support" }
];

export const PRIVATE_PORTAL_NAV = [
  { href: "/developers/dashboard", label: "Overview" },
  { href: "/developers/games", label: "My Games" },
  { href: "/developers/games/new", label: "Submit a Game" },
  { href: "/developers/submissions", label: "Submissions" },
  { href: "/developers/uploads", label: "Upload History" },
  { href: "/developers/notifications", label: "Notifications" },
  { href: "/developers/profile", label: "Studio Profile" },
  { href: "/developers/team", label: "Team" },
  { href: "/developers/billing", label: "Billing" }
];

export const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    body: "Create a developer account, complete your studio profile, and prepare a browser-playable build. Public documentation is available without signing in; a verified account is required to save or submit games."
  },
  {
    id: "account-setup",
    title: "Account and studio setup",
    body: "Use a monitored email address and accurate studio identity. Add a support address, country, portfolio, and website where available. Accept the current Terms and Privacy Policy before submitting."
  },
  {
    id: "game-submission",
    title: "Game submission",
    body: "Complete Game Details, Game Options, Media, WebGL Build, and Review. Drafts are private. Submission locks the reviewed snapshot while leaving your published game unchanged."
  },
  {
    id: "unity-webgl",
    title: "Unity WebGL export",
    body: "Export a WebGL build with an index.html entry point and its Build and TemplateData assets. Test a clean export in a modern Chromium browser. Do not include editor caches, source projects, or platform executables."
  },
  {
    id: "html5",
    title: "HTML5 submission",
    body: "Place index.html at the package root. Use relative HTTPS-safe asset paths and bundle every runtime dependency that your license permits. External runtime downloads must be declared and approved."
  },
  {
    id: "zip-structure",
    title: "ZIP folder structure",
    body: "The archive must contain a single playable root, use forward-slash relative paths, and avoid duplicate or case-colliding names. Absolute paths, parent traversal, symbolic links, hidden downloads, and executable files are rejected."
  },
  {
    id: "compression",
    title: "Brotli, Gzip, and MIME types",
    body: "Uniblex detects Brotli, Gzip, and uncompressed builds. Keep loader references consistent with the exported filenames. JavaScript uses application/javascript, WebAssembly uses application/wasm, and data files use application/octet-stream with the matching Content-Encoding."
  },
  {
    id: "canvas",
    title: "Responsive canvas and focus",
    body: "A 16:9 responsive canvas is preferred. It must fit its frame without cropping or page overflow. Keyboard input should begin only after intentional focus, and fullscreen must be user initiated and reversible."
  },
  {
    id: "mobile",
    title: "Mobile controls",
    body: "Touch targets must remain reachable in portrait and landscape modes you declare. Prevent accidental page zoom and scrolling only inside the active game surface, not across the surrounding portal."
  },
  {
    id: "performance",
    title: "Loading and asset optimization",
    body: "Show meaningful loading progress, compress textures and audio, remove unused assets, and keep startup work bounded. A game should become interactive promptly on a typical broadband connection and recover gracefully from a failed asset request."
  },
  {
    id: "media",
    title: "Artwork requirements",
    body: "Provide original or licensed artwork that accurately represents play. Covers should be 16:9 at 1920×1080 or higher, card thumbnails 4:3 at 1200×900 or higher, and screenshots at least 1280 pixels wide without unrelated overlays."
  },
  {
    id: "quality",
    title: "Quality expectations",
    body: "The game must load without broken assets or console errors. Controls, pause, audio, and fullscreen should work where relevant. UI must not crop, mobile layouts must not overflow, and metadata must match the submitted build."
  },
  {
    id: "safety",
    title: "Content, IP, privacy, and safety",
    body: "Submit only content you are authorized to distribute. Malware, mining, credential collection, deceptive behavior, adult or hateful content, illegal content, redirects, popups, hidden downloads, and unapproved external ad SDKs are prohibited. Collect no user data unless Uniblex has approved the purpose and disclosure."
  },
  {
    id: "rejections",
    title: "Common rejection reasons",
    body: "Typical causes include a missing entry point, broken relative paths, incorrect compression headers, misleading artwork, cropped controls, slow startup, unlicensed assets, undisclosed network calls, or a mismatch between supported devices and actual behavior."
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: "Reproduce the issue from a clean browser profile, inspect the browser console and Network panel, confirm exact filename casing, then export a fresh archive. Upload failures report whether hashing, signing, transfer, or HEAD verification failed."
  }
] as const;

export const QUALITY_CHECKS = [
  "Loads successfully with no broken assets or browser console errors",
  "Keyboard, touch, gamepad, pause, audio, and fullscreen work where declared",
  "Canvas fits without cropped UI, forced resolution, or mobile overflow",
  "Textures, audio, scripts, and startup time are reasonably optimized",
  "Metadata and artwork accurately represent the submitted build",
  "All assets are original, licensed, or otherwise authorized",
  "No malware, redirects, popups, mining, credential capture, or hidden downloads",
  "No external advertising SDK or user-data collection unless approved",
  "No adult, hateful, illegal, deceptive, or infringing content"
] as const;

export function readableStatus(status: string) {
  return STATUS_COPY[status as DeveloperSubmissionStatus]?.label || status.replaceAll("_", " ");
}

