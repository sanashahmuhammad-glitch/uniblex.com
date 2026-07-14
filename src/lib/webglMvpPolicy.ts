import {normalizeWebglPath,WEBGL_MVP_LIMITS} from "@/lib/webglMvpManifest";

export type SigningOperation={id:string;ownerId:string;state:string;stagingPrefix:string;expiresAt:number};
export type SigningFile={path:string;size:number;sha256:string;objectKey:string};

export function authorizeSigningBatch(operation:SigningOperation,adminId:string,requested:Array<Omit<SigningFile,"objectKey">>,stored:SigningFile[]) {
  if(operation.ownerId!==adminId)throw new Error("Upload operation was not found.");
  if(operation.state!=="uploading"||operation.expiresAt<=Date.now())throw new Error("Upload operation is no longer accepting files.");
  if(!requested.length||requested.length>WEBGL_MVP_LIMITS.maxSigningBatch)throw new Error("Signing batch size is invalid.");
  const prefix=`staging-webgl-uploads/${operation.id}/`;
  if(operation.stagingPrefix!==prefix)throw new Error("Upload operation storage binding is invalid.");
  const paths=requested.map((file)=>normalizeWebglPath(file.path));
  if(new Set(paths.map((path)=>path.toLowerCase())).size!==paths.length)throw new Error("Signing batch contains duplicate paths.");
  return requested.map((request)=>{
    const file=stored.find((candidate)=>candidate.path===request.path);
    if(!file||file.size!==request.size||file.sha256!==request.sha256||file.objectKey!==`${prefix}${request.path}`)throw new Error("Signing batch does not match the authoritative manifest.");
    return file;
  });
}

export function canPublishMvp(state:string,verified:number,total:number){return (state==="ready_for_preview"||state==="previewed")&&total>0&&verified===total}
export function canAbortMvp(state:string){return ["uploading","verifying","ready_for_preview","previewed","failed","aborting","aborted"].includes(state)}

export function shouldRetryMvpUpload(error:unknown,signalAborted:boolean) {
  const name=typeof error==="object"&&error!==null&&"name" in error?String((error as {name?:unknown}).name):"";
  return !signalAborted&&name!=="AbortError";
}
