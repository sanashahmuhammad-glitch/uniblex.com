export const gameBuildStates = [
  "initiated", "uploading", "uploaded", "extracting", "validating", "ready_for_preview", "previewed",
  "publishing", "published", "failed", "aborted", "cleanup_pending", "cleanup_failed", "deleting", "deleted", "rolled_back"
] as const;

export type GameBuildState = typeof gameBuildStates[number];
export type BuildOperation = "complete" | "abort" | "extract" | "publish" | "rollback" | "delete";

export const allowedBuildTransitions: Record<GameBuildState, readonly GameBuildState[]> = {
  initiated: ["uploading", "aborted", "failed"],
  uploading: ["uploaded", "aborted", "failed"],
  uploaded: ["extracting", "cleanup_pending", "failed"],
  extracting: ["validating", "cleanup_pending", "failed"],
  validating: ["ready_for_preview", "cleanup_pending", "failed"],
  ready_for_preview: ["previewed", "publishing", "deleting", "failed"],
  previewed: ["publishing", "deleting", "failed"],
  publishing: ["published", "ready_for_preview", "failed"],
  published: ["rolled_back", "deleting", "failed"],
  failed: ["cleanup_pending", "deleting"],
  aborted: ["cleanup_pending", "deleting"],
  cleanup_pending: ["failed", "aborted", "deleted", "cleanup_failed"],
  cleanup_failed: ["cleanup_pending", "deleting"],
  deleting: ["deleted", "cleanup_failed"],
  deleted: [],
  rolled_back: ["published", "publishing", "deleting"]
};

export function canTransitionBuild(from: string, to: GameBuildState) {
  return gameBuildStates.includes(from as GameBuildState) && allowedBuildTransitions[from as GameBuildState].includes(to);
}

export function requireIdempotencyKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(key)) throw new Error("A valid idempotency key is required.");
  return key;
}

export async function claimBuildOperation(
  supabase: { rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> },
  input: { buildId: string; operation: BuildOperation; idempotencyKey: string; targetState: GameBuildState }
) {
  const { data, error } = await supabase.rpc("claim_game_build_operation", {
    p_build_id: input.buildId,
    p_operation: input.operation,
    p_idempotency_key: requireIdempotencyKey(input.idempotencyKey),
    p_target_state: input.targetState
  });
  if (error) throw new Error(error.message || "Unable to claim build operation.");
  return data as { operation_id: string; replayed: boolean; state: GameBuildState; status: "running" | "succeeded" | "failed" };
}

export async function finishBuildOperation(
  supabase: { rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> },
  operationId: string,
  status: "succeeded" | "failed",
  finalState: GameBuildState,
  errorCode?: string
) {
  const { data, error } = await supabase.rpc("finish_game_build_operation", {
    p_operation_id: operationId,
    p_status: status,
    p_final_state: finalState,
    p_error_code: errorCode || null
  });
  if (error) throw new Error(error.message || "Unable to finish build operation.");
  return data;
}
