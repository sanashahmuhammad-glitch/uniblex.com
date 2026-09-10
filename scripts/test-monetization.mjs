import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = {exports:{}};
  vm.runInNewContext(code, { module, exports:module.exports, require, AbortController, setTimeout, clearTimeout, Date, console, URL });
  return module.exports;
}
const { AdManager } = load('src/lib/ads/manager.ts');
const { parseBridgeRequest, isTrustedGameMessage } = load('src/lib/ads/protocol.ts');
const { parseMonetization } = load('src/lib/monetization.ts');
const { scanBuildText } = load('src/lib/buildSecurityScan.ts');
const { startRenderingBackend } = load('src/lib/renderingBackend.ts');
const { safeGameFrameUrl, GAME_SANDBOX } = load('src/lib/gameFramePolicy.ts');
const { normalizeWebglPath } = load('src/lib/webglMvpManifest.ts');
let count=0;
async function test(name, fn) { await fn(); console.log('ok - '+name); count++; }
const request = { protocol:'uniblex',version:2,type:'request',requestId:'abc',method:'showRewarded',payload:{placement:'reward'} };
await test('reject malformed protocol, version, payload, IDs and game identity', () => {
  assert.ok(parseBridgeRequest(request));
  for (const change of [{version:1},{protocol:'fake'},{requestId:'*'},{payload:{placement:'ok',gameId:'another'}},{payload:{placement:'<script>'}},{payload:null}]) assert.equal(parseBridgeRequest({...request,...change}),null);
});
await test('host trust requires the exact iframe window and origin', () => {
  const frameWindow={};
  assert.equal(isTrustedGameMessage({source:frameWindow,origin:'https://game.example'},frameWindow,'https://game.example'),true);
  assert.equal(isTrustedGameMessage({source:{},origin:'https://game.example'},frameWindow,'https://game.example'),false);
  assert.equal(isTrustedGameMessage({source:frameWindow,origin:'https://evil.example'},frameWindow,'https://game.example'),false);
});
await test('disclosures default safely and enforce current policy', () => {
  assert.equal(parseMonetization(null).mode,'none');
  assert.throws(()=>parseMonetization({mode:'fake'}));
  assert.throws(()=>parseMonetization({mode:'developer_ads',provider:'x',formats:['rewarded'],notes:'',externalDestinations:false},true));
});
function adapter(status='completed', completionId='trusted-1') { return {name:'TEST ONLY',initialize:async()=>{},isAvailable:()=>true,show:async(_type,_request,{started})=>{started();return {status,completionId};},destroy:()=>{}}; }
await test('reward only follows provider completion; repeat request is blocked', async () => {
  const manager=new AdManager(adapter(),true); const answer=await manager.show('one','rewarded',{placement:'reward'}); assert.equal(answer.rewardGranted,true); assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,false); manager.destroy();
});
await test('trusted completion identity cannot be replayed across request IDs', async () => {
  const manager=new AdManager(adapter('completed','same-completion'),true);assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,true);manager.lastStarted=-Infinity;assert.equal((await manager.show('two','rewarded',{placement:'reward'})).rewardGranted,false);manager.destroy();
});
await test('all unsuccessful provider outcomes grant no reward', async () => {
  for(const status of ['skipped','failed','unavailable','blocked']) { const manager=new AdManager(adapter(status),true);assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,false);manager.destroy(); }
});
await test('missing provider, blocked game, blocker-like exception and timeout settle', async () => {
  for(const manager of [new AdManager(null,true),new AdManager(adapter(),false),new AdManager({...adapter(),initialize:async()=>{throw Error('blocked');}},true),new AdManager({...adapter(),initialize:()=>new Promise(()=>{})},true,()=>{},10)]) { assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,false);manager.destroy(); }
  const events=[]; const manager=new AdManager(null,true,event=>events.push(event)); await manager.show('two','rewarded',{placement:'reward'}); assert.deepEqual(events,['ad_request','ad_failed','ad_closed']); manager.destroy();
});
await test('provider completion without started signal or completion identity is rejected',async()=>{
  const manager=new AdManager({...adapter(),show:async()=>({status:'completed',completionId:'x'})},true);assert.equal((await manager.show('a','rewarded',{placement:'r'})).rewardGranted,false);
});
await test('iframe teardown cancels in-flight request', async()=>{
  const manager=new AdManager({...adapter(),show:()=>new Promise(()=>{})},true);const result=manager.show('a','rewarded',{placement:'r'});manager.destroy();assert.equal((await result).rewardGranted,false);
});
await test('iframe navigation cancels work without destroying the next session', async()=>{
  const manager=new AdManager({...adapter(),show:()=>new Promise(()=>{})},true);const result=manager.show('a','rewarded',{placement:'r'});manager.cancelNavigation();assert.equal((await result).reason,'cancelled');assert.equal(manager.available('rewarded'),true);manager.destroy();
});
await test('telemetry and subscriber failures cannot interrupt a verified result', async()=>{
  const manager=new AdManager(adapter(),true,()=>{throw Error('telemetry');});manager.subscribe(()=>{throw Error('subscriber');});assert.equal((await manager.show('a','rewarded',{placement:'r'})).rewardGranted,true);manager.destroy();
});
await test('WebGPU opt-in, absence and runtime failure use correct backend',async()=>{
  assert.equal((await startRenderingBackend({webgl:async()=>1})).backend,'webgl');
  assert.equal((await startRenderingBackend({webgl:async()=>1,webgpu:async()=>2,requestAdapter:async()=>({})})).backend,'webgpu');
  assert.equal((await startRenderingBackend({webgl:async()=>1,webgpu:async()=>{throw Error();},requestAdapter:async()=>({})})).backend,'webgl');
});
await test('static scan flags popup, navigation, mining and external scripts',()=>{for(const text of ['window.open("x")','top.location="x"','coinhive','<script src="https://x">'])assert.ok(scanBuildText('index.html',text).length);assert.equal(scanBuildText('index.html','<canvas></canvas>').length,0);});
await test('game frame and build paths reject active or ambiguous inputs',()=>{
  assert.equal(GAME_SANDBOX,'allow-scripts allow-same-origin allow-pointer-lock');
  for(const url of ['javascript:alert(1)','http://game.example/index.html','https://name:secret@game.example/index.html','https://www.uniblex.com/admin'])assert.equal(safeGameFrameUrl(url),undefined);
  assert.ok(safeGameFrameUrl('/webgl-loader/123e4567-e89b-42d3-a456-426614174000'));
  for(const path of ['../index.html','folder\\index.html','index.html?x','payload.exe','nested.zip'])assert.throws(()=>normalizeWebglPath(path));
});
function sdkContext(embedded=true) {
  const callbacks={}, sent=[];
  const parent={postMessage:(data,origin)=>sent.push({data,origin})};
  const window={parent,addEventListener:(type,fn)=>callbacks[type]=fn,setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,30)),clearTimeout};
  if(!embedded)window.parent=window;
  vm.runInNewContext(fs.readFileSync('public/sdk/uniblex-sdk-v2.js','utf8'),{window,document:{referrer:'https://www.uniblex.com/games/test'},URL,Map,Set,Promise});
  return {sdk:window.UniblexSDK,callbacks,parent,sent};
}
await test('standalone SDK never blocks game and returns unavailable',async()=>{const {sdk}=sdkContext(false);assert.equal((await sdk.ads.showRewarded({placement:'r'})).rewardGranted,false);await sdk.init();});
await test('SDK validates origin/source, correlates responses, ignores duplicate reward',async()=>{
  const {sdk,callbacks,parent,sent}=sdkContext();const init=sdk.init(); const m=sent[0].data;
  const response={protocol:'uniblex',version:2,type:'response',requestId:m.requestId,session:'session1',payload:{session:'session1',rewarded:true}};
  callbacks.message({origin:'https://evil.test',source:parent,data:response});assert.equal(sdk.ads.isAvailable(),false);
  callbacks.message({origin:'https://www.uniblex.com',source:{},data:response});assert.equal(sdk.ads.isAvailable(),false);
  callbacks.message({origin:'https://www.uniblex.com',source:parent,data:response});await init;assert.equal(sdk.ads.isAvailable(),true);
  let granted=0;const reward=sdk.ads.showRewarded({placement:'r'}).then(r=>{if(r.rewardGranted)granted++;});const id=sent.at(-1).data.requestId;
  const answer={...response,requestId:id,payload:{status:'completed',rewardGranted:true}};
  callbacks.message({origin:'https://www.uniblex.com',source:parent,data:answer});callbacks.message({origin:'https://www.uniblex.com',source:parent,data:answer});await reward;assert.equal(granted,1);
  assert.ok(sent.every(x=>x.origin!=='*'));
});
await test('SDK lifecycle, interstitial, adStarted event and unsupported results are failure-safe',async()=>{
  const {sdk,callbacks,parent,sent}=sdkContext();const init=sdk.init();const first=sent[0].data;callbacks.message({origin:'https://www.uniblex.com',source:parent,data:{protocol:'uniblex',version:2,type:'response',requestId:first.requestId,session:'session1',payload:{session:'session1',interstitial:true,rewarded:true}}});await init;
  sdk.game.loadingStart();sdk.game.loadingStop();sdk.game.ready();sdk.game.gameplayStart();sdk.game.gameplayStop();
  assert.deepEqual(sent.slice(-5).map(x=>x.data.method),['game_loading_start','game_loading_stop','game_ready','gameplay_start','gameplay_stop']);
  let started=0;sdk.on('adStarted',()=>started++);callbacks.message({origin:'https://www.uniblex.com',source:parent,data:{protocol:'uniblex',version:2,type:'event',session:'wrong',event:'adStarted',payload:{}}});callbacks.message({origin:'https://www.uniblex.com',source:parent,data:{protocol:'uniblex',version:2,type:'event',session:'session1',event:'adStarted',payload:{adType:'interstitial',placement:'between_levels'}}});assert.equal(started,1);
  const ad=sdk.ads.showInterstitial({placement:'between_levels'});const id=sent.at(-1).data.requestId;callbacks.message({origin:'https://www.uniblex.com',source:parent,data:{protocol:'uniblex',version:2,type:'response',requestId:id,session:'session1',payload:{status:'completed',rewardGranted:false}}});const result=await ad;assert.equal(result.status,'completed');assert.equal(result.rewardGranted,false);
});
await test('SDK host timeout and pagehide settle pending promises',async()=>{const {sdk,callbacks}=sdkContext();const init=sdk.init();callbacks.pagehide();await init;assert.equal(sdk.ads.isAvailable(),false);});
console.log(`${count} monetization tests passed`);
