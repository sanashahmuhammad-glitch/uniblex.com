"use client";

import {useRef,useState} from "react";

type LoaderConfig={title:string;coverUrl:string;thumbnailUrl:string;entryUrl:string;totalBytes:number;files:Array<{url:string;size:number;contentEncoding:string}>};
type Phase="idle"|"loading"|"ready"|"error";

export function WebglLoader({config}:{config:LoaderConfig}) {
  const root=useRef<HTMLDivElement>(null);
  const [phase,setPhase]=useState<Phase>("idle");
  const [loaded,setLoaded]=useState(0);
  const [error,setError]=useState("");
  const total=Math.max(config.totalBytes,config.files.reduce((sum,file)=>sum+file.size,0),1);
  const percent=Math.min(100,Math.round((loaded/total)*100));

  async function start() {
    setPhase("loading");setLoaded(0);setError("");
    try {
      let completed=0;
      const queue=[...config.files];
      await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
        while(queue.length) {
          const file=queue.shift();if(!file) return;
          const response=await fetch(file.url,{cache:"force-cache",mode:"cors"});
          if(!response.ok) throw new Error("A game file could not be downloaded.");
          const reader=response.body?.getReader(); let fileLoaded=0;
          if(reader) {
            while(true) { const chunk=await reader.read();if(chunk.done) break;fileLoaded+=chunk.value.byteLength;if(!file.contentEncoding){completed+=chunk.value.byteLength;setLoaded(Math.min(completed,total));} }
          } else { fileLoaded=(await response.arrayBuffer()).byteLength; }
          if(file.contentEncoding){completed+=file.size;setLoaded(Math.min(completed,total));}
          else if(fileLoaded<file.size){completed+=file.size-fileLoaded;setLoaded(Math.min(completed,total));}
        }
      }));
      setLoaded(total);setPhase("ready");
    } catch(cause) { setError(cause instanceof Error?cause.message:"Unable to load the game.");setPhase("error"); }
  }
  async function fullscreen() { if(root.current?.requestFullscreen) await root.current.requestFullscreen(); }

  return <main className="flex min-h-screen items-center justify-center bg-black p-0 text-white">
    <div ref={root} tabIndex={0} className="relative aspect-video w-full max-w-[1920px] overflow-hidden bg-black outline-none" onClick={()=>root.current?.focus()}>
      {phase==="ready"?<iframe src={config.entryUrl} title={config.title} allow="fullscreen; gamepad; autoplay" allowFullScreen className="h-full w-full border-0 bg-black"/>:
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center p-6 text-center" style={{backgroundImage:`linear-gradient(rgba(0,0,0,.58),rgba(0,0,0,.88)),url(${config.coverUrl})`}}>
        {config.thumbnailUrl?<img src={config.thumbnailUrl} alt="" className="mb-5 aspect-video w-40 rounded-lg object-cover shadow-2xl"/>:null}
        <h1 className="font-heading text-3xl sm:text-5xl">{config.title}</h1>
        {phase==="loading"?<div className="mt-7 w-full max-w-xl">
          <div className="mb-2 flex justify-between text-sm"><span>Loading game files</span><span>{percent}%</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-uniblex-blue transition-all" style={{width:`${percent}%`}}/></div>
          <p className="mt-3 text-sm text-white/75">{formatMb(loaded)} MB / {formatMb(total)} MB</p>
        </div>:null}
        {phase==="idle"?<button className="btn-primary mt-7" onClick={start}>Load Game</button>:null}
        {phase==="error"?<div className="mt-6"><p className="text-red-200">{error}</p><button className="btn-primary mt-4" onClick={start}>Retry</button></div>:null}
        <p className="mt-5 hidden text-sm text-white/80 [@media(orientation:portrait)]:block">Rotate your device for the best 16:9 experience.</p>
      </div>}
      <button type="button" onClick={fullscreen} className="absolute right-3 top-3 rounded-md bg-black/70 px-3 py-2 text-xs font-bold">Fullscreen</button>
    </div>
  </main>;
}
function formatMb(bytes:number){return (bytes/(1024*1024)).toFixed(1)}
