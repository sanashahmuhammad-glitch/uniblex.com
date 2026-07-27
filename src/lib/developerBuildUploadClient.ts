"use client";
import { supabase } from "@/lib/supabase";
import { analyzeWebglZip, cancelExtractedWebglSession, clearExtractedWebglSession, readExtractedWebglFile } from "@/lib/webglZipClient";
import { WEBGL_MVP_LIMITS } from "@/lib/webglMvpManifest";

export type DeveloperBuildProgress={phase:string;percentage:number;completedFiles:number;totalFiles:number;currentFile?:string};
export async function uploadDeveloperBuild(file:File,submissionId:string,onProgress:(progress:DeveloperBuildProgress)=>void,signal:AbortSignal){
  if(!supabase)throw new Error("Authentication is not configured.");const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error("Authentication expired. Sign in again.");const token=session.access_token;let operationId="";let extracted="";
  try{
    onProgress({phase:"Inspecting ZIP",percentage:1,completedFiles:0,totalFiles:0});
    const analyzed=await analyzeWebglZip(file,progress=>onProgress({phase:"Extracting safely",percentage:Math.max(2,Math.round(progress.completedFiles/progress.totalFiles*28)),completedFiles:progress.completedFiles,totalFiles:progress.totalFiles}),signal);extracted=analyzed.sessionId;
    const idempotencyStorageKey=`uniblex-build-idempotency:${submissionId}:${file.name}:${file.size}:${file.lastModified}`;const idempotencyKey=sessionStorage.getItem(idempotencyStorageKey)||crypto.randomUUID();sessionStorage.setItem(idempotencyStorageKey,idempotencyKey);
    const initiated=await api(token,{action:"initiate",submissionId,manifest:analyzed.manifest,idempotencyKey});operationId=String(initiated.operationId);let completed=0;let bytes=0;
    for(let start=0;start<analyzed.manifest.files.length;start+=WEBGL_MVP_LIMITS.maxSigningBatch){
      check(signal);const batch=analyzed.manifest.files.slice(start,start+WEBGL_MVP_LIMITS.maxSigningBatch);const signed=await api(token,{action:"sign",operationId,files:batch.map(({path,size,sha256})=>({path,size,sha256}))}) as {files:Array<{path:string;url:string;headers:Record<string,string>}>};
      for(const target of signed.files){check(signal);const entry=batch.find(item=>item.path===target.path);if(!entry)throw new Error("Signed file did not match the local manifest.");const blob=await readExtractedWebglFile(extracted,entry.path);await put(target.url,target.headers,blob,signal,loaded=>onProgress({phase:"Uploading files",percentage:30+Math.round((bytes+loaded)/analyzed.manifest.totalBytes*50),completedFiles:completed,totalFiles:analyzed.manifest.files.length,currentFile:entry.path}));completed++;bytes+=entry.size;}
    }
    let cursor=0;let result:Record<string,unknown>={};do{check(signal);result=await api(token,{action:"verify",operationId,cursor});cursor=Number(result.nextCursor||cursor);onProgress({phase:"Verifying checksums",percentage:80+Math.round(cursor/analyzed.manifest.files.length*20),completedFiles:cursor,totalFiles:analyzed.manifest.files.length});}while(!result.done);
    await clearExtractedWebglSession(extracted);sessionStorage.removeItem(idempotencyStorageKey);return{...result,manifest:analyzed.manifest,operationId};
  }catch(error){if(signal.aborted&&operationId)await api(token,{action:"abort",operationId}).catch(()=>undefined);if(extracted)await cancelExtractedWebglSession(extracted).catch(()=>undefined);throw error;}
}
async function api(token:string,body:unknown){const response=await fetch("/api/developer/uploads/build",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)});const payload=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"Build upload request failed.");return payload;}
function put(url:string,headers:Record<string,string>,blob:Blob,signal:AbortSignal,onProgress:(loaded:number)=>void){return new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PUT",url);for(const[name,value]of Object.entries(headers))xhr.setRequestHeader(name,value);xhr.upload.onprogress=event=>onProgress(event.loaded);xhr.onload=()=>xhr.status===412||xhr.status>=200&&xhr.status<300?resolve():reject(new Error(xhr.status===401||xhr.status===403?"Upload URL expired. Retry the file.":`R2 rejected the build file (HTTP ${xhr.status}).`));xhr.onerror=()=>reject(new Error("Build upload connection failed. Retry the affected file."));xhr.onabort=()=>reject(new DOMException("Build upload cancelled.","AbortError"));const abort=()=>xhr.abort();signal.addEventListener("abort",abort,{once:true});xhr.onloadend=()=>signal.removeEventListener("abort",abort);signal.aborted?abort():xhr.send(blob);});}
function check(signal:AbortSignal){if(signal.aborted)throw new DOMException("Build upload cancelled.","AbortError");}
