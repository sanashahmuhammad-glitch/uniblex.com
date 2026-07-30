import { NextResponse } from "next/server";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { verifyDeveloperRequest } from "@/lib/serverDeveloperAuth";
import { slugify } from "@/lib/slug";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(request:Request){
  const auth=await verifyDeveloperRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  const {data,error}=await createUserSupabaseClient(request.headers.get("authorization") || "").from("game_submissions").select("id,title,slug,status,engine,updated_at,build_verified,short_description,submission_reviews(decision,developer_feedback,created_at)").eq("owner_id",auth.user.id).order("updated_at",{ascending:false}).limit(200);
  return error?NextResponse.json({error:"Submissions could not be loaded."},{status:500}):NextResponse.json({submissions:(data||[]).map(row=>({...row,cover_url:null}))});
}
export async function POST(request:Request){
  const auth=await verifyDeveloperRequest(request);if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  try{
    const body=await request.json() as Record<string,unknown>;const db=createUserSupabaseClient(request.headers.get("authorization") || "");
    const {data:profile}=await db.from("developer_profiles").select("id").eq("id",auth.user.id).maybeSingle();if(!profile){const studio=String(auth.user.user_metadata?.studio_name||auth.user.user_metadata?.display_name||"").trim().slice(0,120);const {error:profileError}=await db.from("developer_profiles").insert({id:auth.user.id,studio_name:studio,display_name:studio,account_status:"pending"});if(profileError)return NextResponse.json({error:"Complete your developer profile before saving a submission."},{status:409});}
    if(body.action==="archive"){const id=uuid(body.id);const {data,error}=await db.from("game_submissions").update({status:"archived"}).eq("id",id).eq("owner_id",auth.user.id).in("status",["draft","rejected","changes_requested"]).select().maybeSingle();return error||!data?NextResponse.json({error:"This submission cannot be archived."},{status:409}):NextResponse.json({submission:data});}
    const input=body.submission&&typeof body.submission==="object"?body.submission as Record<string,unknown>:body;const id=optionalUuid(input.id);const status=["draft","ready_for_review","submitted"].includes(String(input.status))?String(input.status):"draft";
    const payload={owner_id:auth.user.id,title:text(input.title,160),slug:slugify(String(input.slug||input.title||"")),short_description:text(input.short_description,220),full_description:text(input.full_description,5000),category_id:optionalUuid(input.category_id),tags:array(input.tags,20),engine:text(input.engine,80)||null,primary_language:text(input.primary_language,80)||"English",age_rating:text(input.age_rating,80)||null,content_declaration:object(input.content_declaration),options:object(input.options),gameplay_video_url:httpsUrl(input.gameplay_video_url),status,submitted_at:status==="submitted"?new Date().toISOString():null};
    if(!payload.title||!payload.slug)return NextResponse.json({error:"Game title and slug are required."},{status:400});
    const query=id?db.from("game_submissions").update(payload).eq("id",id).eq("owner_id",auth.user.id):db.from("game_submissions").insert(payload);const {data,error}=await query.select().single();
    if(error)return NextResponse.json({error:error.message.includes("unique")?"This studio already uses that slug.":"Submission could not be saved."},{status:409});
    return NextResponse.json({submission:data},{status:id?200:201});
  }catch{return NextResponse.json({error:"Submission request is invalid."},{status:400});}
}
function text(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):"";} function object(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function array(value:unknown,max:number){return (Array.isArray(value)?value.map(String):String(value||"").split(",")).map(item=>item.trim()).filter(Boolean).slice(0,max);}
function optionalUuid(value:unknown){const input=String(value||"");return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)?input:null;} function uuid(value:unknown){const result=optionalUuid(value);if(!result)throw new Error("Invalid ID");return result;}
function httpsUrl(value:unknown){const input=text(value,1000);if(!input)return null;try{const parsed=new URL(input);return parsed.protocol==="https:"?parsed.toString():null;}catch{return null;}}
