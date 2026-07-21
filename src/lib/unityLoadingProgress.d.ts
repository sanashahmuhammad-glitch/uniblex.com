export type UnityBuildFile = {url: string; size: number; contentEncoding: string};
export type UnityDownloadPlan = {totalBytes: number; loaderBytes: number; streamedBytes: number};
export type UnityProgressState = {loadedBytes: number; totalBytes: number; percentage: number; status: string};
export type UnityProgressSample = {progress?: number; loadedBytes?: number; totalBytes?: number; stage?: string};

export function getUnityDownloadPlan(files: UnityBuildFile[]): UnityDownloadPlan;
export function initialUnityProgress(totalBytes: number): UnityProgressState;
export function reduceUnityProgress(previous: UnityProgressState, sample: UnityProgressSample, plan: UnityDownloadPlan): UnityProgressState;
export function formatMegabytes(bytes: number): string;
