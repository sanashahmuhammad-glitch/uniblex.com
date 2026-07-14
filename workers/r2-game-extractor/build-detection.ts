import { validateArchivePath, ZipSecurityError, type ValidatedZipEntry } from "./zip-security";

export type BuildCompression = "uncompressed" | "brotli" | "gzip" | "unityweb";
export type BuildKind = "unity" | "html5";

export type BuildPlan = {
  kind: BuildKind;
  compression: BuildCompression;
  rootPrefix: string;
  indexPath: string;
  loaderPath?: string;
  outputEntries: Array<ValidatedZipEntry & { outputPath: string }>;
  requiredPaths: string[];
  textPaths: string[];
};

const unityKinds = {
  loader: /\.loader\.js$/i,
  framework: /\.framework\.js(?:\.(?:br|gz|unityweb))?$/i,
  wasm: /\.wasm(?:\.(?:br|gz|unityweb))?$/i,
  data: /\.data(?:\.(?:br|gz|unityweb))?$/i
};

export function createBuildPlan(entries: ValidatedZipEntry[]): BuildPlan {
  const files = entries.filter((entry) => !entry.directory);
  const indexes = files.filter((entry) => entry.archivePath.toLowerCase() === "index.html" || /^[^/]+\/index\.html$/i.test(entry.archivePath));
  if (indexes.length !== 1) throw new ZipSecurityError(indexes.length ? "Build contains ambiguous entry points." : "Build is missing a supported index.html entry point.");

  const index = indexes[0];
  const rootPrefix = index.archivePath.includes("/") ? index.archivePath.slice(0, index.archivePath.lastIndexOf("/") + 1) : "";
  const outputEntries = files
    .filter((entry) => !rootPrefix || entry.archivePath.startsWith(rootPrefix))
    .map((entry) => ({ ...entry, outputPath: validateArchivePath(rootPrefix ? entry.archivePath.slice(rootPrefix.length) : entry.archivePath) }));
  const paths = outputEntries.map((entry) => entry.outputPath);
  const byKind = Object.fromEntries(Object.entries(unityKinds).map(([kind, pattern]) => [kind, paths.filter((path) => pattern.test(path))])) as Record<keyof typeof unityKinds, string[]>;
  const unityCount = Object.values(byKind).reduce((total, matches) => total + matches.length, 0);

  if (!unityCount) {
    return { kind: "html5", compression: "uncompressed", rootPrefix, indexPath: "index.html", outputEntries, requiredPaths: ["index.html"], textPaths: ["index.html"] };
  }
  if (Object.values(byKind).some((matches) => matches.length !== 1)) {
    throw new ZipSecurityError("Unity build is incomplete or contains ambiguous required assets.");
  }

  const compressionModes = [byKind.framework[0], byKind.wasm[0], byKind.data[0]].map(compressionForPath);
  if (new Set(compressionModes).size !== 1) throw new ZipSecurityError("Unity build mixes incompatible compression modes.");
  const requiredPaths = ["index.html", byKind.loader[0], byKind.framework[0], byKind.wasm[0], byKind.data[0]];
  return {
    kind: "unity",
    compression: compressionModes[0],
    rootPrefix,
    indexPath: "index.html",
    loaderPath: byKind.loader[0],
    outputEntries,
    requiredPaths,
    textPaths: ["index.html", byKind.loader[0]]
  };
}

export function validateBuildReferences(plan: BuildPlan, texts: Record<string, string>) {
  const available = new Set(plan.outputEntries.map((entry) => entry.outputPath.toLowerCase()));
  const references = new Set<string>();
  const indexText = texts[plan.indexPath];
  if (typeof indexText !== "string") throw new ZipSecurityError("Build entry point could not be inspected.");

  for (const match of indexText.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) references.add(match[1]);
  if (plan.loaderPath) {
    const loaderText = texts[plan.loaderPath];
    if (typeof loaderText !== "string") throw new ZipSecurityError("Unity loader could not be inspected.");
    for (const match of loaderText.matchAll(/["'`]([^"'`]+\.(?:data|wasm|js)(?:\.(?:br|gz|unityweb))?)(?:[?#][^"'`]*)?["'`]/gi)) references.add(match[1]);
  }

  const resolved = [...references].map((reference) => resolveReference(reference));
  for (const path of resolved) {
    if (path && !available.has(path.toLowerCase())) throw new ZipSecurityError(`Build references a missing local asset: ${path}`);
  }
  if (plan.kind === "unity") {
    const searchable = Object.values(texts).join("\n");
    for (const required of plan.requiredPaths.slice(1)) {
      if (!searchable.includes(required) && !searchable.includes(required.split("/").pop() || required)) {
        throw new ZipSecurityError(`Unity entry point does not reference required asset: ${required}`);
      }
    }
  }
  return { references: resolved.filter(Boolean), requiredPaths: plan.requiredPaths };
}

function resolveReference(reference: string) {
  const value = reference.trim();
  if (!value || value.startsWith("#") || /^(?:https?:)?\/\//i.test(value)) return "";
  if (/^(?:javascript|data|file|blob):/i.test(value)) throw new ZipSecurityError("Build contains an unsafe entry-point reference.");
  const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  return validateArchivePath(clean);
}

function compressionForPath(path: string): BuildCompression {
  const lower = path.toLowerCase();
  if (lower.endsWith(".br")) return "brotli";
  if (lower.endsWith(".gz")) return "gzip";
  if (lower.endsWith(".unityweb")) return "unityweb";
  return "uncompressed";
}
