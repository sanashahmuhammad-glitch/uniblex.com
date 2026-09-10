export const SCANNER_VERSION = "1.0.0";
export type ScanFinding = { path: string; code: string };
const rules: [string, RegExp][] = [
  ["popup", /\b(?:window\.)?open\s*\(/i],
  ["top_navigation", /\b(?:top|parent)\s*(?:\.|\[)[\s\S]{0,40}(?:location|document)/i],
  ["redirect", /\blocation\s*(?:\.|\[|=)/i],
  ["external_script", /<script[^>]+src\s*=\s*["']?(?:https?:)?\/\//i],
  ["iframe_injection", /createElement\s*\(\s*["']iframe|<iframe/i],
  ["mining", /coinhive|cryptonight|webminer|stratum\+tcp/i],
  ["download", /\bdownload\s*=|\.download\s*=|showSaveFilePicker/i],
  ["dynamic_execution", /\beval\s*\(|new\s+Function\s*\(/i],
  ["external_network", /https?:\/\/|wss?:\/\//i],
];
export function scanBuildText(path: string, text: string): ScanFinding[] {
  return rules.filter(([, pattern]) => pattern.test(text)).map(([code]) => ({ path, code }));
}
