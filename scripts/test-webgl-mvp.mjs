import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root=path.resolve(import.meta.dirname,"..");
const cache=new Map();
async function load(relative) {
  if(cache.has(relative))return cache.get(relative);
  let source=fs.readFileSync(path.join(root,relative),"utf8");
  let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  for(const [specifier,target] of [["@/lib/webglMvpManifest","src/lib/webglMvpManifest.ts"]]) {
    if(output.includes(`from \"${specifier}\"`)) {
      const dependency=await moduleUrl(target);
      output=output.replaceAll(`from \"${specifier}\"`,`from \"${dependency}\"`);
    }
  }
  const url=`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  const promise=import(url);cache.set(relative,promise);return promise;
}
async function moduleUrl(relative) {
  let source=fs.readFileSync(path.join(root,relative),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

const manifestModule=await load("src/lib/webglMvpManifest.ts");
const detection=await load("src/lib/webglBuildDetection.ts");
const policy=await load("src/lib/webglMvpPolicy.ts");
const r2=await load("src/lib/r2Mvp.ts");
const hashing=await load("src/lib/incrementalSha256.ts");
let passed=0;
const tests=[];
function test(name,run){tests.push({name,run})}
function equal(actual,expected){if(actual!==expected)throw new Error(`Expected ${expected}, received ${actual}`)}
function throws(run,contains){let error;try{run()}catch(cause){error=cause}if(!error)throw new Error("Expected an error");if(contains&&!String(error.message).includes(contains))throw error}
function unity(suffix,type) {
  const paths=["index.html","Build/game.loader.js",`Build/game.framework.js${suffix}`,`Build/game.data${suffix}`,`Build/game.wasm${suffix}`];
  equal(detection.detectWebglBuild('<script src="Build/game.loader.js"></script>',paths).buildType,type);
}
function entry(path,size=1){return {path,size,sha256:"a".repeat(64),crc32:"00000000",contentType:"application/octet-stream",cacheControl:"public, max-age=31536000, immutable"}}
function manifest(files){return {schemaVersion:1,entryPath:"index.html",buildType:"html5",compressionMode:"mixed-generic",requiredPaths:["index.html"],totalBytes:files.reduce((sum,file)=>sum+file.size,0),files:files.sort((a,b)=>a.path.localeCompare(b.path))}}

test("Unity Brotli build",()=>unity(".br","unity-brotli"));
test("Unity Gzip build",()=>unity(".gz","unity-gzip"));
test("Unity uncompressed build",()=>unity("","unity-uncompressed"));
test("Unity .unityweb build",()=>unity(".unityweb","unity-unityweb"));
test("generic HTML5 build",()=>equal(detection.detectWebglBuild('<script src="main.js"></script>',["index.html","main.js"]).buildType,"html5"));
test("invalid ZIP layout",()=>throws(()=>detection.selectArchiveRoot([]),"missing"));
test("path traversal",()=>throws(()=>manifestModule.normalizeWebglPath("../secret"),"traversal"));
test("path control character",()=>throws(()=>manifestModule.normalizeWebglPath("Build/bad\nname.js"),"control"));
test("path non-normalized Unicode",()=>throws(()=>manifestModule.normalizeWebglPath("Build/e\u0301.js"),"normalized Unicode"));
test("duplicate normalized path",()=>throws(()=>detection.selectArchiveRoot(["index.html","Main.js","main.js"]),"duplicate"));
test("oversized ZIP constant is bounded",()=>equal(manifestModule.WEBGL_MVP_LIMITS.maxZipBytes,1024*1024*1024));
test("excessive extracted size",()=>throws(()=>manifestModule.validateWebglManifest(manifest(Array.from({length:9},(_,i)=>entry(i?`f${i}.data`:"index.html",512*1024*1024)))),"extracted-size"));
test("excessive files",()=>throws(()=>manifestModule.validateWebglManifest(manifest(Array.from({length:5001},(_,i)=>entry(i?`f${i}.js`:"index.html")))),"file count"));
test("missing index.html",()=>throws(()=>manifestModule.validateWebglManifest(manifest([entry("main.js")])),"index.html"));
test("ambiguous index.html",()=>throws(()=>detection.selectArchiveRoot(["one/index.html","two/index.html"]),"ambiguous"));

const operation={id:"11111111-1111-4111-8111-111111111111",ownerId:"admin-a",state:"uploading",stagingPrefix:"staging-webgl-uploads/11111111-1111-4111-8111-111111111111/",expiresAt:Date.now()+60000};
const requested=[{path:"index.html",size:1,sha256:"a".repeat(64)}];
const stored=[{...requested[0],objectKey:`${operation.stagingPrefix}index.html`}];
test("authorized signing request",()=>equal(policy.authorizeSigningBatch(operation,"admin-a",requested,stored).length,1));
test("unauthorized signing request",()=>throws(()=>policy.authorizeSigningBatch(operation,"admin-b",requested,stored),"not found"));
test("signing key outside operation",()=>throws(()=>policy.authorizeSigningBatch(operation,"admin-a",requested,[{...stored[0],objectKey:"games/live/index.html"}]),"authoritative"));
test("manifest mismatch",()=>throws(()=>policy.authorizeSigningBatch(operation,"admin-a",[{...requested[0],sha256:"b".repeat(64)}],stored),"authoritative"));
test("missing uploaded file authority",()=>throws(()=>policy.authorizeSigningBatch(operation,"admin-a",requested,[]),"authoritative"));
test("duplicate completion rejected",()=>equal(policy.canPublishMvp("published",1,1),false));
test("abort is retry-safe",()=>equal(policy.canAbortMvp("aborted"),true));
test("publish before verification rejected",()=>equal(policy.canPublishMvp("ready_for_preview",0,1),false));
test("publish after verification allowed",()=>equal(policy.canPublishMvp("ready_for_preview",1,1),true));
test("upload cancellation is never retried",()=>equal(policy.shouldRetryMvpUpload({name:"AbortError"},false),false));
test("aborted signal is never retried",()=>equal(policy.shouldRetryMvpUpload(new Error("network"),true),false));
test("ordinary network failure may retry",()=>equal(policy.shouldRetryMvpUpload(new Error("network"),false),true));
test("incremental SHA-256 known vector",()=>{
  const hash=new hashing.IncrementalSha256();
  hash.update(new TextEncoder().encode("The quick "));
  hash.update(new TextEncoder().encode("brown fox jumps over the lazy dog"));
  equal(hash.digestHex(),"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
});
test("R2 checksum uses base64 authoritative digest",()=>equal(r2.sha256HexToBase64("00".repeat(32)),"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
test("R2 signed PUT binds checksum and create-only condition",()=>{
  const checksum=r2.sha256HexToBase64("ab".repeat(32));
  const url=r2.presignMvpPut({accountId:"account",bucket:"bucket",accessKeyId:"access",secretAccessKey:"secret",publicBaseUrl:"https://games.example"},"staging-webgl-uploads/11111111-1111-4111-8111-111111111111/file(1).js",{"x-amz-checksum-sha256":checksum,"if-none-match":"*"},60);
  const parsed=new URL(url);
  const signed=parsed.searchParams.get("X-Amz-SignedHeaders")||"";
  equal(signed.includes("x-amz-checksum-sha256"),true);
  equal(signed.includes("if-none-match"),true);
  equal(parsed.pathname.includes("file%281%29.js"),true);
});
function head(status,headers={}) {
  const response=new Response(null,{status,headers});
  return r2.parseMvpHeadResponse(response);
}
const expectedHead={size:68,sha256:"ab".repeat(32)};
test("R2 HEAD accepts matching size and SHA-256 metadata",()=>{
  const actual=head(200,{"Content-Length":"68","X-Amz-Meta-SHA256":expectedHead.sha256,"X-Amz-Checksum-SHA256":Buffer.from(expectedHead.sha256,"hex").toString("base64")});
  equal(r2.getMvpHeadMismatch(expectedHead,actual),null);
});
test("R2 HEAD accepts case-insensitive metadata header names",()=>equal(r2.getMvpHeadMismatch(expectedHead,head(200,{"CONTENT-LENGTH":"68","X-AMZ-META-SHA256":expectedHead.sha256})),null));
test("R2 HEAD rejects missing metadata",()=>equal(r2.getMvpHeadMismatch(expectedHead,head(200,{"content-length":"68"})),"missing_metadata"));
test("R2 HEAD rejects wrong checksum",()=>equal(r2.getMvpHeadMismatch(expectedHead,head(200,{"content-length":"68","x-amz-meta-sha256":"cd".repeat(32)})),"checksum_mismatch"));
test("R2 HEAD rejects wrong size",()=>equal(r2.getMvpHeadMismatch(expectedHead,head(200,{"content-length":"67","x-amz-meta-sha256":expectedHead.sha256})),"size_mismatch"));
for(const status of [403,404,500]) test("R2 HEAD rejects status "+status,()=>equal(r2.getMvpHeadMismatch(expectedHead,head(status)),"head_status"));
test("migration enforces trusted game guard and signing lease",()=>{
  const first=fs.readFileSync(path.join(root,"supabase/migrations/20260714000100_webgl_client_upload_mvp.sql"),"utf8");
  const finalGuard=fs.readFileSync(path.join(root,"supabase/migrations/20260714000300_webgl_client_upload_game_guard.sql"),"utf8");
  equal(/webgl_mvp_protect_game_state\(\)[\s\S]*security definer set search_path = public, pg_temp/i.test(finalGuard),true);
  equal(/end;\s*\$\$;/i.test(finalGuard),true);
  equal((finalGuard.match(/revoke all on function public\.webgl_mvp_protect_game_state\(\) from authenticated;/g)||[]).length,1);
  equal(/webgl_mvp_record_signing_lease[\s\S]*for update[\s\S]*signing_expires_at/i.test(first),true);
  equal(/webgl_mvp_begin_abort[\s\S]*'cleanupAfter',v_op\.signing_expires_at/i.test(first),true);
});

for(const item of tests){await item.run();passed+=1;console.log(`ok ${passed} - ${item.name}`)}
console.log(`\n${passed} WebGL MVP tests passed.`);
