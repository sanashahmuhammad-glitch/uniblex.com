"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Minimize2, Play, RotateCcw, RotateCw, Smartphone } from "lucide-react";

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
        className="relative mx-auto w-full overflow-hidden rounded-lg border border-uniblex-blue/25 bg-[#05070b] shadow-[0_28px_90px_rgba(0,178,255,.16)]"
      >
        <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-white/10 bg-white/[.035] px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{title}</p>
            <p className="hidden text-xs text-uniblex-gray sm:block">WebGL player</p>
          </div>
          <button className="btn-secondary min-h-0 shrink-0 rounded-md px-3 py-2 text-xs" onClick={toggleFullscreen} type="button">
            {isFullscreen ? <Minimize2 size={15} /> : <Expand size={15} />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
        </div>
        <div className="relative h-[min(58svh,680px)] min-h-[250px] w-full overflow-hidden bg-black sm:h-[min(66vh,720px)] sm:min-h-[420px] lg:min-h-[560px]">
          {!started ? (
            <div className="absolute inset-0 grid place-items-center overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${cover}')` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-uniblex-bg/70 to-black/25" />
              <div className="relative z-10 max-w-2xl p-5 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-uniblex-blue sm:text-sm">Uniblex WebGL Player</p>
                <h2 className="font-heading text-3xl leading-tight md:text-5xl">{title}</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-uniblex-gray md:text-base">
                  WebGL loads only when you click Play for better speed.
                </p>
                <button className="btn-primary mx-auto mt-5 text-base sm:mt-7 sm:text-lg" onClick={startGame} type="button">
                  <Play size={22} fill="currentColor" /> Play Now
                </button>
              </div>
            </div>
          ) : (
            <>
              {!loaded ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-[#05070b]/95 p-6 text-center">
                  <div className="w-full max-w-sm">
                    <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-uniblex-blue/40 bg-uniblex-blue/10">
                      <RotateCcw className="animate-spin text-uniblex-blue" size={28} />
                    </div>
                    <h3 className="font-heading text-2xl sm:text-3xl">Loading Game...</h3>
                    <p className="mt-2 text-sm text-uniblex-gray">Preparing the WebGL canvas. Large builds can take a moment.</p>
                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-uniblex-blue to-uniblex-purple" />
                    </div>
                  </div>
                </div>
              ) : null}
              {isPortrait ? (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-center justify-center gap-2 rounded-md border border-uniblex-blue/30 bg-black/80 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur md:hidden">
                  <RotateCw size={15} className="text-uniblex-blue" /> Rotate for best play
                </div>
              ) : null}
              <iframe
                ref={iframeRef}
                title={title}
                src={iframeUrl}
                className="block h-full w-full border-0 bg-black outline-none"
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

      <div className="grid gap-3 rounded-lg border border-uniblex-border bg-white/[.025] p-4 text-sm text-uniblex-gray md:grid-cols-[1fr_auto] md:items-center">
        <p>
          Click inside the game once if keyboard controls do not respond.
        </p>
        <p className="inline-flex items-center gap-2 font-bold text-white md:hidden">
          <Smartphone size={16} className="text-uniblex-blue" /> Rotate screen and use in-game touch controls.
        </p>
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
