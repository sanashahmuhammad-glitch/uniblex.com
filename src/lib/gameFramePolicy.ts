export const GAME_SANDBOX = "allow-scripts allow-same-origin allow-pointer-lock";
export function safeGameFrameUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  if (/^\/webgl-loader\/[0-9a-f-]{36}$/i.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.username || url.password || url.protocol !== "https:") return undefined;
    if (["uniblex.com", "www.uniblex.com"].includes(url.hostname)) return /^\/webgl-loader\/[0-9a-f-]{36}$/i.test(url.pathname) ? url.href : undefined;
    return url.href;
  } catch { return undefined; }
}
