import { NextResponse } from "next/server";
import { verifyDeveloperRequest } from "@/lib/serverDeveloperAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { getR2GameUploadAvailability } from "@/lib/r2GameUploads";
import { deleteMvpObject, getR2MvpConfig, headR2ObjectResponse, presignMvpPut } from "@/lib/r2Mvp";
import { assertGameMediaKey, createGameMediaKey, GAME_MEDIA_SIGNING_SECONDS, gameMediaHeaders, gameMediaPublicUrl, validateGameMediaDescriptor, verifyGameMediaHead } from "@/lib/r2GameMedia";

export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:Request){
  const auth=await verifyDeveloperRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  const availability=getR2GameUploadAvailability(process.env);if(!availability.available)return NextResponse.json({error:availability.error,code:availability.code},{status:503});
  try{
    const body=await request.json() as Record<string,unknown>;const action=String(body.action||"");const config=getR2MvpConfig(process.env);const ownerId=auth.user.id;
    if(action==="sign"){
      const descriptor=validateGameMediaDescriptor(body.file);const objectKey=createGameMediaKey(ownerId,descriptor);const headers={...gameMediaHeaders(ownerId,descriptor),"cache-control":"public, max-age=31536000, immutable"};
      return NextResponse.json({objectKey,uploadUrl:presignMvpPut(config,objectKey,headers,GAME_MEDIA_SIGNING_SECONDS),publicUrl:gameMediaPublicUrl(config,objectKey),requiredHeaders:headers,expiresAt:new Date(Date.now()+GAME_MEDIA_SIGNING_SECONDS*1000).toISOString()});
    }
    if(action==="verify"){
      const descriptor=validateGameMediaDescriptor(body.file);const objectKey=assertGameMediaKey(String(body.objectKey||""),ownerId,descriptor.draftId,descriptor.role);const response=await headR2ObjectResponse(config,objectKey);
      if(!response.ok)return NextResponse.json({error:response.status===404?"Upload completed but the object was not found.":"Upload completed but verification could not read the object."},{status:409});
      verifyGameMediaHead(descriptor,ownerId,response.headers);
      const db=createUserSupabaseClient(request.headers.get("authorization") || "");
      const {data:submission}=await db.from("game_submissions").select("id").eq("id",descriptor.draftId).eq("owner_id",ownerId).maybeSingle();
      if(!submission)return NextResponse.json({error:"The media draft is not owned by this developer."},{status:403});
      const publicUrl=gameMediaPublicUrl(config,objectKey);
      const {data:previous}=await db.from("game_media").select("object_key").eq("submission_id",descriptor.draftId).eq("role",descriptor.role).maybeSingle();
      const {error:mediaError}=await db.from("game_media").upsert({submission_id:descriptor.draftId,owner_id:ownerId,role:descriptor.role,object_key:objectKey,public_url:publicUrl,file_name:descriptor.name,content_type:descriptor.contentType,size_bytes:descriptor.size,sha256:descriptor.sha256,verified_at:new Date().toISOString()},{onConflict:"submission_id,role"});
      if(mediaError)return NextResponse.json({error:"Upload verified but the media record could not be saved."},{status:500});
      if(previous?.object_key&&previous.object_key!==objectKey)await deleteMvpObject(config,assertGameMediaKey(previous.object_key,ownerId,descriptor.draftId,descriptor.role));
      return NextResponse.json({verified:true,objectKey,publicUrl,metadata:{role:descriptor.role,name:descriptor.name,contentType:descriptor.contentType,size:descriptor.size,sha256:descriptor.sha256}});
    }
    if(action==="cleanup"){
      const draftId=String(body.draftId||"");const keys=Array.isArray(body.objectKeys)?[...new Set(body.objectKeys.map(String))]:[];if(keys.length>8)throw new Error("Too many media objects were requested for cleanup.");const validated=keys.map(key=>assertGameMediaKey(key,ownerId,draftId));await Promise.all(validated.map(key=>deleteMvpObject(config,key)));return NextResponse.json({cleaned:validated.length});
    }
    return NextResponse.json({error:"Media upload action is invalid."},{status:400});
  }catch(error){return NextResponse.json({error:safeError(error)},{status:400});}
}
function safeError(error:unknown){const message=error instanceof Error?error.message:"Media upload could not be completed.";if(/access.?key|secret|signature|credential|x-amz-/i.test(message))return "Media upload could not be completed.";if(/checksum/i.test(message))return "Checksum did not match.";return message.slice(0,240);}
