"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Expand, Maximize2, Minimize2, Play, RotateCw, Smartphone } from "lucide-react";

type GamePlayerProps = {
  title: string;
  slug: string;
  cover: string;
  thumbnail?: string;
  iframeUrl?: string;
  aspectRatio?: string;
  desktopControls?: string[];
  mobileControls?: string[];
};

export function GamePlayer({ title, slug, cover, thumbnail, iframeUrl, aspectRatio = "16/9", desktopControls, mobileControls }: GamePlayerProps) {
  const [started, setStarted] = useState(false);
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
              <GamePoster title={title} cover={cover} thumbnail={thumbnail || cover} portrait={isPortrait} onPlay={startGame} onFullscreen={() => { startGame(); void toggleFullscreen(); }} />
            ) : (
              <>
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

function GamePoster({ title, cover, thumbnail, portrait, onPlay, onFullscreen }: { title: string; cover: string; thumbnail: string; portrait: boolean; onPlay: () => void; onFullscreen: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-md" style={{ backgroundImage: `url('${cover}')` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,178,255,.2),transparent_38%),linear-gradient(to_top,rgba(3,5,12,.98),rgba(5,8,18,.56))]" />
      <div className="relative z-10 flex max-w-xl flex-col items-center px-5 text-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-uniblex-blue/45 to-uniblex-purple/45 blur-xl" />
          <Image src={thumbnail} alt={`${title} thumbnail`} width={352} height={198} unoptimized className="relative aspect-video w-36 rounded-2xl border border-white/20 object-cover shadow-2xl sm:w-44" />
        </div>
        {portrait ? <RotateCw className="mt-4 text-uniblex-blue" size={28} /> : null}
        <p className="mt-4 text-xs font-black uppercase tracking-[.24em] text-cyan-300">{portrait ? "Rotate to landscape" : "Uniblex WebGL"}</p>
        <h2 className="mt-2 font-heading text-2xl leading-tight sm:text-4xl">{title}</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-uniblex-gray sm:text-sm">{portrait ? "For the best controls and a full 16:9 view, rotate your phone before starting." : "Ready when you are. The game downloads only after you press play."}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6">
          <button type="button" onClick={onPlay} className="btn-primary min-h-0 px-5 py-3 text-sm sm:text-base"><Play size={19} fill="currentColor" /> Play Game</button>
          <button type="button" onClick={onFullscreen} className="btn-secondary min-h-0 px-4 py-3 text-sm" aria-label="Enter Fullscreen" title="Enter Fullscreen"><Maximize2 size={18} /> Enter Fullscreen</button>
        </div>
      </div>
    </div>
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
