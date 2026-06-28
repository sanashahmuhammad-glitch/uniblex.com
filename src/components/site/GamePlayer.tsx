"use client";

import { useState } from "react";

export function GamePlayer({ title, iframeUrl }: { title: string; iframeUrl?: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!iframeUrl) {
    return (
      <div className="card flex min-h-[420px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="mb-3 font-heading text-2xl">Coming Soon</h2>
          <p className="text-uniblex-gray">Game player will be available after the WebGL build is uploaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {!loaded ? (
        <div className="flex min-h-[420px] items-center justify-center bg-gradient-to-br from-uniblex-blue/10 to-uniblex-purple/10 p-8 text-center">
          <div>
            <h2 className="mb-4 font-heading text-3xl">{title}</h2>
            <p className="mb-6 text-uniblex-gray">WebGL loads only when you click Play for better speed.</p>
            <button onClick={() => setLoaded(true)} className="btn-primary">Play Now</button>
          </div>
        </div>
      ) : (
        <iframe
          title={title}
          src={iframeUrl}
          className="h-[640px] w-full border-0"
          allow="fullscreen; gamepad; autoplay"
          loading="lazy"
        />
      )}
    </div>
  );
}
