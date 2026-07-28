"use client";
import { supabase } from "@/lib/supabase";
import { analyzeWebglZip, cancelExtractedWebglSession, clearExtractedWebglSession, readExtractedWebglFile } from "@/lib/webglZipClient";
import {
  DEVELOPER_BUILD_MAX_ATTEMPTS,
  DEVELOPER_BUILD_PUT_TIMEOUT_MS,
  DEVELOPER_BUILD_SMALL_FILE_CONCURRENCY,
  developerBuildRetryDelayMs,
  isDeveloperBuildRetryable,
  planDeveloperBuildUploads
} from "@/lib/developerBuildUploadPolicy";
import type { WebglManifestEntry } from "@/lib/webglMvpManifest";

export type DeveloperBuildProgress={phase:string;percentage:number;completedFiles:number;totalFiles:number;currentFile?:string};
type SignedFile={path:string;url:string;headers:Record<string,string>};
type FileCheck={verified:boolean;exists:boolean;reason:string|null};

export async function uploadDeveloperBuild(file:File,submissionId:string,onProgress:(progress:DeveloperBuildProgress)=>void,signal:AbortSignal){
  if(!supabase)throw new Error("Authentication is not configured.");const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error("Authentication expired. Sign in again.");const token=session.access_token;let operationId="";let extracted="";
  try{
    onProgress({phase:"Inspecting ZIP",percentage:1,completedFiles:0,totalFiles:0});
    const analyzed=await analyzeWebglZip(file,progress=>onProgress({phase:"Extracting safely",percentage:Math.max(2,Math.round(progress.completedFiles/progress.totalFiles*28)),completedFiles:progress.completedFiles,totalFiles:progress.totalFiles}),signal);extracted=analyzed.sessionId;
    const idempotencyStorageKey=`uniblex-build-idempotency:${submissionId}:${file.name}:${file.size}:${file.lastModified}`;const idempotencyKey=sessionStorage.getItem(idempotencyStorageKey)||crypto.randomUUID();sessionStorage.setItem(idempotencyStorageKey,idempotencyKey);
    const initiated=await api(token,{action:"initiate",submissionId,manifest:analyzed.manifest,idempotencyKey});operationId=String(initiated.operationId);
    const completedPaths=new Set<string>();const loadedByPath=new Map<string,number>();
    if(initiated.replayed){
      let cursor=0;let inspection:Record<string,unknown>;
      do{inspection=await api(token,{action:"inspect",operationId,cursor});for(const path of inspection.verifiedPaths as string[]||[])completedPaths.add(path);cursor=Number(inspection.nextCursor||cursor);}while(!inspection.done);
    }
    for(const entry of analyzed.manifest.files)if(completedPaths.has(entry.path))loadedByPath.set(entry.path,entry.size);
    const report=(phase:string,currentFile?:string)=>{const bytes=[...loadedByPath.values()].reduce((sum,value)=>sum+value,0);onProgress({phase,percentage:30+Math.round(bytes/analyzed.manifest.totalBytes*50),completedFiles:completedPaths.size,totalFiles:analyzed.manifest.files.length,currentFile});};
    report(completedPaths.size?"Resuming verified upload":"Preparing uploads");
    const pending=analyzed.manifest.files.filter(entry=>!completedPaths.has(entry.path));const plan=planDeveloperBuildUploads(pending);
    const uploadEntry=async(entry:WebglManifestEntry)=>{
      for(let attempt=1;attempt<=DEVELOPER_BUILD_MAX_ATTEMPTS;attempt+=1){
        check(signal);const started=Date.now();loadedByPath.set(entry.path,0);
        try{
          const signed=await signOne(token,operationId,entry);const blob=await readExtractedWebglFile(extracted,entry.path);
          const transfer=await put(signed.url,signed.headers,blob,signal,loaded=>{loadedByPath.set(entry.path,loaded);report(attempt>1?`Retrying file (${attempt}/${DEVELOPER_BUILD_MAX_ATTEMPTS})`:"Uploading files",entry.path);});
          const checked=await checkOne(token,operationId,entry);if(!checked.verified)throw new BuildPutError(checked.exists?"verification":"missing",transfer.status,`R2 verification failed (${checked.reason||"missing"}).`);
          loadedByPath.set(entry.path,entry.size);completedPaths.add(entry.path);report("Uploading files",entry.path);return;
        }catch(error){
          if(!isDeveloperBuildRetryable(error,signal.aborted))throw error;
          const checked=await checkOne(token,operationId,entry).catch(()=>null);if(checked?.verified){loadedByPath.set(entry.path,entry.size);completedPaths.add(entry.path);report("Recovered verified file",entry.path);return;}
          if(checked?.exists)await api(token,{action:"cleanup",operationId,file:identity(entry)});
          const diagnostic=describeFailure(error,entry,attempt,Date.now()-started);console.warn("WebGL build upload retry",diagnostic);
          if(attempt===DEVELOPER_BUILD_MAX_ATTEMPTS)throw new Error(`Build upload failed for ${entry.path} after ${attempt} attempts (${diagnostic.code}). Retry the affected file.`);
          report(`Connection retry ${attempt}/${DEVELOPER_BUILD_MAX_ATTEMPTS-1}`,entry.path);await delay(developerBuildRetryDelayMs(attempt),signal);
        }
      }
    };
    for(const entry of plan.large)await uploadEntry(entry);
    await runPool(plan.small,DEVELOPER_BUILD_SMALL_FILE_CONCURRENCY,uploadEntry);
    let cursor=0;let result:Record<string,unknown>={};do{check(signal);result=await api(token,{action:"verify",operationId,cursor});cursor=Number(result.nextCursor||cursor);onProgress({phase:"Verifying checksums",percentage:80+Math.round(cursor/analyzed.manifest.files.length*20),completedFiles:cursor,totalFiles:analyzed.manifest.files.length});}while(!result.done);
    await clearExtractedWebglSession(extracted);sessionStorage.removeItem(idempotencyStorageKey);return{...result,manifest:analyzed.manifest,operationId};
  }catch(error){if(signal.aborted&&operationId)await api(token,{action:"abort",operationId}).catch(()=>undefined);if(extracted)await cancelExtractedWebglSession(extracted).catch(()=>undefined);throw error;}
}

