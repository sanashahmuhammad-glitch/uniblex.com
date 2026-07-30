export type DeveloperBuildFile = {
  path: string;
  size: number;
};

export const DEVELOPER_BUILD_SIGNING_SECONDS = 900;
export const DEVELOPER_BUILD_MAX_ATTEMPTS = 3;
export const DEVELOPER_BUILD_SMALL_FILE_CONCURRENCY = 2;
export const DEVELOPER_BUILD_LARGE_FILE_BYTES = 8 * 1024 * 1024;
export const DEVELOPER_BUILD_PUT_TIMEOUT_MS = 30 * 60 * 1000;

export function planDeveloperBuildUploads<T extends DeveloperBuildFile>(files: T[]) {
  const pending = [...files];
  return {
    large: pending
      .filter((file) => file.size >= DEVELOPER_BUILD_LARGE_FILE_BYTES)
      .sort((left, right) => right.size - left.size || left.path.localeCompare(right.path)),
    small: pending
      .filter((file) => file.size < DEVELOPER_BUILD_LARGE_FILE_BYTES)
      .sort((left, right) => right.size - left.size || left.path.localeCompare(right.path))
  };
}

export function developerBuildRetryDelayMs(failedAttempt: number) {
  return Math.min(4000, 500 * 2 ** Math.max(0, failedAttempt - 1));
}

export function isDeveloperBuildRetryable(error: unknown, signalAborted: boolean) {
  if (signalAborted) return false;
  return !(error instanceof DOMException && error.name === "AbortError");
}
