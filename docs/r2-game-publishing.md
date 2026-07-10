# Uniblex R2 Game Publishing

The admin panel uploads ZIP builds directly from the browser to Cloudflare R2 with S3-compatible presigned multipart URLs. Vercel Functions only create upload sessions, complete uploads, and update Supabase metadata; the ZIP bytes never pass through Vercel.

## Required Environment

Set these in Vercel:

- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`, for example `https://games-cdn.uniblex.com`
- `R2_EXTRACT_WORKER_URL`, for example `https://uniblex-game-extractor.<account>.workers.dev/extract`
- `R2_EXTRACT_WORKER_CLEANUP_URL`, for example `https://uniblex-game-extractor.<account>.workers.dev/cleanup`
- `R2_EXTRACT_WORKER_SECRET`
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`

Set these as Cloudflare Worker bindings/secrets:

- `GAME_BUILDS_BUCKET`, an R2 bucket binding
- `EXTRACT_WORKER_SECRET`
- `PUBLIC_R2_BASE_URL`

The Worker source is [workers/r2-game-extractor.ts](../workers/r2-game-extractor.ts). It expects `fflate` in the Worker project.

## R2 CORS

Configure the bucket to allow browser multipart uploads from the admin origin:

```json
[
  {
    "AllowedOrigins": ["https://www.uniblex.com", "https://uniblex.com"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "etag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Published Asset Behavior

The Worker validates that the ZIP normalizes to a build root with `index.html` plus Unity WebGL assets in `Build/`: `.loader.js`, `.framework.js`, `.wasm`, and `.data`, including `.br` or `.gz` variants.

Extracted objects are written with:

- `index.html`: `Cache-Control: no-cache, max-age=0`
- Other assets: `Cache-Control: public, max-age=31536000, immutable`
- Unity `.wasm.br`, `.data.br`, `.framework.js.br`: `Content-Encoding: br`
- Unity `.wasm.gz`, `.data.gz`, `.framework.js.gz`: `Content-Encoding: gzip`
- Correct `Content-Type` for HTML, JS, CSS, JSON, WASM, images, and audio

Use an R2 custom domain such as `games-cdn.uniblex.com`. Published games load at `/games/[slug]` through the Supabase `games.iframe_url` value, so new builds do not require a GitHub commit or Vercel redeploy.
