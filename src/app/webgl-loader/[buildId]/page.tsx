import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebglLoader } from "@/components/games/WebglLoader";
import { createPublicServerSupabaseClient } from "@/lib/publicServerSupabase";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Play WebGL Game | Uniblex",robots:{index:false,follow:false}};

export default async function WebglLoaderPage({params}:{params:{buildId:string}}) {
  if(!/^[0-9a-f-]{36}$/i.test(params.buildId)) notFound();
  const database=createPublicServerSupabaseClient();
  if(!database) notFound();
  const {data,error}=await database.rpc("get_published_webgl_mvp_loader",{p_build_id:params.buildId});
  if(error||!data||!data.entryUrl||!Array.isArray(data.manifest)) notFound();
  return <WebglLoader config={{
    title:String(data.title||"WebGL Game"),coverUrl:String(data.coverUrl||""),thumbnailUrl:String(data.thumbnailUrl||""),
    entryUrl:String(data.entryUrl),totalBytes:Number(data.totalBytes||0),
    files:data.manifest.map((file:Record<string,unknown>)=>({url:String(file.url||""),size:Number(file.size||0),contentEncoding:String(file.contentEncoding||"")}))
  }}/>;
}
