export const r2GameUploadsUnavailableMessage =
  "WebGL upload automation is temporarily disabled for security review.";

export type R2UploadRuntimeEnvironment = Record<string, string | undefined>;

export type R2UploadAvailability =
  | { available: true }
  | {
      available: false;
      code: "feature_flag_disabled" | "missing_r2_configuration" | "invalid_environment_binding";
      error: string;
      missing?: string[];
    };

const requiredR2Bindings = [
  { name: "R2_ACCOUNT_ID", aliases: ["CLOUDFLARE_R2_ACCOUNT_ID"] },
  { name: "R2_BUCKET", aliases: ["CLOUDFLARE_R2_BUCKET"] },
  { name: "R2_ACCESS_KEY_ID", aliases: ["CLOUDFLARE_R2_ACCESS_KEY_ID"] },
  { name: "R2_SECRET_ACCESS_KEY", aliases: ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"] },
  { name: "R2_PUBLIC_BASE_URL", aliases: ["NEXT_PUBLIC_R2_PUBLIC_BASE_URL"] }
] as const;

export function getR2GameUploadAvailability(
  environment: R2UploadRuntimeEnvironment = process.env
): R2UploadAvailability {
  if (environment["R2_GAME_UPLOADS_ENABLED"] !== "true") {
    return { available: false, code: "feature_flag_disabled", error: "Game uploads are disabled." };
  }

  const vercelEnvironment = environment["VERCEL_ENV"];
  const nodeEnvironment = environment["NODE_ENV"];
  const isKnownVercelEnvironment =
    vercelEnvironment === "production" ||
    vercelEnvironment === "preview" ||
    vercelEnvironment === "development";
  const isLocalNonProduction = !vercelEnvironment && nodeEnvironment !== "production";
  if (!isKnownVercelEnvironment && !isLocalNonProduction) {
    return { available: false, code: "invalid_environment_binding", error: "R2 upload environment binding is invalid." };
  }

  const missing = requiredR2Bindings
    .filter(({ name, aliases }) => !readRuntimeEnvironment(environment, name, ...aliases))
    .map(({ name }) => name);
  if (missing.length) {
    return { available: false, code: "missing_r2_configuration", error: "R2 upload configuration is incomplete.", missing };
  }

  return { available: true };
}

export function areR2GameUploadsEnabled(environment: R2UploadRuntimeEnvironment = process.env) {
  return getR2GameUploadAvailability(environment).available;
}

function readRuntimeEnvironment(environment: R2UploadRuntimeEnvironment, ...names: string[]) {
  for (const name of names) {
    const value = environment[name]?.trim();
    if (value) return value;
  }
  return "";
}
