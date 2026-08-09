import { NextResponse } from "next/server";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { verifyReviewerRequest } from "@/lib/serverDeveloperAuth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const decisions=new Set(["under_review","changes_requested","approved","rejected","published","unpublished"]);

export async function GET(request:Request){
  const auth=await verifyReviewerRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  const db=createUserSupabaseClient(request.headers.get("authorization") || "");const {data,error}=await db.from("game_submissions").select("*,developer_profiles!game_submissions_owner_id_fkey(studio_name,display_name,support_email),developer_game_builds(id,verification_status,preview_url,build_type,compression_mode,file_count,total_bytes,verified_at),game_media(role,public_url),submission_reviews(id,decision,developer_feedback,checklist,created_at,reviewer_id)").order("updated_at",{ascending:false}).limit(200);
  return error?NextResponse.json({error:"Developer review queue could not be loaded."},{status:500}):NextResponse.json({submissions:data||[],role:auth.role});
}
export async function POST(request:Request){
  const auth=await verifyReviewerRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  try{
    const body=await request.json() as Record<string,unknown>;const submissionId=uuid(body.submissionId);const decision=String(body.decision||"");if(!decisions.has(decision))return NextResponse.json({error:"Review decision is invalid."},{status:400});if(["published","unpublished"].includes(decision)&&!["owner","admin"].includes(auth.role))return NextResponse.json({error:"Owner or admin authority is required to publish."},{status:403});
    const developerFeedback=String(body.developerFeedback||"").trim().slice(0,5000)||null;const internalNotes=String(body.internalNotes||"").trim().slice(0,5000)||null;const checklist=body.checklist&&typeof body.checklist==="object"?body.checklist:{};if(["changes_requested","rejected"].includes(decision)&&!developerFeedback)return NextResponse.json({error:"Developer-visible feedback is required for this decision."},{status:400});
    const db=createUserSupabaseClient(request.headers.get("authorization") || "");
    const {data,error}=await db.rpc("review_developer_submission",{p_submission_id:submissionId,p_decision:decision,p_developer_feedback:developerFeedback,p_internal_notes:internalNotes,p_checklist:checklist});
    if(error){
      const safe=String(error.message||"");
      const known=["Reviewer access is required","Owner or admin authority is required to publish","Developer-visible feedback is required","Submission was not found","An unverified build cannot be approved or published","Every QA checklist item must pass","Approve the submission before publishing it","Only a published submission can be unpublished","A verified preview build is required","Verified cover and thumbnail artwork are required","The public game slug is already in use","Linked public game was not found"];
      const message=known.find(item=>safe.includes(item));
      return NextResponse.json({error:message?`${message}.`:"Review decision could not be recorded."},{status:safe.includes("access")||safe.includes("authority")?403:409});
    }
    return NextResponse.json({submission:data});
  }catch{return NextResponse.json({error:"Review decision could not be recorded."},{status:400});}
}
function uuid(value:unknown){const input=String(value||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input))throw new Error("Invalid submission");return input;}
