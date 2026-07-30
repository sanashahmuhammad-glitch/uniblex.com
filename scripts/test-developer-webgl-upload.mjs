import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root=path.resolve(import.meta.dirname,"..");
async function load(relative){
  const source=fs.readFileSync(path.join(root,relative),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const policy=await load("src/lib/developerBuildUploadPolicy.ts");
const client=fs.readFileSync(path.join(root,"src/lib/developerBuildUploadClient.ts"),"utf8");
const route=fs.readFileSync(path.join(root,"src/app/api/developer/uploads/build/route.ts"),"utf8");
let passed=0;
const tests=[];
function test(name,run){tests.push({name,run});}
function equal(actual,expected){if(actual!==expected)throw new Error(`Expected ${expected}, received ${actual}`);}
function includes(source,value){if(!source.includes(value))throw new Error(`Missing ${value}`);}

const data={path:"Build/CarGame.data.br",size:81441901};
const wasm={path:"Build/CarGame.wasm.br",size:8814702};
const loader={path:"Build/CarGame.loader.js",size:26982};
test("Car Sim large Brotli files are isolated from the small-file pool",()=>{const plan=policy.planDeveloperBuildUploads([loader,wasm,data]);equal(plan.large[0].path,data.path);equal(plan.large[1].path,wasm.path);equal(plan.small[0].path,loader.path);});
test("small files use bounded concurrency two",()=>equal(policy.DEVELOPER_BUILD_SMALL_FILE_CONCURRENCY,2));
test("large-file threshold covers Car Sim WASM",()=>equal(policy.DEVELOPER_BUILD_LARGE_FILE_BYTES<=wasm.size,true));
test("retry count is capped",()=>equal(policy.DEVELOPER_BUILD_MAX_ATTEMPTS,3));
test("retry backoff is exponential and capped",()=>{equal(policy.developerBuildRetryDelayMs(1),500);equal(policy.developerBuildRetryDelayMs(2),1000);equal(policy.developerBuildRetryDelayMs(8),4000);});
test("cancellation is not retried",()=>equal(policy.isDeveloperBuildRetryable(new DOMException("cancelled","AbortError"),false),false));
test("network failure is retried",()=>equal(policy.isDeveloperBuildRetryable(new Error("network"),false),true));
test("signed URL lifetime is extended to fifteen minutes",()=>equal(policy.DEVELOPER_BUILD_SIGNING_SECONDS,900));
test("each attempt signs exactly one file immediately before reading a new Blob",()=>{includes(client,'action:"sign",operationId,files:[identity(entry)]');equal(client.indexOf("const signed=await signOne")<client.indexOf("const blob=await readExtractedWebglFile"),true);});
test("each successful or duplicate PUT receives authoritative HEAD verification",()=>{includes(client,"const checked=await checkOne");includes(route,'if(action==="check")');includes(route,"getMvpHeadMismatch");});
test("replayed operation inspects and skips verified paths",()=>{includes(client,"if(initiated.replayed)");includes(client,'action:"inspect"');includes(client,"!completedPaths.has(entry.path)");});
test("only an unverified existing failed object is cleaned up",()=>{includes(client,"if(checked?.exists)");includes(client,'action:"cleanup"');includes(route,'if(build.verification_status==="verified")');includes(route,"matchStoredFile(files,body.file");});
test("timeout, expiry, network, cancellation, and exhaustion diagnostics are distinct",()=>{for(const value of ['\"timeout\"','\"expired\"','\"network\"','\"AbortError\"',"after ${attempt} attempts"])includes(client,value);});
test("Unity Brotli metadata remains signed exactly",()=>{for(const header of ["content-type","cache-control","x-amz-meta-sha256","x-amz-meta-size-bytes","x-amz-checksum-sha256","if-none-match","content-encoding"])includes(route,header);});

for(const item of tests){await item.run();passed+=1;console.log(`ok ${passed} - ${item.name}`);}
console.log(`\n${passed} developer WebGL upload regression tests passed.`);
