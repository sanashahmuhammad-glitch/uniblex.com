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

    // R2 stores Unity assets already compressed. Without manual encoding,
    // Cloudflare may add a second content-coding layer to the response.
    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers,
      encodeBody: "manual"
    });
  }
};
