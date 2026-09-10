/** Opt-in per-build helper. The platform cannot manufacture a WebGL fallback build. */
export async function startRenderingBackend<T>(options: { webgl: () => Promise<T>; webgpu?: () => Promise<T>; requestAdapter?: () => Promise<unknown> }): Promise<{ backend: "webgl" | "webgpu"; value: T }> {
  if (options.webgpu && options.requestAdapter) {
    try { if (await options.requestAdapter()) return { backend: "webgpu", value: await options.webgpu() }; } catch { /* Failed adapter/runtime creation falls back to the supplied WebGL implementation. */ }
  }
  return { backend: "webgl", value: await options.webgl() };
}
