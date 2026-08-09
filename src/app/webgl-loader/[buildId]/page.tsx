import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebglLoader } from "@/components/games/WebglLoader";
import { createPublicServerSupabaseClient } from "@/lib/publicServerSupabase";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Play WebGL Game | Uniblex",robots:{index:false,follow:false}};

export default async function WebglLoaderPage({params}:{params:{buildId:string}}) {
  if(!/^[0-9a-f-]{36}$/i.test(params.buildId)) notFound();
  const database=createPublicServerSupabaseClient();
  if(!database) notFound();
  const {data,error}=await database.rpc("get_published_webgl_mvp_loader",{p_build_id:params.buildId});
  const loaderData=!error&&data?.entryUrl&&Array.isArray(data.manifest)
    ? data
    : await getPublishedDeveloperLoader(params.buildId);
  if(!loaderData?.entryUrl||!Array.isArray(loaderData.manifest)) notFound();
  return <WebglLoader config={{
    title:String(loaderData.title||"WebGL Game"),coverUrl:String(loaderData.coverUrl||""),thumbnailUrl:String(loaderData.thumbnailUrl||""),
    entryUrl:String(loaderData.entryUrl),totalBytes:Number(loaderData.totalBytes||0),
    files:loaderData.manifest.map((file:Record<string,unknown>)=>({url:String(file.url||""),size:Number(file.size||0),contentEncoding:String(file.contentEncoding||"")}))
  }}/>;
}

async function getPublishedDeveloperLoader(buildId:string) {
  const database=createServiceSupabaseClient();
  const {data:build,error:buildError}=await database.from("developer_game_builds")
    .select("id,submission_id,total_bytes,manifest,preview_url,verification_status")
    .eq("id",buildId).eq("verification_status","verified").maybeSingle();
  if(buildError||!build||!build.preview_url||!Array.isArray(build.manifest)) return null;

  const {data:submission,error:submissionError}=await database.from("game_submissions")
    .select("id,game_id,status").eq("id",build.submission_id).eq("status","approved").maybeSingle();
  if(submissionError||!submission?.game_id) return null;

  const {data:game,error:gameError}=await database.from("games")
    .select("title,status,cover_url,thumbnail_url,build_id")
    .eq("id",submission.game_id).eq("status","published").eq("build_id",build.id).maybeSingle();
  if(gameError||!game) return null;

  return {
    title:game.title,
    coverUrl:game.cover_url,
    thumbnailUrl:game.thumbnail_url||game.cover_url,
    entryUrl:build.preview_url,
    totalBytes:Number(build.total_bytes||0),
    manifest:build.manifest.map((file:Record<string,unknown>)=>({
      url:buildAssetUrl(build.preview_url,String(file.path||"")),
      size:Number(file.size||0),
      contentEncoding:String(file.contentEncoding||"")
    }))
  };
}

function buildAssetUrl(entryUrl:string,path:string) {
  const base=new URL(entryUrl);
  base.pathname=base.pathname.replace(/[^/]*$/,"");
  const encodedPath=path.split("/").map(encodeURIComponent).join("/");
  return new URL(encodedPath,base).toString();
}
