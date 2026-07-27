import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { verifyDeveloperRequest } from "@/lib/serverDeveloperAuth";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth=await verifyDeveloperRequest(request); if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  const {data,error}=await createServiceSupabaseClient().from("developer_profiles").select("*").eq("id",auth.user.id).maybeSingle();
  return error?NextResponse.json({error:"Developer profile could not be loaded."},{status:500}):NextResponse.json({profile:data});
}
export async function POST(request: Request) {
  const auth=await verifyDeveloperRequest(request); if(!auth.authorized)return NextResponse.json({error:auth.error},{status:401});
  try {
    const body=await request.json() as Record<string,unknown>; const now=new Date().toISOString();
    const payload={id:auth.user.id,studio_name:text(body.studio_name,120)||text(auth.user.user_metadata?.studio_name,120),display_name:text(body.display_name,120)||text(auth.user.user_metadata?.display_name,120),country:text(body.country,100)||null,website:url(body.website),portfolio_url:url(body.portfolio_url),company_info:text(body.company_info,2000)||null,support_email:email(body.support_email),social_links:social(body.social_links),logo_url:url(body.logo_url),biography:text(body.biography,1200)||null,terms_accepted_at:truthy(body.terms_accepted)?now:undefined,privacy_accepted_at:truthy(body.privacy_accepted)?now:undefined,account_status:"active"};
    const {data,error}=await createServiceSupabaseClient().from("developer_profiles").upsert(payload,{onConflict:"id"}).select().single(); if(error)throw error;
    return NextResponse.json({profile:data});
  } catch { return NextResponse.json({error:"Developer profile could not be saved."},{status:400}); }
}
function text(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):"";}
function truthy(value:unknown){return value===true||value==="true"||value==="on";}
function url(value:unknown){const input=text(value,1000);if(!input)return null;try{const parsed=new URL(input);return parsed.protocol==="https:"?parsed.toString():null;}catch{return null;}}
function email(value:unknown){const input=text(value,320).toLowerCase();return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input)?input:null;}
function social(value:unknown){if(value&&typeof value==="object")return value;const input=text(value,2000);return input?{links:input.split(/[\n,]/).map(item=>item.trim()).filter(Boolean).slice(0,10)}:{};}
