export const r2GameUploadsUnavailableMessage =
  "WebGL upload automation is temporarily disabled for security review.";

export function areR2GameUploadsEnabled() {
  return process.env.R2_GAME_UPLOADS_ENABLED === "true";
}
