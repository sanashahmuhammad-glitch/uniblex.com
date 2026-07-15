import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { assertMvpOperationPrefix, deleteMvpObject, getR2MvpConfig, listMvpPrefix } from "@/lib/r2Mvp";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request) {
  if (!areR2GameUploadsEnabled()) return NextResponse.json({error:r2GameUploadsUnavailableMessage},{status:503});
  const auth=await verifyAdminRequest(request);
  if (!auth.authorized||!auth.user) return NextResponse.json({error:auth.error},{status:401});
  try {
    const body=await request.json();
    const operationId=requireUuid(body.operationId);
    const userDb=createUserSupabaseClient(request.headers.get("authorization")||"");
    const {data:operation,error}=await userDb.from("webgl_mvp_upload_operations")
      .select("id,owner_admin_id,state,staging_prefix,file_count,signing_expires_at")
      .eq("id",operationId).eq("owner_admin_id",auth.user.id).maybeSingle();
    if (error||!operation) return NextResponse.json({error:"Upload operation was not found."},{status:404});
    if (operation.state==="published") return NextResponse.json({error:"A published build cannot be removed by upload cancellation."},{status:409});
    const serviceDb=createServiceSupabaseClient();
    const {data:plan,error:beginError}=await serviceDb.rpc("webgl_mvp_begin_abort",{p_operation_id:operationId,p_owner_id:auth.user.id});
    if (beginError||!plan) return NextResponse.json({error:"Upload operation is not abortable."},{status:409});
    const prefix=assertMvpOperationPrefix(String(plan.prefix),operationId);
    const cleanupAfter=plan.cleanupAfter?new Date(String(plan.cleanupAfter)).getTime():0;
    if (cleanupAfter>Date.now()) {
      const retryAfterSeconds=Math.max(1,Math.ceil((cleanupAfter-Date.now())/1000));
      return NextResponse.json(
        {ok:false,state:"aborting",error:"Upload cleanup is waiting for signed upload URLs to expire.",retryAfterSeconds},
        {status:202,headers:{"Retry-After":String(retryAfterSeconds)}}
      );
    }
    const config=getR2MvpConfig();
    const keys=await listMvpPrefix(config,prefix,Number(operation.file_count)+1);
    for (let index=0;index<keys.length;index+=10) await Promise.all(keys.slice(index,index+10).map((key)=>deleteMvpObject(config,key)));
    const remaining=await listMvpPrefix(config,prefix,1);
    if (remaining.length) return NextResponse.json({error:"Upload cleanup is incomplete and must be retried."},{status:503});
    const {error:finishError}=await serviceDb.rpc("webgl_mvp_finish_abort",{p_operation_id:operationId,p_owner_id:auth.user.id});
    if (finishError) return NextResponse.json({error:"Upload objects were removed, but cleanup state could not be finalized."},{status:503});
    return NextResponse.json({ok:true,replayed:operation.state==="aborted",state:"aborted"});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to abort upload."},{status:400});
  }
}
function requireUuid(value:unknown) {
  const text=String(value??"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new Error("Upload operation ID is invalid.");
  return text;
}
