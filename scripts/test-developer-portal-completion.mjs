import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = source("supabase/migrations/20260809000100_complete_developer_publishing.sql");
const reviewRoute = source("src/app/api/admin/developer-submissions/route.ts");
const submissionRoute = source("src/app/api/developer/submissions/route.ts");
const wizard = source("src/components/developers/DeveloperWizard.tsx");
const workspace = source("src/components/developers/DeveloperWorkspace.tsx");
const authForm = source("src/components/developers/DeveloperAuthForm.tsx");
let passed = 0;

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("review and publication are one server-authorized database operation", () => {
  assert.match(migration, /create or replace function public\.review_developer_submission/);
  assert.match(migration, /v_actor uuid := \(select auth\.uid\(\)\)/);
  assert.match(migration, /v_role not in \('owner', 'admin', 'reviewer'\)/);
  assert.match(reviewRoute, /\.rpc\("review_developer_submission"/);
});

test("publication requires verified build, artwork, approval, and every QA check", () => {
  for (const requirement of ["build_verified", "verified preview build", "cover and thumbnail", "Approve the submission", "Every QA checklist item"]) assert.ok(migration.includes(requirement), requirement);
  for (const check of ["load", "controls", "responsive", "content"]) assert.ok(migration.includes(`p_checklist->>'${check}'`), check);
});

test("publication creates the public game and links the immutable submission", () => {
  assert.match(migration, /insert into public\.games/);
  assert.match(migration, /'source', 'developer_portal'/);
  assert.match(migration, /game_id = case when p_decision = 'published'/);
  assert.match(migration, /set status = 'archived'/);
});

test("developers can restore only their own server draft and reviewed snapshots are read-only", () => {
  assert.match(submissionRoute, /\.eq\("id",id\)\.eq\("owner_id",auth\.user\.id\)/);
  assert.ok(submissionRoute.includes("This reviewed submission is read-only."));
  assert.ok(wizard.includes("fromServer(payload.submission)"));
  assert.ok(wizard.includes('includes(activeDraft.status)'));
  assert.ok(wizard.includes("window.location.replace"));
  assert.ok(authForm.includes('startsWith("/developers/")'));
});

test("workspace uses authoritative notifications, profile hydration, public metrics, and artwork", () => {
  assert.ok(submissionRoute.includes('from("notifications")'));
  assert.ok(workspace.includes("Profile could not be loaded."));
  assert.ok(workspace.includes("Game analytics"));
  assert.ok(workspace.includes("row.cover_url"));
});

test("SDK exposes a stable dependency-free lifecycle API", () => {
  const events = [];
  const document = { hidden: false, addEventListener() {} };
  const window = { parent: { postMessage: (payload) => events.push(payload) } };
  vm.runInNewContext(source("public/sdk/uniblex-sdk-v1.js"), { window, document, Promise });
  assert.equal(window.UniblexSDK.version, "1.0.0");
  window.UniblexSDK.game.ready();
  assert.equal(events.filter((event) => event.type === "game:ready").length, 2);
});

console.log(`\n${passed} Developer Portal completion regression tests passed.`);
