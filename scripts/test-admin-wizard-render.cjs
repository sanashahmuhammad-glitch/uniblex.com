const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToString } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const compile = (source, filename) => ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true
  }
}).outputText;

function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const module = { exports: {} };
  const localRequire = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : require(id);
  const source = fs.readFileSync(filename, "utf8");
  new Function("require", "module", "exports", "__filename", "__dirname", compile(source, filename))(
    localRequire, module, module.exports, filename, path.dirname(filename)
  );
  return module.exports;
}

const slug = load("src/lib/slug.ts");
const logic = load("src/components/admin/adminUploadLogic.ts", { "@/lib/slug": slug });
const draftModule = load("src/lib/adminSubmissionDraft.ts", {
  "@/components/admin/adminUploadLogic": logic,
  "@/lib/r2GameMedia": {}
});
const mediaClient = {
  cleanupGameMedia: async () => undefined,
  uploadGameMediaFile: async () => { throw new Error("not used by render test"); },
  mediaRoleLabel: (role) => role
};
const hook = load("src/components/admin/useAdminDraftAutosave.ts", {
  "@/lib/adminSubmissionDraft": draftModule,
  "@/lib/gameMediaUploadClient": mediaClient,
  "@/components/admin/adminUploadLogic": logic,
  "@/lib/r2GameMedia": {}
});
const Icon = () => React.createElement("span");
const icons = new Proxy({}, { get: () => Icon });
const Image = (props) => React.createElement("img", { alt: props.alt || "", src: props.src || "" });
const wizard = load("src/components/admin/AdminGameWizard.tsx", {
  react: React,
  "react/jsx-runtime": require("react/jsx-runtime"),
  "next/image": { __esModule: true, default: Image },
  "lucide-react": icons,
  "@/lib/supabase": { supabase: null },
  "@/lib/webglMvpClient": { uploadWebglMvp: async () => { throw new Error("not used by render test"); }, updateWebglMvp: async () => ({}) },
  "@/lib/gameMediaUploadClient": mediaClient,
  "@/lib/adminSubmissionDraft": draftModule,
  "@/lib/r2GameMedia": {},
  "@/components/admin/useAdminDraftAutosave": hook,
  "@/components/admin/adminUploadLogic": logic,
  "@/components/admin/adminPortalTypes": {}
});

const ownerId = "11111111-1111-4111-8111-111111111111";
const props = (initialDraft) => ({
  adminId: ownerId,
  categories: [],
  editingGame: null,
  initialDraft,
  r2GameUploadsEnabled: false,
  onDraftSaved: () => undefined,
  onDraftDiscarded: () => undefined,
  onCancel: () => undefined,
  onComplete: () => undefined
});
const cases = [["empty storage", null]];
const validDraft = draftModule.createAdminSubmissionDraft(ownerId);
validDraft.form.title = "Restored title";
cases.push(["valid restored draft", validDraft]);
cases.push(["corrupt draft quarantined once", draftModule.sanitizeAdminSubmissionDraft("{bad-json", ownerId)]);
cases.push(["old draft quarantined once", draftModule.sanitizeAdminSubmissionDraft({ ...validDraft, version: 0 }, ownerId)]);

for (const [label, initialDraft] of cases) {
  assert.doesNotThrow(() => renderToString(React.createElement(wizard.AdminGameWizard, props(initialDraft))), label);
  console.log(`ok - Submit Game renders with ${label}`);
}
