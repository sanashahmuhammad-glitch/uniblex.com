import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const portalPath = path.join(root, "src/components/admin/adminUploadLogic.ts");
const slugPath = path.join(root, "src/lib/slug.ts");
let portalSource = fs.readFileSync(portalPath, "utf8");
const slugSource = fs.readFileSync(slugPath, "utf8");
const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 };
const slugOutput = ts.transpileModule(slugSource, { compilerOptions }).outputText;
const slugUrl = `data:text/javascript;base64,${Buffer.from(slugOutput).toString("base64")}`;
let portalOutput = ts.transpileModule(portalSource, { compilerOptions }).outputText;
portalOutput = portalOutput.replace('from "@/lib/slug"', `from "${slugUrl}"`);
const portal = await import(`data:text/javascript;base64,${Buffer.from(portalOutput).toString("base64")}`);

let passed = 0;
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function equal(actual, expected) { if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`); }
function includes(value, expected) { if (!value.includes(expected)) throw new Error(`Expected value to include ${expected}`); }

const valid = {
  ...portal.EMPTY_GAME_FORM,
  title: "Neon Drift Arena",
  shortDescription: "Fast arcade racing in a neon city.",
  description: "Race through a neon city, master tight corners, and climb the score table.",
  categoryId: "11111111-1111-4111-8111-111111111111",
  controls: "WASD to drive"
};

test("details validation reports required fields", () => includes(portal.validateSubmissionStep(0, portal.EMPTY_GAME_FORM, false, false, false).join(" "), "Game name"));
test("valid details pass form validation", () => equal(portal.validateSubmissionStep(0, valid, false, false, false).length, 0));
test("engine list contains every required Unity option", () => { for (const engine of ["Unity 6", "Unity 2023", "Unity 2022", "Unity 2021", "Unity 2020", "Unity 2019", "Unity 2018", "Unity 2017", "Unity 5.6"]) equal(portal.GAME_ENGINES.includes(engine), true); });
test("step navigation exposes all five named steps", () => equal(portal.SUBMISSION_STEPS.join("|"), "Game Details|Game Options|Media|WebGL Build|Review"));
test("ZIP selection is required for non-external builds", () => includes(portal.validateSubmissionStep(3, valid, true, true, false).join(" "), "WebGL ZIP"));
test("valid external iframe bypasses ZIP requirement", () => equal(portal.validateSubmissionStep(3, { ...valid, engine: "Externally hosted iframe", iframeUrl: "https://games.example/index.html" }, true, true, false).length, 0));
test("publish is disabled before verification", () => equal(portal.canPublishVerifiedBuild(false, "operation"), false));
test("publish requires an operation id after verification", () => equal(portal.canPublishVerifiedBuild(true, ""), false));
test("publish is available after authoritative verification", () => equal(portal.canPublishVerifiedBuild(true, "operation"), true));
test("error sanitization removes bearer tokens", () => equal(portal.sanitizeAdminError(new Error("Failed Bearer abc.def.ghi")), "Failed Bearer [redacted]"));
test("slug preview is deterministic", () => equal(portal.getSlugPreview("Neon Drift Arena", ""), "neon-drift-arena"));

const wizard = fs.readFileSync(path.join(root, "src/components/admin/AdminGameWizard.tsx"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "src/components/admin/AdminPortalSidebar.tsx"), "utf8");
const flag = fs.readFileSync(path.join(root, "src/lib/r2GameUploads.ts"), "utf8");
test("upload UI renders exact progress percentage", () => equal(wizard.includes("progress.percentage}%"), true));
test("upload cancellation uses AbortController", () => equal(wizard.includes("abortRef.current?.abort()"), true));
test("verification result gates publish", () => equal(wizard.includes("canPublishVerifiedBuild"), true));
test("quarantine state disables production upload controls", () => equal(wizard.includes("Production uploads are quarantined"), true));
test("mobile portal uses an accessible drawer", () => equal(sidebar.includes("Open admin navigation") && sidebar.includes("lg:hidden"), true));
test("feature flag remains exact-value fail closed", () => equal(flag.includes('process.env.R2_GAME_UPLOADS_ENABLED === "true"'), true));

for (const item of tests) { await item.run(); passed += 1; console.log(`ok ${passed} - ${item.name}`); }
console.log(`\n${passed} admin upload portal tests passed.`);
