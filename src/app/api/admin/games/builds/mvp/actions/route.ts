import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { areR2GameUploadsEnabled,r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request) {
  if(!areR2GameUploadsEnabled()) return NextResponse.json({error:r2GameUploadsUnavailableMessage},{status:503});
  const auth=await verifyAdminRequest(request);
  if(!auth.authorized||!auth.user) return NextResponse.json({error:auth.error},{status:401});
  try {
    const body=await request.json();
    const operationId=requireUuid(body.operationId);
    const action=String(body.action??"");
    if(action!=="preview"&&action!=="publish") return NextResponse.json({error:"Unsupported WebGL build action."},{status:400});
    const database=createServiceSupabaseClient();
    const rpc=action==="preview"?"webgl_mvp_preview":"webgl_mvp_publish";
    const {data,error}=await database.rpc(rpc,{p_operation_id:operationId,p_owner_id:auth.user.id});
    if(error||!data) return NextResponse.json({error:action==="publish"?"Build must pass verification before publishing.":"Build is not ready for preview."},{status:409});
    return NextResponse.json(data);
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to update WebGL build."},{status:400});
  }
}
function requireUuid(value:unknown) {
  const text=String(value??"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new Error("Upload operation ID is invalid.");
  return text;
}
