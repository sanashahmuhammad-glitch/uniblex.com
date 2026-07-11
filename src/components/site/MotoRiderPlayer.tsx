"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Expand, Gamepad2, Heart, Maximize2, Minimize2, Play, RotateCw,
  Share2, ThumbsDown, ThumbsUp, Volume2, VolumeX
} from "lucide-react";
import { MOTO_RIDER_COVER_URL, MOTO_RIDER_THUMBNAIL_URL } from "@/lib/gameIframeUrls";

type Props = {
  title: string;
  slug: string;
  iframeUrl: string;
  desktopControls?: string[];
  mobileControls?: string[];
};

export function MotoRiderPlayer({ title, slug, iframeUrl, desktopControls, mobileControls }: Props) {
  const poster = MOTO_RIDER_COVER_URL;
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [favorite, setFavorite] = useStoredFlag(`uniblex_favorite_${slug}`);
  const [liked, setLiked] = useStoredFlag(`uniblex_like_${slug}`);
  const [disliked, setDisliked] = useStoredFlag(`uniblex_dislike_${slug}`);
  const [muted, setMuted] = useStoredFlag(`uniblex_muted_${slug}`);
  const [showControls, setShowControls] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
      setIsMobile(mobile);
      setIsPortrait(mobile && window.innerHeight > window.innerWidth);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => iframeRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [started]);

  async function toggleFullscreen(startAfter = false) {
    if (startAfter) startGame();
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else await container.requestFullscreen?.().catch(() => undefined);
  }

  function startGame() {
    setStarted(true);
    rememberRecentGame(slug);
    void incrementCounter(slug);
  }

  function react(kind: "like" | "dislike") {
    if (kind === "like") {
      setLiked(!liked);
      if (!liked) setDisliked(false);
    } else {
      setDisliked(!disliked);
      if (!disliked) setLiked(false);
    }
  }

  async function share() {
    const data = { title, text: `Play ${title} on Uniblex`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => undefined);
    else {
      await navigator.clipboard?.writeText(data.url).catch(() => undefined);
      showMessage("Link copied");
    }
  }

  function showMessage(value: string) {
    setMessage(value);
    window.setTimeout(() => setMessage(""), 1800);
  }

  const controls = isMobile
    ? mobileControls?.length ? mobileControls : ["Rotate to landscape", "Use the on-screen touch controls"]
    : desktopControls?.length ? desktopControls : ["WASD / Arrow Keys = Move", "Space = Brake / Action", "Mouse = Select"];

  return (
    <section className="grid min-w-0 self-start gap-3">
      <div ref={containerRef} className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_30px_100px_rgba(0,0,0,.5)] focus-within:border-uniblex-blue/60 ${isFullscreen ? "h-screen w-screen" : "aspect-video"}`}>
        <div className="absolute inset-0 h-full w-full bg-black">
          {!started ? (
            <Poster title={title} poster={poster} thumbnail={MOTO_RIDER_THUMBNAIL_URL} portrait={isPortrait} onPlay={startGame} onFullscreen={() => void toggleFullscreen(true)} />
          ) : (
            <iframe
                ref={iframeRef}
                title={title}
                src={iframeUrl}
                className="absolute inset-0 block h-full w-full border-0 bg-black outline-none"
                allow="fullscreen; gamepad; autoplay; xr-spatial-tracking"
                loading="eager"
                scrolling="no"
                tabIndex={0}
                onPointerDown={() => iframeRef.current?.focus()}
                onLoad={() => window.setTimeout(() => iframeRef.current?.focus(), 100)}
              />
          )}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-gradient-to-r from-[#0b1220] via-[#101528] to-[#120d24] p-2 shadow-[0_14px_50px_rgba(0,0,0,.28)] sm:gap-2 sm:p-2.5">
        <Action label={liked ? "Unlike" : "Like"} active={liked} onClick={() => react("like")} icon={<ThumbsUp size={17} />} />
        <Action label={disliked ? "Remove dislike" : "Dislike"} active={disliked} onClick={() => react("dislike")} icon={<ThumbsDown size={17} />} />
        <Action label={favorite ? "Remove favorite" : "Favorite"} active={favorite} onClick={() => setFavorite(!favorite)} icon={<Heart size={17} fill={favorite ? "currentColor" : "none"} />} />
        <Action label="Share" onClick={() => void share()} icon={<Share2 size={17} />} />
        <Action label="Report" href={`mailto:support@uniblex.com?subject=${encodeURIComponent(`Report: ${title}`)}`} icon={<AlertTriangle size={17} />} />
        <span className="mx-1 hidden h-7 w-px bg-white/10 sm:block" />
        <Action label={muted ? "Sound preference off" : "Sound preference on"} active={!muted} onClick={() => { setMuted(!muted); showMessage("Sound preference saved"); }} icon={muted ? <VolumeX size={17} /> : <Volume2 size={17} />} />
        <Action label="Controls and help" active={showControls} onClick={() => setShowControls(!showControls)} icon={<Gamepad2 size={17} />} />
        <Action label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()} icon={isFullscreen ? <Minimize2 size={17} /> : <Expand size={17} />} />
        {message && <span className="ml-auto px-2 text-xs font-bold text-cyan-200" role="status">{message}</span>}
      </div>

      {showControls && (
        <div className="grid gap-2 rounded-xl border border-uniblex-blue/20 bg-uniblex-blue/[.06] p-4 text-sm text-uniblex-gray sm:grid-cols-3">
          {controls.map((control) => <div key={control} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center">{control}</div>)}
        </div>
      )}
    </section>
  );
}

function Poster({ title, poster, thumbnail, portrait, onPlay, onFullscreen }: { title: string; poster: string; thumbnail: string; portrait: boolean; onPlay: () => void; onFullscreen: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-55 blur-md" style={{ backgroundImage: `url('${poster}')` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,178,255,.2),transparent_38%),linear-gradient(to_top,rgba(3,5,12,.98),rgba(5,8,18,.56))]" />
      <div className="relative z-10 flex max-w-xl flex-col items-center px-5 text-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-uniblex-blue/45 to-uniblex-purple/45 blur-xl" />
          <img src={thumbnail} alt={`${title} thumbnail`} className="relative aspect-video w-36 rounded-2xl border border-white/20 object-cover shadow-2xl sm:w-44" />
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

function Action({ label, icon, onClick, active = false, href }: { label: string; icon: React.ReactNode; onClick?: () => void; active?: boolean; href?: string }) {
  const classes = `group relative inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${active ? "border-uniblex-blue/55 bg-uniblex-blue/20 text-cyan-100" : "border-white/10 bg-white/[.045] text-uniblex-gray hover:border-uniblex-purple/55 hover:bg-uniblex-purple/15 hover:text-white"}`;
  const content = <>{icon}<span className="hidden 2xl:inline">{label}</span><span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/95 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span></>;
  return href ? <a className={classes} href={href} aria-label={label} title={label}>{content}</a> : <button className={classes} type="button" onClick={onClick} aria-label={label} aria-pressed={active} title={label}>{content}</button>;
}

function useStoredFlag(key: string) {
  const [value, setValue] = useState(false);
  useEffect(() => { try { setValue(localStorage.getItem(key) === "1"); } catch {} }, [key]);
  function update(next: boolean) { setValue(next); try { localStorage.setItem(key, next ? "1" : "0"); } catch {} }
  return [value, update] as const;
}

function windowSafeUrl() { return typeof window === "undefined" ? "" : window.location.href; }
function rememberRecentGame(slug: string) { try { const key = "uniblex_recent_games"; const current = JSON.parse(localStorage.getItem(key) || "[]") as string[]; localStorage.setItem(key, JSON.stringify([slug, ...current.filter((item) => item !== slug)].slice(0, 10))); } catch {} }
async function incrementCounter(slug: string) { try { const key = `uniblex_play_${slug}`; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); await fetch(`/api/games/${slug}/counters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "play" }) }); } catch {} }
