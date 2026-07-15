"use client";

import {supabase} from "@/lib/supabase";
import {WEBGL_MVP_LIMITS,type WebglManifestEntry} from "@/lib/webglMvpManifest";
import {analyzeWebglZip,cancelExtractedWebglSession,clearExtractedWebglSession,readExtractedWebglFile} from "@/lib/webglZipClient";
import {shouldRetryMvpUpload} from "@/lib/webglMvpPolicy";

export type WebglUploadProgress={phase:string;percentage:number;totalFiles:number;completedFiles:number;totalBytes:number;completedBytes:number;currentFile?:string};
export type WebglMvpMetadata={slug:string;title:string;description:string;categoryId?:string;genre?:string;coverUrl:string;thumbnailUrl:string;screenshotUrls:string[];tags:string[];desktopControls:unknown[];mobileControls:unknown[]};

export async function uploadWebglMvp(file:File,metadata:WebglMvpMetadata,onProgress:(progress:WebglUploadProgress)=>void,signal?:AbortSignal) {
  if(!supabase)throw new Error("Supabase is not configured.");
  const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
  if(!token)throw new Error("Admin session expired. Sign in again.");
  let sessionId="";let operationId="";
  try {
    onProgress({phase:"Validating ZIP",percentage:1,totalFiles:0,completedFiles:0,totalBytes:file.size,completedBytes:0});
    const analyzed=await analyzeWebglZip(file,(progress)=>onProgress({phase:"Extracting locally",percentage:Math.max(2,Math.round((progress.completedFiles/progress.totalFiles)*28)),totalFiles:progress.totalFiles,completedFiles:progress.completedFiles,totalBytes:0,completedBytes:progress.completedBytes}),signal);
    sessionId=analyzed.sessionId;
    ensureNotCancelled(signal);
    const identityKey=`webgl-mvp:${metadata.slug}:${analyzed.manifestHash}`;
    const idempotencyKey=sessionStorage.getItem(`${identityKey}:idempotency`)||crypto.randomUUID();
    sessionStorage.setItem(`${identityKey}:idempotency`,idempotencyKey);
    const initiated=await api("/api/admin/games/builds/mvp/initiate",token,{...metadata,manifest:analyzed.manifest,manifestHash:analyzed.manifestHash},{"Idempotency-Key":idempotencyKey});
    operationId=String(initiated.operationId);
    const uploadedKey=`${identityKey}:uploaded`;
    const uploaded=new Set<string>(JSON.parse(sessionStorage.getItem(uploadedKey)||"[]"));
    let uploadedBytes=analyzed.manifest.files.filter((entry)=>uploaded.has(entry.path)).reduce((sum,entry)=>sum+entry.size,0);
    let uploadedFiles=uploaded.size;
    for(let start=0;start<analyzed.manifest.files.length;start+=WEBGL_MVP_LIMITS.maxSigningBatch) {
      ensureNotCancelled(signal);
      const batch=analyzed.manifest.files.slice(start,start+WEBGL_MVP_LIMITS.maxSigningBatch).filter((entry)=>!uploaded.has(entry.path));
      if(!batch.length)continue;
      const signed=await api("/api/admin/games/builds/mvp/sign",token,{operationId,files:batch.map(({path,size,sha256})=>({path,size,sha256}))});
      for(const signedFile of signed.files as Array<{path:string;url:string;headers:Record<string,string>}>) {
        ensureNotCancelled(signal);
        const entry=batch.find((candidate)=>candidate.path===signedFile.path);
        if(!entry)throw new Error("Signed upload batch did not match the local manifest.");
        const blob=await readExtractedWebglFile(sessionId,entry.path);
        await uploadWithRetry(signedFile.url,signedFile.headers,blob,signal,(fileBytes)=>onProgress({phase:"Uploading files",percentage:30+Math.round(((uploadedBytes+fileBytes)/analyzed.manifest.totalBytes)*50),totalFiles:analyzed.manifest.files.length,completedFiles:uploadedFiles,totalBytes:analyzed.manifest.totalBytes,completedBytes:uploadedBytes+fileBytes,currentFile:entry.path}));
        uploaded.add(entry.path);uploadedBytes+=entry.size;uploadedFiles+=1;
        sessionStorage.setItem(uploadedKey,JSON.stringify([...uploaded]));
      }
    }
    let cursor=0;let verification:Record<string,any>={};
    do {
      ensureNotCancelled(signal);
      verification=await api("/api/admin/games/builds/mvp/verify",token,{operationId,cursor});
      cursor=Number(verification.nextCursor||cursor);
      onProgress({phase:"Verifying uploaded manifest",percentage:80+Math.round((cursor/analyzed.manifest.files.length)*20),totalFiles:analyzed.manifest.files.length,completedFiles:cursor,totalBytes:analyzed.manifest.totalBytes,completedBytes:analyzed.manifest.totalBytes});
    } while(!verification.done);
    await clearExtractedWebglSession(sessionId);
    sessionStorage.removeItem(uploadedKey);sessionStorage.removeItem(`${identityKey}:idempotency`);
    return {operationId,gameId:String(verification.gameId||initiated.gameId),buildId:String(verification.buildId||initiated.buildId),previewUrl:String(verification.previewUrl||""),manifest:analyzed.manifest};
  } catch(error) {
    if(signal?.aborted&&operationId)await api("/api/admin/games/builds/mvp/abort",token,{operationId}).catch(()=>undefined);
    if(signal?.aborted&&sessionId)await cancelExtractedWebglSession(sessionId).catch(()=>undefined);
    throw error;
  }
}

