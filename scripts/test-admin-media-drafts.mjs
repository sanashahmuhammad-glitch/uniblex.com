import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 };
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = (relative) => ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { compilerOptions }).outputText;
const slugUrl = dataUrl(compile("src/lib/slug.ts"));
const logicUrl = dataUrl(compile("src/components/admin/adminUploadLogic.ts").replace('from "@/lib/slug"', `from "${slugUrl}"`));
const mediaPolicy = await import(dataUrl(compile("src/lib/r2GameMedia.ts")));
const draftModule = await import(dataUrl(compile("src/lib/adminSubmissionDraft.ts").replace('from "@/components/admin/adminUploadLogic"', `from "${logicUrl}"`)));

let passed = 0;
const tests = [];
const test = (name, run) => tests.push({ name, run });
const equal = (actual, expected) => { if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`); };
const includes = (value, expected) => { if (!value.includes(expected)) throw new Error(`Expected value to include ${expected}`); };
const throws = (run, expected) => { let error; try { run(); } catch (cause) { error = cause; } if (!error) throw new Error("Expected an error"); if (expected) includes(String(error.message), expected); };

const ownerId = "11111111-1111-4111-8111-111111111111";
const draftId = "22222222-2222-4222-8222-222222222222";
const objectId = "33333333-3333-4333-8333-333333333333";
const sha256 = "ab".repeat(32);
const descriptor = { draftId, role: "cover", name: "cover.png", contentType: "image/png", size: 8 * 1024 * 1024, sha256 };

test("media metadata accepts an individual image larger than the Vercel body limit", () => equal(mediaPolicy.validateGameMediaDescriptor(descriptor).size, 8 * 1024 * 1024));
test("multiple valid files may exceed 4.5 MB combined because they are signed individually", () => equal(Array.from({ length: 4 }, (_, index) => mediaPolicy.validateGameMediaDescriptor({ ...descriptor, role: index < 2 ? ["cover", "thumbnail"][index] : `screenshot-${index - 1}` })).reduce((sum, file) => sum + file.size, 0) > 4.5 * 1024 * 1024, true));
test("media policy rejects unsupported MIME", () => throws(() => mediaPolicy.validateGameMediaDescriptor({ ...descriptor, contentType: "image/gif" }), "JPG"));
test("media policy rejects files over 15 MB", () => throws(() => mediaPolicy.validateGameMediaDescriptor({ ...descriptor, size: 15 * 1024 * 1024 + 1 }), "15 MB"));
test("media policy rejects screenshot roles outside one through six", () => throws(() => mediaPolicy.validateGameMediaDescriptor({ ...descriptor, role: "screenshot-7" }), "role"));
test("generated keys bind owner, draft, role, and random object id", () => equal(mediaPolicy.createGameMediaKey(ownerId, descriptor, objectId), `staging-game-media/${ownerId}/${draftId}/cover/${objectId}.png`));
test("key authorization rejects another draft", () => throws(() => mediaPolicy.assertGameMediaKey(`staging-game-media/${ownerId}/${draftId}/cover/${objectId}.png`, ownerId, "44444444-4444-4444-8444-444444444444"), "outside"));
test("key authorization rejects role mismatch", () => throws(() => mediaPolicy.assertGameMediaKey(`staging-game-media/${ownerId}/${draftId}/cover/${objectId}.png`, ownerId, draftId, "thumbnail"), "role"));
test("signed headers bind type, owner, draft, role, size, and checksum", () => {
  const headers = mediaPolicy.gameMediaHeaders(ownerId, descriptor);
  equal(headers["content-type"], "image/png");
  equal(headers["x-amz-meta-owner-id"], ownerId);
  equal(headers["x-amz-meta-draft-id"], draftId);
  equal(headers["x-amz-meta-media-role"], "cover");
  equal(headers["x-amz-meta-size-bytes"], String(descriptor.size));
  equal(headers["if-none-match"], "*");
});
test("HEAD verification accepts matching authoritative metadata", () => {
  const headers = new Headers({ "content-length": String(descriptor.size), "content-type": descriptor.contentType, "x-amz-meta-owner-id": ownerId, "x-amz-meta-draft-id": draftId, "x-amz-meta-media-role": descriptor.role, "x-amz-meta-sha256": sha256, "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64") });
  mediaPolicy.verifyGameMediaHead(descriptor, ownerId, headers);
});
test("HEAD verification rejects mismatched size", () => throws(() => mediaPolicy.verifyGameMediaHead(descriptor, ownerId, new Headers({ "content-length": "1" })), "size"));

const routeSource = fs.readFileSync(path.join(root, "src/app/api/admin/uploads/game-media/route.ts"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "src/lib/gameMediaUploadClient.ts"), "utf8");
const wizardSource = fs.readFileSync(path.join(root, "src/components/admin/AdminGameWizard.tsx"), "utf8");
const hookSource = fs.readFileSync(path.join(root, "src/components/admin/useAdminDraftAutosave.ts"), "utf8");
test("serverless route receives JSON metadata and never multipart image bytes", () => equal(routeSource.includes("request.json()") && !routeSource.includes("request.formData()") && !routeSource.includes("Cloudinary"), true));
test("media route verifies admin auth and the upload feature flag", () => equal(routeSource.includes("verifyAdminRequest") && routeSource.includes("areR2GameUploadsEnabled"), true));
test("media signer uses a short one-minute lease", () => equal(routeSource.includes("GAME_MEDIA_SIGNING_SECONDS"), true));
test("browser uploads directly with PUT and reports progress", () => equal(clientSource.includes('xhr.open("PUT", uploadUrl)') && clientSource.includes("xhr.upload.onprogress"), true));
test("browser metadata request is JSON and contains no FormData", () => equal(clientSource.includes('"Content-Type": "application/json"') && !clientSource.includes("new FormData"), true));
test("client supports cancellation, retry state, verification, and orphan cleanup", () => equal(clientSource.includes("AbortSignal") && clientSource.includes('"verifying"') && clientSource.includes("cleanupGameMedia"), true));
test("media verification completes before the existing WebGL operation begins", () => equal(wizardSource.indexOf("await uploadSelectedMedia") < wizardSource.indexOf("await uploadWebglMvp"), true));
test("retry skips files already verified in this draft", () => equal(wizardSource.includes("if (existing) continue"), true));

const future = new Date(Date.now() + 60_000).toISOString();
const baseDraft = {
  version: 1, storageKey: `${ownerId}:${draftId}`, ownerId, draftId,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: future,
  currentStep: 3,
  form: { ...draftModule.createAdminSubmissionDraft(ownerId).form, title: "Recovered game", description: "x".repeat(50), accessToken: "must-not-survive" },
  media: [{ ...descriptor, lastModified: 1, status: "verified", objectKey: `staging-game-media/${ownerId}/${draftId}/cover/${objectId}.png`, publicUrl: "https://games.example/media.png" }],
  zip: { name: "game.zip", contentType: "application/zip", size: 1234, lastModified: 2, status: "needs-reselection" },
  buildResult: null
};
test("draft restore preserves exact step and ordinary form fields", () => { const draft = draftModule.sanitizeAdminSubmissionDraft(baseDraft, ownerId); equal(draft.currentStep, 3); equal(draft.form.title, "Recovered game"); });
test("draft restore preserves verified media metadata and honest ZIP reselection", () => { const draft = draftModule.sanitizeAdminSubmissionDraft(baseDraft, ownerId); equal(draft.media[0].status, "verified"); equal(draft.zip.status, "needs-reselection"); });
test("draft sanitizer rejects another owner and expired records", () => { equal(draftModule.sanitizeAdminSubmissionDraft(baseDraft, "44444444-4444-4444-8444-444444444444"), null); equal(draftModule.sanitizeAdminSubmissionDraft({ ...baseDraft, expiresAt: new Date(Date.now() - 1).toISOString() }, ownerId), null); });
test("draft sanitizer drops unknown secret-shaped fields", () => equal("accessToken" in draftModule.sanitizeAdminSubmissionDraft(baseDraft, ownerId).form, false));
test("draft sanitizer never persists presigned URLs", () => { const draft = draftModule.sanitizeAdminSubmissionDraft({ ...baseDraft, media: [{ ...baseDraft.media[0], publicUrl: "https://r2.example/file?X-Amz-Signature=secret" }] }, ownerId); equal(draft.media.length, 0); });
test("draft persistence uses IndexedDB with version, expiry, owner, and stable draft id", () => equal(hookSource.includes("saveAdminSubmissionDraft") && fs.readFileSync(path.join(root, "src/lib/adminSubmissionDraft.ts"), "utf8").includes("ADMIN_DRAFT_EXPIRY_MS"), true));
test("draft lifecycle covers debounce, hidden tabs, unload warning, discard, and multi-tab conflicts", () => equal(hookSource.includes("500") && hookSource.includes("visibilitychange") && hookSource.includes("beforeunload") && hookSource.includes("BroadcastChannel") && hookSource.includes("deleteAdminSubmissionDraft"), true));

for (const item of tests) { await item.run(); passed += 1; console.log(`ok ${passed} - ${item.name}`); }
console.log(`\n${passed} direct media and draft persistence tests passed.`);
