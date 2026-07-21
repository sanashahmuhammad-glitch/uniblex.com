"use client";

import {useEffect,useRef,useState} from "react";

type LoaderConfig={title:string;coverUrl:string;thumbnailUrl:string;entryUrl:string;totalBytes:number;files:Array<{url:string;size:number;contentEncoding:string}>};
type Phase="idle"|"loading"|"ready"|"error";
type UnityMessage={source?:string;type?:string;progress?:number;message?:string};

const CAR_SIM_STAGING_PREFIX="/staging-webgl-uploads/4622d198-aeea-4129-a957-a05ba73a5d56/";

export function WebglLoader({config}:{config:LoaderConfig}) {
  const root=useRef<HTMLDivElement>(null);
  const iframe=useRef<HTMLIFrameElement>(null);
  const [phase,setPhase]=useState<Phase>("idle");
  const [loaded,setLoaded]=useState(0);
  const [error,setError]=useState("");
  const [unityStatus,setUnityStatus]=useState("Downloading game filesâ€¦");
  const [unityProgress,setUnityProgress]=useState(0);
  const [loadAttempt,setLoadAttempt]=useState(0);
  const total=Math.max(config.totalBytes,config.files.reduce((sum,file)=>sum+file.size,0),1);
  const percent=Math.min(100,Math.round((loaded/total)*100));
  const stagedLoader=config.entryUrl.includes(CAR_SIM_STAGING_PREFIX);

  useEffect(()=>{
    if(!stagedLoader||phase!=="loading") return;
    const entryOrigin=new URL(config.entryUrl).origin;
    const onMessage=(event:MessageEvent<UnityMessage>)=>{
      if(event.origin!==entryOrigin||event.source!==iframe.current?.contentWindow||event.data?.source!=="uniblex-car-sim") return;
      if(event.data.type==="unity-progress") {
        const progress=Math.max(0,Math.min(1,Number(event.data.progress)||0));
        setUnityProgress(progress);
        setUnityStatus(progress<0.7?"Downloading game filesâ€¦":progress<0.95?"Preparing Unity runtimeâ€¦":"Starting gameâ€¦");
      } else if(event.data.type==="unity-ready") {
        setUnityProgress(1);
        setUnityStatus("Starting gameâ€¦");
        setPhase("ready");
        window.setTimeout(()=>iframe.current?.focus(),450);
      } else if(event.data.type==="unity-error") {
        setError(event.data.message||"Unable to start the Unity runtime.");
        setPhase("error");
      }
    };
    window.addEventListener("message",onMessage);
    return()=>window.removeEventListener("message",onMessage);
  },[config.entryUrl,phase,stagedLoader]);
  async function start() {
    setPhase("loading");setLoaded(0);setError("");
    if(stagedLoader) {setUnityProgress(0);setUnityStatus("Downloading game filesâ€¦");setLoadAttempt((attempt)=>attempt+1);return;}
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
    <div ref={root} tabIndex={0} className="relative aspect-video w-full max-w-[1920px] overflow-hidden bg-black outline-none" onClick={()=>{root.current?.focus();if(phase==="ready") iframe.current?.focus();}}>
      {stagedLoader&&phase!=="idle"?<>
        <iframe key={loadAttempt} ref={iframe} src={config.entryUrl} title={config.title} allow="fullscreen; gamepad; autoplay" allowFullScreen tabIndex={0} className={"h-full w-full border-0 bg-black transition-opacity duration-500 motion-reduce:transition-none "+(phase==="ready"?"opacity-100":"opacity-0")}/>
        <div aria-hidden={phase==="ready"} className={"absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center p-6 text-center transition-opacity duration-500 motion-reduce:transition-none "+(phase==="ready"?"pointer-events-none opacity-0":"opacity-100")} style={{backgroundImage:"linear-gradient(rgba(0,0,0,.62),rgba(0,0,0,.92)),url("+config.coverUrl+")"}}>
          {config.thumbnailUrl?<img src={config.thumbnailUrl} alt="" className="mb-5 aspect-video w-40 rounded-lg object-cover shadow-2xl"/>:null}
          <h1 className="font-heading text-3xl sm:text-5xl">{config.title}</h1>
          {phase==="loading"?<div className="mt-7 w-full max-w-xl" role="status" aria-live="polite" aria-atomic="true">
            <p className="text-base font-bold">{unityStatus}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20" aria-hidden="true"><div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-uniblex-blue to-uniblex-purple motion-reduce:animate-none" style={{transform:"translateX("+Math.round(unityProgress*100)+"%)"}}/></div>
            <p className="mt-3 text-sm text-white/70">Large Unity games may pause briefly while the browser decompresses files and prepares WebAssembly.</p>
          </div>:null}
          {phase==="error"?<div className="mt-6" role="alert"><p className="text-red-200">{error}</p><button className="btn-primary mt-4" onClick={start}>Retry</button></div>:null}
          <p className="mt-5 hidden text-sm text-white/80 [@media(orientation:portrait)]:block">Rotate your device for the best 16:9 experience.</p>
        </div>
      </>:phase==="ready"?<iframe src={config.entryUrl} title={config.title} allow="fullscreen; gamepad; autoplay" allowFullScreen className="h-full w-full border-0 bg-black"/>:
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