export async function updateWebglMvp(operationId:string,action:"preview"|"publish") {
  if(!supabase)throw new Error("Supabase is not configured.");
  const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
  if(!token)throw new Error("Admin session expired. Sign in again.");
  return api("/api/admin/games/builds/mvp/actions",token,{operationId,action});
}

async function api(path:string,token:string,body:unknown,extraHeaders:Record<string,string>={}) {
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...extraHeaders},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"WebGL upload request failed.");
  return payload as Record<string,any>;
}
function uploadWithRetry(url:string,headers:Record<string,string>,blob:Blob,signal:AbortSignal|undefined,onProgress:(loaded:number)=>void) {
  return retry(async()=>uploadBlob(url,headers,blob,signal,onProgress),3,signal);
}
async function retry<T>(operation:()=>Promise<T>,attempts:number,signal?:AbortSignal):Promise<T>{
  let last:unknown;
  for(let attempt=0;attempt<attempts;attempt+=1){
    ensureNotCancelled(signal);
    try{return await operation();}
    catch(error){
      last=error;
      if(attempt+1>=attempts||!shouldRetryMvpUpload(error,Boolean(signal?.aborted)))throw error;
      await new Promise((resolve)=>setTimeout(resolve,500*(attempt+1)));
    }
  }
  throw last;
}
function uploadBlob(url:string,headers:Record<string,string>,blob:Blob,signal:AbortSignal|undefined,onProgress:(loaded:number)=>void) {
  return new Promise<void>((resolve,reject)=>{if(signal?.aborted){reject(new DOMException("Upload cancelled.","AbortError"));return;}const request=new XMLHttpRequest();request.open("PUT",url);for(const [name,value] of Object.entries(headers))request.setRequestHeader(name,value);request.upload.onprogress=(event)=>onProgress(event.loaded);request.onload=()=>request.status===412||request.status>=200&&request.status<300?resolve():reject(new Error(`File upload failed with status ${request.status}.`));request.onerror=()=>reject(new Error("Network error during file upload."));request.onabort=()=>reject(new DOMException("Upload cancelled.","AbortError"));const abort=()=>request.abort();signal?.addEventListener("abort",abort,{once:true});request.onloadend=()=>signal?.removeEventListener("abort",abort);request.send(blob);});
}
function ensureNotCancelled(signal?:AbortSignal){if(signal?.aborted)throw new DOMException("Upload cancelled.","AbortError");}
