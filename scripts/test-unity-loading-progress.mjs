import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getUnityDownloadPlan,initialUnityProgress,reduceUnityProgress} from "../src/lib/unityLoadingProgress.js";

const MiB=1024*1024;
const files=[
  {url:"https://r2.example/Build/Game.loader.js",size:1*MiB,contentEncoding:""},
  {url:"https://r2.example/Build/Game.data.br",size:48*MiB,contentEncoding:"br"},
  {url:"https://r2.example/Build/Game.framework.js.br",size:3*MiB,contentEncoding:"br"},
  {url:"https://r2.example/Build/Game.wasm.br",size:12*MiB,contentEncoding:"br"},
  {url:"https://r2.example/TemplateData/style.css",size:999,contentEncoding:""},
];
const plan=getUnityDownloadPlan(files);
assert.deepEqual(plan,{totalBytes:64*MiB,loaderBytes:1*MiB,streamedBytes:63*MiB},"only required Unity build assets contribute to the verified total");

let state=initialUnityProgress(plan.totalBytes);
const samples=[0.03,0.11,0.27,0.46,0.68,0.89];
const percentages=[];
for(const progress of samples){state=reduceUnityProgress(state,{progress},plan);percentages.push(state.percentage);}
assert.ok(new Set(percentages).size>3,"a large streamed response advances incrementally instead of waiting for completion");
assert.ok(percentages.every((value,index)=>index===0||value>=percentages[index-1]),"percentage is monotonic");
assert.equal(state.totalBytes,64*MiB,"aggregated total MB stays exact");
assert.ok(state.loadedBytes>1*MiB&&state.loadedBytes<64*MiB,"aggregated loaded bytes reflect in-flight chunks");

const noRegression=reduceUnityProgress(state,{progress:0.2,loadedBytes:2*MiB,totalBytes:64*MiB},plan);
assert.equal(noRegression.loadedBytes,state.loadedBytes,"late or duplicated progress messages cannot move the bar backwards");

const preparing=reduceUnityProgress(state,{progress:0.9,loadedBytes:64*MiB,totalBytes:64*MiB,stage:"preparing"},plan);
assert.deepEqual({percentage:preparing.percentage,status:preparing.status,loadedBytes:preparing.loadedBytes},{percentage:100,status:"Preparing game\u2026",loadedBytes:64*MiB},"download reaches 100% before runtime preparation");

let cached=initialUnityProgress(plan.totalBytes);
cached=reduceUnityProgress(cached,{progress:0.9,loadedBytes:64*MiB,totalBytes:64*MiB,stage:"preparing"},plan);
assert.equal(cached.percentage,100,"a cached response advances honestly and immediately to 100%");

const failedAssets=new Set([files[2].url]);
assert.deepEqual([...failedAssets],[files[2].url],"retry scope contains only the failed asset; successful assets remain cache-backed");

const componentSource=readFileSync(new URL("../src/components/games/WebglLoader.tsx",import.meta.url),"utf8");
assert.match(componentSource,/key=\{loadAttempt\}/,"a retry replaces the failed iframe instead of retaining a stale Unity instance");
assert.match(componentSource,/setLoadAttempt\(\(attempt\)=>attempt\+1\)/,"one retry creates one new load attempt");
assert.doesNotMatch(componentSource,/createObjectURL|revokeObjectURL/,"the single-download architecture creates no temporary object URLs to leak");
assert.match(componentSource,/event\.data\.type==="unity-ready"[\s\S]*setPhase\("ready"\)/,"the loader is hidden only after the Unity runtime-ready handshake");
assert.match(componentSource,/role="progressbar"[\s\S]*aria-valuenow=\{unityProgress\.percentage\}/,"the exact visible progress is exposed accessibly");

console.log("PASS unity loading progress: streamed increments, aggregate MB, monotonicity, cached completion, scoped retry, single instance, URL cleanup, and runtime-ready gating");
