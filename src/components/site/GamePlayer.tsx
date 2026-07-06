"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Minimize2, Play, RotateCcw } from "lucide-react";

type GamePlayerProps = {
  title: string;
  slug: string;
  cover: string;
  iframeUrl?: string;
};

export function GamePlayer({ title, slug, cover, iframeUrl }: GamePlayerProps) {
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const updateOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => iframeRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [started]);

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

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await container.requestFullscreen?.().catch(() => undefined);
  }

  function startGame() {
    setStarted(true);
    setLoaded(false);
    rememberRecentGame(slug);
    void incrementCounter(slug, "play");
  }

  return (
    <section className="grid gap-4">
      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-lg border border-uniblex-border/80 bg-black shadow-[0_28px_90px_rgba(0,178,255,.14)]"
      >
        <div className="relative aspect-video min-h-[360px] w-full overflow-hidden bg-black md:min-h-[560px]">
          {!started ? (
            <div className="absolute inset-0 grid place-items-center overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${cover}')` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-uniblex-bg/70 to-black/25" />
              <div className="relative z-10 max-w-2xl p-6 text-center">
                <p className="mb-3 text-sm font-bold uppercase tracking-[.24em] text-uniblex-blue">Uniblex WebGL Player</p>
                <h2 className="font-heading text-3xl leading-tight md:text-5xl">{title}</h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-uniblex-gray md:text-base">
                  WebGL loads only when you click Play for better speed.
                </p>
                <button className="btn-primary mx-auto mt-7 text-lg" onClick={startGame} type="button">
                  <Play size={22} fill="currentColor" /> Play Now
                </button>
              </div>
            </div>
          ) : (
            <>
              {!loaded ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-uniblex-bg/95 p-6 text-center">
                  <div className="w-full max-w-sm">
                    <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-uniblex-blue/40 bg-uniblex-blue/10">
                      <RotateCcw className="animate-spin text-uniblex-blue" size={28} />
                    </div>
                    <h3 className="font-heading text-3xl">Loading Game...</h3>
                    <p className="mt-2 text-uniblex-gray">Preparing WebGL...</p>
                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-uniblex-blue to-uniblex-purple" />
                    </div>
                  </div>
                </div>
              ) : null}
              {isPortrait ? (
                <div className="pointer-events-none absolute inset-x-4 top-4 z-30 rounded-lg border border-uniblex-blue/30 bg-black/75 p-3 text-center text-sm text-white backdrop-blur md:hidden">
                  Rotate your device for the best experience.
                </div>
              ) : null}
              <iframe
                ref={iframeRef}
                title={title}
                src={iframeUrl}
                className="block h-full min-h-[360px] w-full border-0 bg-black outline-none md:min-h-[560px]"
                allow="fullscreen; gamepad; autoplay; xr-spatial-tracking"
                loading="eager"
                scrolling="no"
                tabIndex={0}
                onClick={() => iframeRef.current?.focus()}
                onLoad={() => {
                  setLoaded(true);
                  window.setTimeout(() => iframeRef.current?.focus(), 100);
                }}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-uniblex-border bg-white/[.025] p-4">
        <p className="text-sm text-uniblex-gray">
          Click inside the game once if keyboard controls do not respond. <span className="md:hidden">Use on-screen controls if available.</span>
        </p>
        <button className="btn-secondary min-h-0 px-4 py-2 text-sm" onClick={toggleFullscreen} type="button">
          {isFullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      <div className="hidden grid-cols-3 gap-3 md:grid">
        {["WASD / Arrow Keys = Move", "Space = Brake / Action", "Mouse = Select"].map((control) => (
          <div key={control} className="rounded-lg border border-uniblex-border bg-white/[.025] px-4 py-3 text-center text-sm font-bold text-uniblex-gray">
            {control}
          </div>
        ))}
      </div>
    </section>
  );
}

function rememberRecentGame(slug: string) {
  try {
    const key = "uniblex_recent_games";
    const current = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify([slug, ...current.filter((item) => item !== slug)].slice(0, 10)));
  } catch {
    // Local storage is optional for private browsing and embedded contexts.
  }
}

async function incrementCounter(slug: string, type: "view" | "play") {
  try {
    const key = `uniblex_${type}_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    await fetch(`/api/games/${slug}/counters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch {
    // Analytics counters must never block gameplay.
  }
}
