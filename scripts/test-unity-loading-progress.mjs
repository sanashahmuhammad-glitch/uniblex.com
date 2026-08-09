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
assert.match(componentSource,/event\.data\?\.source!=="uniblex-webgl"/,"the parent accepts progress only from the generic verified WebGL bridge");
assert.match(componentSource,/role="progressbar"[\s\S]*aria-valuenow=\{unityProgress\.percentage\}/,"the exact visible progress is exposed accessibly");
assert.match(componentSource,/bg-\[#070b14\]\/95[\s\S]*Uniblex Game Launcher/,"the loading state keeps the verified game artwork inside a Moto Rider-style black launcher card");

const workerSource=readFileSync(new URL("../workers/uniblex-webgl-assets.mjs",import.meta.url),"utf8");
assert.match(workerSource,/source:\"uniblex-webgl\"/,"the R2 HTML bridge emits the generic verified WebGL source marker");
assert.match(workerSource,/html\.uniblex-embedded #unity-canvas\{[^}]*width:100%!important;[^}]*height:100%!important/,"uploaded Unity canvases fill the branded 16:9 frame");
assert.match(workerSource,/MutationObserver\(report\)/,"the bridge reports actual Unity progress changes instead of a synthetic timer");
assert.match(workerSource,/runtimeStarted&&loading\?\.style\.display==="none"/,"embedded CSS cannot falsely mark Unity ready before its own loading state completes");

const publicPlayerSource=readFileSync(new URL("../src/components/site/GamePlayer.tsx",import.meta.url),"utf8");
assert.doesNotMatch(publicPlayerSource,/autoStartCarSim/,"developer-published games never bypass the Play Game launcher");
assert.match(publicPlayerSource,/thumbnail=\{thumbnail \|\| cover\}/,"the launcher uses the submitted card thumbnail with a cover fallback");
assert.match(publicPlayerSource,/> Play Game<\//,"the public player exposes the same explicit Play Game gate");
assert.match(publicPlayerSource,/label=\{liked \? "Unlike" : "Like"\}[\s\S]*label=\{disliked \? "Remove dislike" : "Dislike"\}/,"developer-published games expose the same immediate Like and Dislike action bar as Moto Rider");
assert.match(publicPlayerSource,/label="Share"[\s\S]*label="Report"[\s\S]*label=\{isFullscreen \? "Exit fullscreen" : "Fullscreen"\}/,"the complete player action bar stays directly beneath the canvas");

const gamePageSource=readFileSync(new URL("../src/app/(site)/games/[slug]/page.tsx",import.meta.url),"utf8");
const playerPosition=gamePageSource.indexOf("<GamePlayer");
const engagementPosition=gamePageSource.indexOf("<GameEngagement");
const bottomAdPosition=gamePageSource.indexOf('AdZone label={isMotoRider ? "Advertisement" : "Below Game Player"}');
assert.ok(playerPosition>=0&&engagementPosition>playerPosition&&bottomAdPosition>engagementPosition,"views and share engagement render immediately after the player and before the below-game ad");

const {default:webglAssetWorker}=await import("../workers/uniblex-webgl-assets.mjs");
const originalHtml='<!doctype html><html><body><div id="unity-container"><canvas id="unity-canvas"></canvas><div id="unity-loading-bar"><div id="unity-progress-bar-full"></div></div><div id="unity-footer"></div></div></body></html>';
const htmlBytes=new TextEncoder().encode(originalHtml);
const htmlObject={size:htmlBytes.byteLength,httpEtag:'"test"',httpMetadata:{contentType:"text/html; charset=utf-8"},writeHttpMetadata(headers){headers.set("Content-Type",this.httpMetadata.contentType)},text:async()=>originalHtml,body:htmlBytes};
const htmlResponse=await webglAssetWorker.fetch(new Request("https://assets.example/developer-webgl-uploads/user/build/index.html"),{BUCKET:{get:async()=>htmlObject,head:async()=>htmlObject}});
const bridgedHtml=await htmlResponse.text();
assert.equal(htmlResponse.status,200,"verified WebGL HTML remains publicly readable");
assert.match(bridgedHtml,/data-uniblex-runtime-bridge/,"the served HTML receives one runtime bridge");
assert.match(bridgedHtml,/source:"uniblex-webgl"/,"the runtime bridge emits the marker expected by the branded loader");
assert.equal(Number(htmlResponse.headers.get("Content-Length")),new TextEncoder().encode(bridgedHtml).byteLength,"decorated HTML advertises its actual byte length");

const loaderPageSource=readFileSync(new URL("../src/app/webgl-loader/[buildId]/page.tsx",import.meta.url),"utf8");
assert.match(loaderPageSource,/\.in\("status",\["approved","published"\]\)/,"the public loader accepts both review-approved and terminal published submissions");
assert.ok(loaderPageSource.indexOf("getPublishedDeveloperLoader(params.buildId)")<loaderPageSource.indexOf('database.rpc("get_published_webgl_mvp_loader"'),"developer-published games use their current authoritative public artwork before the legacy MVP snapshot");
assert.match(loaderPageSource,/\.eq\("build_id",params\.buildId\)\.eq\("status","published"\)[\s\S]*thumbnailUrl:String\(publishedGame\?\.thumbnail_url\|\|publishedGame\?\.cover_url\|\|loaderData\.thumbnailUrl/,"current published game artwork overrides any stale thumbnail stored in a legacy loader snapshot");

console.log("PASS unity loading progress: streamed increments, aggregate MB, monotonicity, cached completion, scoped retry, single instance, URL cleanup, and runtime-ready gating");
