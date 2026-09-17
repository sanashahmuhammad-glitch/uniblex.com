import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const moduleCache=new Map();
function load(file) {
  const absolute=path.resolve(file);
  if(moduleCache.has(absolute)) return moduleCache.get(absolute).exports;
  const code = ts.transpileModule(fs.readFileSync(absolute,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true } }).outputText;
  const module = {exports:{}};
  moduleCache.set(absolute,module);
  const localRequire=(specifier)=>{
    if(specifier.startsWith('@/')||specifier.startsWith('.')) {
      const base=specifier.startsWith('@/')?path.resolve('src',specifier.slice(2)):path.resolve(path.dirname(absolute),specifier);
      for(const candidate of [base,base+'.ts',base+'.tsx',base+'.js']) if(fs.existsSync(candidate)) return load(candidate);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { module, exports:module.exports, require:localRequire, AbortController, setTimeout, clearTimeout, Date, console, URL, Headers, TextEncoder, crypto, Buffer });
  return module.exports;
}
const { AdManager } = load('src/lib/ads/manager.ts');
const { parseBridgeRequest, isTrustedGameMessage } = load('src/lib/ads/protocol.ts');
const { parseMonetization } = load('src/lib/monetization.ts');
const { scanBuildText } = load('src/lib/buildSecurityScan.ts');
const { startRenderingBackend } = load('src/lib/renderingBackend.ts');
const { safeGameFrameUrl, GAME_SANDBOX } = load('src/lib/gameFramePolicy.ts');
const { normalizeWebglPath } = load('src/lib/webglMvpManifest.ts');
const { normalizeConsentState, consentPermitsAds, consentPermitsAnalytics, ConsentStateStore } = load('src/lib/ads/consent.ts');
const { readAdsRuntimeConfig, runtimeEligibility } = load('src/lib/ads/server/config.ts');
const { exactHttpsOrigin, readAdOriginPolicy, providerOriginAllowed, eligibleGameFrameOrigin } = load('src/lib/ads/originPolicy.ts');
const { newAdTicket, secretHash } = load('src/lib/ads/server/tickets.ts');
const { ProviderCallbackRegistry } = load('src/lib/ads/server/callbacks.ts');
const { sealConsentState, verifySealedConsent } = load('src/lib/ads/server/consent.ts');
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
  const parsed=parseMonetization({mode:'uniblex_ads',provider:'',providerVersion:'',formats:['rewarded'],placements:[{token:'level_complete',format:'rewarded',trigger:'Player choice'}],trackers:[],externalHosts:['https://metrics.example'],audience:'general_13_plus',dataUse:'Contextual delivery only',externalDestinations:false,notes:'',policyVersion:'2026-09-16'},true);
  assert.equal(parsed.placements[0].token,'level_complete');assert.equal(parsed.externalHosts[0],'https://metrics.example');
  assert.throws(()=>parseMonetization({...parsed,externalHosts:['https://*.evil.example']},true));
});
const eligibilityContext={session:'55555555-5555-4555-8555-555555555555',frameOrigin:'https://game.example'};
function gate(redeem=true) { return {canRequest:()=>true,authorize:async()=>({status:'eligible',authorization:{requestId:'66666666-6666-4666-8666-666666666666',ticket:'host-only-ticket',expiresAt:new Date(Date.now()+1000).toISOString(),providerKey:'test-provider'}}),consume:async()=>true,redeem:async()=>redeem}; }
function adapter(status='completed', completionId='trusted-1', verification='server_verified') { const show=async(_request,{started})=>{started();return {status,completionId,verification};}; return {name:'TEST ONLY',initialize:async()=>{},isAvailable:()=>true,showInterstitial:show,showRewarded:show,destroy:()=>{}}; }
await test('reward only follows provider completion; repeat request is blocked', async () => {
  const manager=new AdManager(adapter(),gate()); const answer=await manager.show('one','rewarded',{placement:'reward'},eligibilityContext); assert.equal(answer.rewardGranted,true); assert.equal((await manager.show('one','rewarded',{placement:'reward'},eligibilityContext)).rewardGranted,false); manager.destroy();
});
await test('trusted completion identity cannot be replayed across request IDs', async () => {
  const manager=new AdManager(adapter('completed','same-completion'),gate());assert.equal((await manager.show('one','rewarded',{placement:'reward'},eligibilityContext)).rewardGranted,true);manager.lastStarted=-Infinity;assert.equal((await manager.show('two','rewarded',{placement:'reward'},eligibilityContext)).rewardGranted,false);manager.destroy();
});
await test('all unsuccessful provider outcomes grant no reward', async () => {
  for(const status of ['skipped','failed','unavailable','blocked']) { const manager=new AdManager(adapter(status),true);assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,false);manager.destroy(); }
});
await test('missing provider, blocked game, blocker-like exception and timeout settle', async () => {
  for(const manager of [new AdManager(null,true),new AdManager(adapter(),false),new AdManager({...adapter(),initialize:async()=>{throw Error('blocked');}},true),new AdManager({...adapter(),initialize:()=>new Promise(()=>{})},true,()=>{},10)]) { assert.equal((await manager.show('one','rewarded',{placement:'reward'})).rewardGranted,false);manager.destroy(); }
  const events=[]; const manager=new AdManager(null,true,event=>events.push(event)); await manager.show('two','rewarded',{placement:'reward'}); assert.deepEqual(events,['ad_request','ad_failed','ad_closed']); manager.destroy();
});
await test('provider completion without started signal or completion identity is rejected',async()=>{
  const manager=new AdManager({...adapter(),showRewarded:async()=>({status:'completed',completionId:'x',verification:'server_verified'})},gate());assert.equal((await manager.show('a','rewarded',{placement:'r'},eligibilityContext)).rewardGranted,false);
});
await test('iframe teardown cancels in-flight request', async()=>{
  const manager=new AdManager({...adapter(),showRewarded:()=>new Promise(()=>{})},true);const result=manager.show('a','rewarded',{placement:'r'});manager.destroy();assert.equal((await result).rewardGranted,false);
});
await test('iframe navigation cancels work without destroying the next session', async()=>{
  const manager=new AdManager({...adapter(),showRewarded:()=>new Promise(()=>{})},true);const result=manager.show('a','rewarded',{placement:'r'});manager.cancelNavigation();assert.equal((await result).reason,'cancelled');assert.equal(manager.available('rewarded'),true);manager.destroy();
});
await test('telemetry and subscriber failures cannot interrupt a verified result', async()=>{
  const manager=new AdManager(adapter(),gate(),()=>{throw Error('telemetry');});manager.subscribe(()=>{throw Error('subscriber');});assert.equal((await manager.show('a','rewarded',{placement:'r'},eligibilityContext)).rewardGranted,true);manager.destroy();
});
await test('provider-client or failed durable verification cannot grant a reward',async()=>{
  const clientOnly=new AdManager(adapter('completed','client-only','provider_client'),gate());assert.equal((await clientOnly.show('a','rewarded',{placement:'r'},eligibilityContext)).rewardGranted,false);clientOnly.destroy();
  const rejected=new AdManager(adapter(),gate(false));assert.equal((await rejected.show('b','rewarded',{placement:'r'},eligibilityContext)).reason,'redemption_rejected');rejected.destroy();
});
await test('consent withdrawal destroys the active adapter and future requests fail closed',async()=>{
  let destroyed=0;const manager=new AdManager({...adapter('skipped'),destroy:()=>{destroyed++;}},gate());await manager.show('a','interstitial',{placement:'r'},eligibilityContext);manager.withdrawConsent();assert.equal(destroyed,1);assert.equal(manager.available('interstitial'),false);assert.equal((await manager.show('b','interstitial',{placement:'r'},eligibilityContext)).rewardGranted,false);
});
await test('request flooding and simultaneous requests fail closed',async()=>{
  const flood=new AdManager(null,true);for(let index=0;index<256;index++)await flood.show(`request-${index}`,'interstitial',{placement:'r'});assert.equal((await flood.show('request-256','interstitial',{placement:'r'})).reason,'request_limit');flood.destroy();
  let release;const slow={...adapter(),showInterstitial:()=>new Promise(resolve=>{release=resolve;})};const manager=new AdManager(slow,true);const first=manager.show('first','interstitial',{placement:'r'});assert.equal((await manager.show('second','interstitial',{placement:'r'})).reason,'request_limit');release({status:'failed'});await first;manager.destroy();
});
await test('consent defaults closed and withdrawal remains closed',()=>{
  const state=normalizeConsentState({status:'allowed',jurisdiction:'us',framework:'gpp',source:'user',rawConsentString:'must-not-survive'});assert.equal(consentPermitsAds(state),true);assert.equal('rawConsentString' in state,false);
  assert.equal(consentPermitsAds(normalizeConsentState(null)),false);assert.equal(consentPermitsAnalytics(normalizeConsentState({status:'limited'})),false);
  const store=new ConsentStateStore();store.set({status:'allowed'});store.withdraw();assert.equal(store.getSnapshot().status,'denied');
});
await test('server consent seals reject browser forgery, tampering, and expiration',async()=>{
  const secret='test-only-secret-that-is-more-than-32-characters';const state=normalizeConsentState({status:'allowed',jurisdiction:'us',framework:'gpp',source:'cmp',policyVersion:'test',updatedAt:new Date().toISOString()});
  const sealed=sealConsentState(state,secret,new Date(Date.now()+60000));assert.equal(verifySealedConsent(sealed,secret).status,'allowed');assert.equal(verifySealedConsent(sealed+'x',secret),null);assert.equal(verifySealedConsent(sealed,'different-test-secret-that-is-long-enough'),null);
  const expired=sealConsentState(state,secret,new Date(Date.now()+5));await new Promise(resolve=>setTimeout(resolve,10));assert.equal(verifySealedConsent(expired,secret),null);
});
await test('all missing or malformed runtime switches fail closed',()=>{
  const missing=readAdsRuntimeConfig({});assert.equal(runtimeEligibility(missing,'rewarded').allowed,false);
  const malformed=readAdsRuntimeConfig({UNIBLEX_ADS_ENABLED:'TRUE',UNIBLEX_ADS_ROLLOUT_PERCENT:'101',UNIBLEX_ADS_PROVIDER:'*'});assert.equal(malformed.globalEnabled,false);assert.equal(malformed.rolloutPercent,0);assert.equal(malformed.providerKey,null);
});
await test('provider and external game origins require exact HTTPS origins',()=>{
  assert.equal(exactHttpsOrigin('https://ads.example/path'),null);assert.equal(exactHttpsOrigin('https://*.example'),null);assert.equal(exactHttpsOrigin('http://ads.example'),null);
  const policy=readAdOriginPolicy({UNIBLEX_ADS_SCRIPT_ORIGINS:'https://ads.example, https://*.evil.example'});assert.equal(providerOriginAllowed(policy,'script','https://ads.example'),true);assert.equal(providerOriginAllowed(policy,'script','https://evil.example'),false);
  assert.equal(eligibleGameFrameOrigin('https://game.example/index.html','https://www.uniblex.com'),'https://game.example');assert.equal(eligibleGameFrameOrigin('javascript:x','https://www.uniblex.com'),null);
});
await test('tickets are strong random secrets and only hashes are comparable',()=>{
  const first=newAdTicket(), second=newAdTicket();assert.notEqual(first,second);assert.ok(first.length>=43);assert.match(secretHash(first),/^[a-f0-9]{64}$/);assert.notEqual(secretHash(first),secretHash(second));
});
await test('callbacks fail closed without a concrete verifier',async()=>{
  const registry=new ProviderCallbackRegistry();assert.equal(await registry.verify('missing',{headers:new Headers(),body:new Uint8Array(),receivedAt:new Date()}),null);
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
