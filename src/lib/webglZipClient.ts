"use client";

import type {WebglManifest} from "@/lib/webglMvpManifest";

type WorkerProgress={phase:"extracting";completedFiles:number;totalFiles:number;completedBytes:number};
type AnalyzeResult={sessionId:string;manifest:WebglManifest;manifestHash:string};
type Pending={resolve:(value:any)=>void;reject:(error:Error)=>void;onProgress?:(progress:WorkerProgress)=>void};

let worker:Worker|null=null;
const pending=new Map<string,Pending>();

function getWorker() {
  if(worker) return worker;
  worker=new Worker(new URL("../workers/webglZip.worker.ts",import.meta.url),{type:"module"});
  worker.onmessage=(event:MessageEvent<Record<string,any>>)=>{
    const request=pending.get(String(event.data.id));if(!request)return;
    if(event.data.type==="progress"){request.onProgress?.(event.data as WorkerProgress);return;}
    pending.delete(String(event.data.id));
    if(event.data.type==="error")request.reject(new Error(String(event.data.error||"ZIP processing failed.")));
    else request.resolve(event.data);
  };
  worker.onerror=()=>{for(const request of pending.values())request.reject(new Error("ZIP processing worker failed."));pending.clear();worker?.terminate();worker=null;};
  return worker;
}
function call<T>(message:Record<string,unknown>,onProgress?:(progress:WorkerProgress)=>void) {
  const id=crypto.randomUUID();
  return new Promise<T>((resolve,reject)=>{pending.set(id,{resolve,reject,onProgress});getWorker().postMessage({...message,id});});
}
export async function analyzeWebglZip(file:File,onProgress:(progress:WorkerProgress)=>void,signal?:AbortSignal) {
  if(signal?.aborted)throw new DOMException("ZIP processing was cancelled.","AbortError");
  const sessionId=crypto.randomUUID();
  const cancel=()=>getWorker().postMessage({id:crypto.randomUUID(),type:"cancel",sessionId});
  signal?.addEventListener("abort",cancel,{once:true});
  try {
    return await call<AnalyzeResult>({type:"analyze",file,sessionId},onProgress);
  } finally {
    signal?.removeEventListener("abort",cancel);
  }
}
export async function readExtractedWebglFile(sessionId:string,path:string) {
  const result=await call<{blob:Blob}>({type:"read",sessionId,path});return result.blob;
}
export async function clearExtractedWebglSession(sessionId:string) {await call({type:"clear",sessionId});}
export async function cancelExtractedWebglSession(sessionId:string) {await call({type:"cancel",sessionId});}
