const PUBLIC_PREFIXES = ["developer-webgl-uploads/"];

export default {
  async fetch(request, environment) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (!["GET", "HEAD"].includes(request.method) || !PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      return new Response("Not found", { status: 404 });
    }

    const object = request.method === "HEAD"
      ? await environment.BUCKET.head(key)
      : await environment.BUCKET.get(key);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Content-Length", String(object.size));
    headers.set("X-Content-Type-Options", "nosniff");
    if (object.httpMetadata?.contentEncoding) {
      headers.set("Content-Encoding", object.httpMetadata.contentEncoding);
      headers.set("Cache-Control", "public, max-age=31536000, immutable, no-transform");
    } else if ((object.httpMetadata?.contentType || "").startsWith("text/html")) {
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate, no-transform");
    } else {
      headers.set("Cache-Control", `${object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable"}, no-transform`);
    }

    if (request.method === "GET" && (object.httpMetadata?.contentType || "").startsWith("text/html")) {
      const html = addUniblexRuntimeBridge(await object.text());
      headers.set("Content-Length", String(new TextEncoder().encode(html).byteLength));
      return new Response(html, { status: 200, headers, encodeBody: "manual" });
    }

    // R2 stores Unity assets already compressed. Without manual encoding,
    // Cloudflare may add a second content-coding layer to the response.
    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
      encodeBody: "manual"
    });
  }
};

function addUniblexRuntimeBridge(html) {
  if (html.includes("data-uniblex-runtime-bridge")) return html;
  const bridge = String.raw`
<style data-uniblex-runtime-bridge>
html.uniblex-embedded,html.uniblex-embedded body{width:100%!important;height:100%!important;margin:0!important;overflow:hidden!important;background:#000!important}
html.uniblex-embedded #unity-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;transform:none!important;background:#000!important}
html.uniblex-embedded #unity-canvas{display:block!important;width:100%!important;height:100%!important;background:#000!important}
html.uniblex-embedded #unity-loading-bar,html.uniblex-embedded #unity-footer{display:none!important}
</style>
<script data-uniblex-runtime-bridge>
(()=>{
  if(window.parent===window)return;
  document.documentElement.classList.add("uniblex-embedded");
  const send=(type,detail={})=>window.parent.postMessage({source:"uniblex-webgl",type,...detail},"*");
  let lastProgress=-1;
  let readySent=false;
  const report=()=>{
    const bar=document.querySelector("#unity-progress-bar-full");
    const loading=document.querySelector("#unity-loading-bar");
    const progress=Math.max(0,Math.min(1,(parseFloat(bar?.style.width||"0")||0)/100));
    if(progress!==lastProgress){lastProgress=progress;send("unity-progress",{progress,stage:progress>=.9?"preparing":"downloading"});}
    if(!readySent&&loading&&getComputedStyle(loading).display==="none"){
      readySent=true;send("unity-ready");
    }
  };
  const observer=new MutationObserver(report);
  const start=()=>{
    const bar=document.querySelector("#unity-progress-bar-full");
    const loading=document.querySelector("#unity-loading-bar");
    if(bar)observer.observe(bar,{attributes:true,attributeFilter:["style"]});
    if(loading)observer.observe(loading,{attributes:true,attributeFilter:["style","class"]});
    report();
  };
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
  window.addEventListener("error",event=>{if(event.message)send("unity-error",{message:String(event.message).slice(0,300)});});
  window.addEventListener("unhandledrejection",event=>send("unity-error",{message:String(event.reason?.message||event.reason||"Unable to start the Unity runtime.").slice(0,300)}));
})();
</script>`;
  return /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${bridge}</body>`) : `${html}${bridge}`;
}
