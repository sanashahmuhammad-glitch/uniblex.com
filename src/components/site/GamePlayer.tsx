"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Minimize2, Play, RotateCcw, RotateCw, Smartphone } from "lucide-react";

type GamePlayerProps = {
  title: string;
  slug: string;
  cover: string;
  iframeUrl?: string;
  aspectRatio?: string;
  desktopControls?: string[];
  mobileControls?: string[];
};

export function GamePlayer({ title, slug, cover, iframeUrl, aspectRatio = "16/9", desktopControls, mobileControls }: GamePlayerProps) {
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aspectClass = getAspectClass(aspectRatio);
  const desktopControlList = desktopControls?.length ? desktopControls : ["WASD / Arrow Keys = Move", "Space = Brake / Action", "Mouse = Select"];
  const mobileControlList = mobileControls?.length ? mobileControls : ["Rotate screen", "Use in-game touch controls"];
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

  function focusIframe() {
    iframeRef.current?.focus();
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
    <section className="grid gap-3 md:gap-4">
      <div
        ref={containerRef}
        className="group relative mx-auto w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_34px_120px_rgba(0,0,0,.45)] focus-within:border-uniblex-blue/50"
        onClick={focusIframe}
        onPointerDown={focusIframe}
        tabIndex={-1}
      >
        <div className="relative overflow-hidden bg-black">
          <div className="absolute right-2 top-2 z-40 flex items-center gap-2 sm:right-3 sm:top-3">
            <div className="hidden rounded-md bg-black/70 px-3 py-2 text-xs font-bold text-white/80 backdrop-blur md:block">
              Click game to focus controls
            </div>
            <button className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-xs font-black text-white backdrop-blur transition hover:border-uniblex-blue/50 hover:bg-uniblex-blue/20" onClick={toggleFullscreen} type="button">
              {isFullscreen ? <Minimize2 size={15} /> : <Expand size={15} />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>
          </div>
          <div className={isFullscreen ? "relative h-screen w-screen overflow-hidden bg-black" : `relative ${aspectClass} w-full overflow-hidden bg-black`}>
            {!started ? (
              <div className="absolute inset-0 grid place-items-center overflow-hidden">
                <div className="absolute inset-0 scale-105 bg-cover bg-center blur-[1px]" style={{ backgroundImage: `url('${cover}')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/68 to-black/25" />
                <div className="relative z-10 max-w-2xl p-5 text-center">
                  <p className="mb-2 text-xs font-black uppercase tracking-[.24em] text-uniblex-blue sm:text-sm">Ready To Play</p>
                  <h2 className="font-heading text-3xl leading-tight md:text-5xl">{title}</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-uniblex-gray md:text-base">
                    Click play to load the WebGL build inside the Uniblex game frame.
                  </p>
                  <button className="btn-primary mx-auto mt-5 text-base sm:mt-7 sm:text-lg" onClick={startGame} type="button">
                    <Play size={22} fill="currentColor" /> Play Now
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!loaded ? (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-[#05070b]/95 p-5 text-center">
                    <div className="w-full max-w-sm">
                      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-uniblex-blue/40 bg-uniblex-blue/10">
                        <RotateCcw className="animate-spin text-uniblex-blue" size={25} />
                      </div>
                      <h3 className="font-heading text-2xl sm:text-3xl">Loading Game...</h3>
                      <p className="mt-2 text-sm text-uniblex-gray">Preparing the WebGL canvas.</p>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
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
                  onClick={focusIframe}
                  onPointerDown={focusIframe}
                  onLoad={() => {
                    setLoaded(true);
                    window.setTimeout(focusIframe, 100);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm text-uniblex-gray md:grid-cols-[1fr_auto] md:items-center md:p-4">
        <p>
          Click inside the game once if keyboard controls do not respond.
        </p>
        <p className="inline-flex items-center gap-2 font-bold text-white md:hidden">
          <Smartphone size={16} className="text-uniblex-blue" /> {mobileControlList.join(" / ")}
        </p>
      </div>

      <div className="hidden grid-cols-3 gap-3 md:grid">
        {desktopControlList.map((control) => (
          <div key={control} className="rounded-lg border border-uniblex-border bg-white/[.025] px-4 py-3 text-center text-sm font-bold text-uniblex-gray">
            {control}
          </div>
        ))}
      </div>
    </section>
  );
}

function getAspectClass(aspectRatio: string) {
  switch (aspectRatio) {
    case "16/10":
      return "aspect-[16/10]";
    case "4/3":
      return "aspect-[4/3]";
    case "9/16":
      return "aspect-[9/16] max-h-[80vh] mx-auto";
    case "1/1":
      return "aspect-square max-h-[80vh] mx-auto";
    default:
      return "aspect-video";
  }
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
