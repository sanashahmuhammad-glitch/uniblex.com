import { SCANNER_VERSION, scanBuildText, type ScanFinding } from "./buildSecurityScan";
import { readMvpText, type R2MvpConfig } from "./r2Mvp";

const MAX_SCAN_FILES = 64;
const MAX_SCAN_BYTES = 16 * 1024 * 1024;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const SCAN_CONCURRENCY = 6;

export async function scanStoredBuild(config: R2MvpConfig, files: Array<{ path: string; objectKey: string; size: number }>) {
  const findings: ScanFinding[] = [];
  let bytes = 0;
  const candidates = files.filter((file) => /\.(html?|js|mjs|css|json|svg)(\.(gz|br))?$/i.test(file.path));
  if (candidates.length > MAX_SCAN_FILES) findings.push({ path: "", code: "manual_review_file_limit" });
  const selected: typeof candidates = [];
  for (const file of candidates.slice(0, MAX_SCAN_FILES)) {
    if (file.size > MAX_FILE_BYTES || bytes + file.size > MAX_SCAN_BYTES) {
      findings.push({ path: file.path, code: "manual_review_size_limit" });
      continue;
    }
    bytes += file.size;
    selected.push(file);
  }
  for (let index = 0; index < selected.length && findings.length < 200; index += SCAN_CONCURRENCY) {
    const results = await Promise.all(selected.slice(index, index + SCAN_CONCURRENCY).map(async (file) => {
      try { return scanBuildText(file.path, await readMvpText(config, file.objectKey, MAX_FILE_BYTES)); }
      catch { return [{ path: file.path, code: "manual_review_unreadable" } satisfies ScanFinding]; }
    }));
    findings.push(...results.flat());
    if (findings.length >= 200) { findings.push({ path: "", code: "manual_review_findings_limit" }); break; }
  }
  return { status: findings.length ? "flagged" : "pending", findings, scanner_version: SCANNER_VERSION, scanned_at: new Date().toISOString() };
}