async function signOne(token:string,operationId:string,entry:WebglManifestEntry){const result=await api(token,{action:"sign",operationId,files:[identity(entry)]}) as {files:SignedFile[]};const signed=result.files[0];if(!signed||signed.path!==entry.path)throw new Error("Signed file did not match the local manifest.");return signed;}
async function checkOne(token:string,operationId:string,entry:WebglManifestEntry){return api(token,{action:"check",operationId,file:identity(entry)}) as Promise<FileCheck>;}
function identity(entry:WebglManifestEntry){return{path:entry.path,size:entry.size,sha256:entry.sha256};}
async function api(token:string,body:unknown){const response=await fetch("/api/developer/uploads/build",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)});const payload=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"Build upload request failed.");return payload;}
function put(url:string,headers:Record<string,string>,blob:Blob,signal:AbortSignal,onProgress:(loaded:number)=>void){return new Promise<{status:number;etag:string;checksum:string}>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PUT",url);xhr.timeout=DEVELOPER_BUILD_PUT_TIMEOUT_MS;for(const[name,value]of Object.entries(headers))xhr.setRequestHeader(name,value);xhr.upload.onprogress=event=>onProgress(event.loaded);xhr.onload=()=>xhr.status===412||xhr.status>=200&&xhr.status<300?resolve({status:xhr.status,etag:xhr.getResponseHeader("etag")||"",checksum:xhr.getResponseHeader("x-amz-checksum-sha256")||""}):reject(new BuildPutError(xhr.status===401||xhr.status===403?"expired":"http",xhr.status,`R2 rejected the build file (HTTP ${xhr.status}).`));xhr.onerror=()=>reject(new BuildPutError("network",xhr.status,"Build upload connection failed."));xhr.ontimeout=()=>reject(new BuildPutError("timeout",xhr.status,"Build upload timed out."));xhr.onabort=()=>reject(new DOMException("Build upload cancelled.","AbortError"));const abort=()=>xhr.abort();signal.addEventListener("abort",abort,{once:true});xhr.onloadend=()=>signal.removeEventListener("abort",abort);signal.aborted?abort():xhr.send(blob);});}
class BuildPutError extends Error{constructor(readonly code:string,readonly status:number,message:string){super(message);this.name="BuildPutError";}}
function describeFailure(error:unknown,entry:WebglManifestEntry,attempt:number,durationMs:number){return{path:entry.path,size:entry.size,attempt,durationMs,status:error instanceof BuildPutError?error.status:0,code:error instanceof BuildPutError?error.code:"request"};}
async function runPool<T>(items:T[],concurrency:number,run:(item:T)=>Promise<void>){let cursor=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length){const item=items[cursor++];await run(item);}}));}
function delay(ms:number,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const timer=setTimeout(done,ms);const abort=()=>{clearTimeout(timer);reject(new DOMException("Build upload cancelled.","AbortError"));};function done(){signal.removeEventListener("abort",abort);resolve();}signal.addEventListener("abort",abort,{once:true});if(signal.aborted)abort();});}
function check(signal:AbortSignal){if(signal.aborted)throw new DOMException("Build upload cancelled.","AbortError");}
