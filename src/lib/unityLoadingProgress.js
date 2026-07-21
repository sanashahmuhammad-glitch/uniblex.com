const NETWORK_PROGRESS_CEILING = 0.9;

const UNITY_ASSET_PATTERN = /\/Build\/[^/]+\.(?:loader\.js|data|data\.br|wasm|wasm\.br|framework\.js|framework\.js\.br)(?:[?#].*)?$/i;
const UNITY_LOADER_PATTERN = /\/Build\/[^/]+\.loader\.js(?:[?#].*)?$/i;

export function getUnityDownloadPlan(files) {
  const assets = files.filter((file) => UNITY_ASSET_PATTERN.test(file.url) && Number.isFinite(file.size) && file.size > 0);
  const totalBytes = assets.reduce((total, file) => total + file.size, 0);
  const loaderBytes = assets.reduce((total, file) => total + (UNITY_LOADER_PATTERN.test(file.url) ? file.size : 0), 0);
  return {totalBytes, loaderBytes, streamedBytes: Math.max(0, totalBytes - loaderBytes)};
}

export function initialUnityProgress(totalBytes) {
  return {loadedBytes: 0, totalBytes: Math.max(1, totalBytes), percentage: 0, status: "Loading game files\u2026"};
}

export function reduceUnityProgress(previous, sample, plan) {
  const reportedTotal = finiteNonNegative(sample.totalBytes);
  const totalBytes = Math.max(previous.totalBytes, reportedTotal || plan.totalBytes || 1);
  const unityProgress = clamp(Number(sample.progress) || 0, 0, 1);
  const fallbackLoaded = unityProgress <= 0 ? 0 : plan.loaderBytes + Math.round(plan.streamedBytes * clamp(unityProgress / NETWORK_PROGRESS_CEILING, 0, 1));
  const reportedLoaded = finiteNonNegative(sample.loadedBytes);
  const nextLoaded = reportedLoaded === null ? fallbackLoaded : reportedLoaded;
  const loadedBytes = Math.min(totalBytes, Math.max(previous.loadedBytes, nextLoaded));
  const preparing = sample.stage === "preparing" || unityProgress >= NETWORK_PROGRESS_CEILING || loadedBytes >= totalBytes;
  const percentage = preparing ? 100 : Math.max(previous.percentage, Math.min(99, Math.round((loadedBytes / totalBytes) * 100)));
  return {loadedBytes: preparing ? totalBytes : loadedBytes,totalBytes,percentage,status: preparing ? "Preparing game\u2026" : "Loading game files\u2026"};
}

export function formatMegabytes(bytes) {
  return (Math.max(0, bytes) / (1024 * 1024)).toFixed(1);
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? Number(value) : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
