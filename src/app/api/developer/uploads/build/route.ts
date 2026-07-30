import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { verifyDeveloperRequest } from "@/lib/serverDeveloperAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { getR2GameUploadAvailability } from "@/lib/r2GameUploads";
import { deleteMvpObject, getMvpHeadMismatch, getR2MvpConfig, headMvpObject, listMvpPrefix, presignMvpPut, sha256HexToBase64 } from "@/lib/r2Mvp";
import { publicObjectUrl, validateWebglManifest, WEBGL_MVP_LIMITS } from "@/lib/webglMvpManifest";
import { DEVELOPER_BUILD_SIGNING_SECONDS } from "@/lib/developerBuildUploadPolicy";

export const runtime="nodejs";export const dynamic="force-dynamic";
type StoredFile={path:string;size:number;sha256:string;contentType:string;contentEncoding?:string;cacheControl:string;objectKey:string};
const signingSeconds=DEVELOPER_BUILD_SIGNING_SECONDS;

export async function POST(request:Request){
  const auth=await verifyDeveloperRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  const availability=getR2GameUploadAvailability(process.env);if(!availability.available)return NextResponse.json({error:availability.error,code:availability.code},{status:503});
  try{
    const body=await request.json() as Record<string,unknown>;const action=String(body.action||"");const db=createUserSupabaseClient(request.headers.get("authorization") || "");const config=getR2MvpConfig(process.env);
    if(action==="initiate"){
      const submissionId=uuid(body.submissionId);const {data:submission}=await db.from("game_submissions").select("id").eq("id",submissionId).eq("owner_id",auth.user.id).maybeSingle();if(!submission)return NextResponse.json({error:"Submission was not found."},{status:404});
      const idempotencyKey=String(body.idempotencyKey||"");if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey))throw new Error("A valid build upload request identity is required.");const manifest=validateWebglManifest(body.manifest);
      const {data:replayed}=await db.from("developer_game_builds").select("id,operation_id,file_count,total_bytes").eq("owner_id",auth.user.id).eq("submission_id",submissionId).eq("idempotency_key",idempotencyKey).maybeSingle();if(replayed)return NextResponse.json({operationId:replayed.operation_id,buildId:replayed.id,fileCount:replayed.file_count,totalBytes:replayed.total_bytes,replayed:true});
      const operationId=randomUUID();const prefix=`${buildPrefix()}/${auth.user.id}/${operationId}/`;const files:StoredFile[]=manifest.files.map(file=>({...file,objectKey:`${prefix}${file.path}`}));
      const {data,error}=await db.from("developer_game_builds").insert({submission_id:submissionId,owner_id:auth.user.id,operation_id:operationId,idempotency_key:idempotencyKey,build_type:manifest.buildType,compression_mode:manifest.compressionMode,entry_path:manifest.entryPath,file_count:files.length,total_bytes:manifest.totalBytes,manifest:files,verification_status:"pending"}).select("id").single();if(error)throw error;
      await db.from("game_submissions").update({status:"uploading",build_verified:false}).eq("id",submissionId).eq("owner_id",auth.user.id);
      return NextResponse.json({operationId,buildId:data.id,fileCount:files.length,totalBytes:manifest.totalBytes},{status:201});
    }
    const operationId=uuid(body.operationId);const {data:build,error:buildError}=await db.from("developer_game_builds").select("*").eq("operation_id",operationId).eq("owner_id",auth.user.id).maybeSingle();if(buildError||!build)return NextResponse.json({error:"Build upload operation was not found."},{status:404});
    const files=(Array.isArray(build.manifest)?build.manifest:[]) as StoredFile[];const prefix=`${buildPrefix()}/${auth.user.id}/${operationId}/`;if(files.some(file=>!file.objectKey.startsWith(prefix)))throw new Error("Build object ownership is invalid.");
    if(action==="sign"){
      const requested=Array.isArray(body.files)?body.files as Array<Record<string,unknown>>:[];if(!requested.length||requested.length>WEBGL_MVP_LIMITS.maxSigningBatch)throw new Error(`Sign at most ${WEBGL_MVP_LIMITS.maxSigningBatch} files per batch.`);
      const signed=requested.map(candidate=>{const file=matchStoredFile(files,candidate);const headers:Record<string,string>={"content-type":file.contentType,"cache-control":file.cacheControl,"x-amz-meta-sha256":file.sha256,"x-amz-meta-size-bytes":String(file.size),"x-amz-checksum-sha256":sha256HexToBase64(file.sha256),"if-none-match":"*"};if(file.contentEncoding)headers["content-encoding"]=file.contentEncoding;return{path:file.path,url:presignMvpPut(config,file.objectKey,headers,signingSeconds),headers};});
      return NextResponse.json({operationId,files:signed,expiresInSeconds:signingSeconds});
    }
    if(action==="inspect"){
      const cursor=Math.max(0,Number(body.cursor)||0);const end=Math.min(cursor+WEBGL_MVP_LIMITS.verificationBatch,files.length);const batch=files.slice(cursor,end);
      const checks=await Promise.all(batch.map(async file=>({file,mismatch:getMvpHeadMismatch({size:file.size,sha256:file.sha256},await headMvpObject(config,file.objectKey))})));
      return NextResponse.json({done:end>=files.length,nextCursor:end,totalFiles:files.length,verifiedPaths:checks.filter(check=>!check.mismatch).map(check=>check.file.path)});
    }
    if(action==="check"){
      const file=matchStoredFile(files,body.file as Record<string,unknown>);const head=await headMvpObject(config,file.objectKey);const mismatch=getMvpHeadMismatch({size:file.size,sha256:file.sha256},head);
      return NextResponse.json({path:file.path,verified:!mismatch,exists:head.exists,reason:mismatch||null});
    }
    if(action==="cleanup"){
      if(build.verification_status==="verified")return NextResponse.json({error:"A verified build object cannot be removed."},{status:409});
      const file=matchStoredFile(files,body.file as Record<string,unknown>);await deleteMvpObject(config,file.objectKey);return NextResponse.json({path:file.path,removed:true});
    }
    if(action==="verify"){
      const cursor=Math.max(0,Number(body.cursor)||0);const end=Math.min(cursor+WEBGL_MVP_LIMITS.verificationBatch,files.length);const batch=files.slice(cursor,end);
      const checks=await Promise.all(batch.map(async file=>({file,mismatch:getMvpHeadMismatch({size:file.size,sha256:file.sha256},await headMvpObject(config,file.objectKey))})));const mismatch=checks.find(check=>check.mismatch);
      if(mismatch){await db.from("developer_game_builds").update({verification_status:"failed",verification_error:`${mismatch.mismatch}: ${mismatch.file.path}`}).eq("id",build.id);await db.from("game_submissions").update({status:"verification_failed",build_verified:false}).eq("id",build.submission_id);return NextResponse.json({error:`Uploaded file failed verification: ${mismatch.file.path}`},{status:422});}
      if(end<files.length)return NextResponse.json({done:false,nextCursor:end,totalFiles:files.length});
      const actual=await listMvpPrefix(config,prefix,files.length+1);const expected=new Set(files.map(file=>file.objectKey));if(actual.length!==expected.size||actual.some(key=>!expected.has(key)))return NextResponse.json({error:"Upload prefix contains missing or unexpected files."},{status:422});
      const entry=files.find(file=>file.path===build.entry_path);if(!entry)throw new Error("Build entry point is missing.");const previewUrl=publicObjectUrl(config.publicBaseUrl,entry.objectKey);const now=new Date().toISOString();
      await db.from("developer_game_builds").update({verification_status:"verified",verification_error:null,verified_at:now,preview_url:previewUrl}).eq("id",build.id);await db.from("game_submissions").update({status:"ready_for_review",build_verified:true}).eq("id",build.submission_id).eq("owner_id",auth.user.id);
      return NextResponse.json({done:true,nextCursor:end,operationId,buildId:build.id,previewUrl});
    }
    if(action==="abort"){const keys=await listMvpPrefix(config,prefix,files.length+1);await Promise.all(keys.map(key=>deleteMvpObject(config,key)));await db.from("developer_game_builds").update({verification_status:"aborted"}).eq("id",build.id);await db.from("game_submissions").update({status:"upload_failed",build_verified:false}).eq("id",build.submission_id);return NextResponse.json({aborted:true,removed:keys.length});}
    return NextResponse.json({error:"Build upload action is invalid."},{status:400});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:400});}
}
function buildPrefix(){const env=process.env.VERCEL_ENV;if(env==="production")return"developer-webgl-uploads";if(env==="preview"||env==="development"||process.env.NODE_ENV!=="production")return"staging-developer-webgl-uploads";throw new Error("Build storage environment is not configured.");}
function uuid(value:unknown){const input=String(value||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input))throw new Error("Upload identity is invalid.");return input;}
function matchStoredFile(files:StoredFile[],candidate:Record<string,unknown>){const file=files.find(item=>item.path===candidate?.path&&item.size===Number(candidate?.size)&&item.sha256===candidate?.sha256);if(!file)throw new Error("Build file does not match the verified manifest.");return file;}
function safeError(error:unknown){const message=error instanceof Error?error.message:"Build upload failed.";return /access.?key|secret|signature|credential|x-amz-/i.test(message)?"Build upload failed.":message.slice(0,240);}
