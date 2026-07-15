import {normalizeWebglPath,type WebglBuildType,type WebglCompressionMode} from "@/lib/webglMvpManifest";

export function selectArchiveRoot(paths:string[]) {
  const normalized=paths.map(normalizeWebglPath);
  const indexes=normalized.filter((path)=>path.toLowerCase()==="index.html"||path.toLowerCase().endsWith("/index.html"));
  if(indexes.length!==1)throw new Error(indexes.length?"ZIP contains ambiguous index.html entry points.":"ZIP is missing index.html.");
  const root=indexes[0].slice(0,indexes[0].length-"index.html".length);
  const stripped=normalized.map((path)=>{
    if(root&&!path.startsWith(root))throw new Error("ZIP contains files outside its game root.");
    return normalizeWebglPath(root?path.slice(root.length):path);
  });
  const folded=stripped.map((path)=>path.toLocaleLowerCase("en-US"));
  if(new Set(folded).size!==folded.length)throw new Error("ZIP contains duplicate normalized paths.");
  return {rootPrefix:root,paths:stripped};
}

export function detectWebglBuild(indexHtml:string,paths:string[]):{buildType:WebglBuildType;compressionMode:WebglCompressionMode;requiredPaths:string[]} {
  const set=new Set(paths.map((path)=>path.toLocaleLowerCase("en-US")));
  const loader=paths.filter((path)=>/\.loader\.js$/i.test(path));
  const framework=paths.filter((path)=>/\.framework\.js(?:\.(?:br|gz|unityweb))?$/i.test(path));
  const data=paths.filter((path)=>/\.data(?:\.(?:br|gz|unityweb))?$/i.test(path));
  const wasm=paths.filter((path)=>/\.wasm(?:\.(?:br|gz|unityweb))?$/i.test(path));
  if(loader.length+framework.length+data.length+wasm.length) {
    if(loader.length!==1||framework.length!==1||data.length!==1||wasm.length!==1)throw new Error("Unity build files are missing or ambiguous.");
    if(!indexHtml.includes(fileName(loader[0])))throw new Error("index.html does not reference the detected Unity loader.");
    const payloads=[framework[0],data[0],wasm[0]];
    const suffixes=payloads.map((path)=>path.endsWith(".br")?"br":path.endsWith(".gz")?"gz":path.endsWith(".unityweb")?"unityweb":"none");
    if(new Set(suffixes).size!==1)throw new Error("Unity build mixes incompatible compression modes.");
    const suffix=suffixes[0];
    return {
      buildType:suffix==="br"?"unity-brotli":suffix==="gz"?"unity-gzip":suffix==="unityweb"?"unity-unityweb":"unity-uncompressed",
      compressionMode:suffix==="br"?"brotli":suffix==="gz"?"gzip":suffix==="unityweb"?"unityweb":"none",
      requiredPaths:["index.html",loader[0],...payloads].sort()
    };
  }
  const required=new Set<string>(["index.html"]);
  for(const match of indexHtml.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const reference=match[1].trim();
    if(/^(?:https?:|data:image\/|blob:|#)/i.test(reference))continue;
    if(/^(?:javascript:|data:text\/html|\/\/)/i.test(reference))throw new Error("index.html contains an unsafe external reference.");
    const path=resolveRelativePath(reference.split(/[?#]/)[0]);
    if(!set.has(path.toLocaleLowerCase("en-US")))throw new Error(`index.html references a missing local asset: ${path}`);
    required.add(path);
  }
  return {buildType:"html5",compressionMode:"mixed-generic",requiredPaths:[...required].sort()};
}

function resolveRelativePath(reference:string) {
  const parts:string[]=[];
  for(const part of reference.replace(/^\.\//,"").split("/")) {
    if(!part||part===".")continue;
    if(part===".."){if(!parts.pop())throw new Error("index.html reference escapes the game root.");}
    else parts.push(part);
  }
  return normalizeWebglPath(parts.join("/"));
}
function fileName(path:string){return path.slice(path.lastIndexOf("/")+1)}
