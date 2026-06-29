// Hidden easter-egg route — not linked anywhere in nav, kept out of the sitemap.
// 100% client-side: no backend, no network, nothing shared between visitors.
// On touch devices the game goes fullscreen and asks for landscape; on desktop it stays
// framed in a terminal-style card.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GameCanvas } from "@/components/arcade/GameCanvas";
import { initAudio, isSfxMuted, toggleSfx, isMusicOn, subscribeAudio } from "@/components/arcade/audio";
import { toggleMusicAndSchedule } from "@/components/arcade/music";

/** Tracks whether we're on a touch device and which way it's held. */
function useViewport() {
  const [v, setV] = useState({ touch: false, portrait: false });
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const small = window.matchMedia("(max-width: 920px)");
    const portrait = window.matchMedia("(orientation: portrait)");
    const update = () =>
      setV({ touch: coarse.matches && small.matches, portrait: portrait.matches });
    update();
    for (const mq of [coarse, small, portrait]) mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      for (const mq of [coarse, small, portrait]) mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return v;
}

const btnCls =
  "rounded-md border border-accent1/30 bg-[#151821]/80 px-2 py-1 text-sm transition-colors";

function SfxButton() {
  const [muted, setMuted] = useState(isSfxMuted);
  useEffect(() => subscribeAudio(() => setMuted(isSfxMuted())), []);
  return (
    <button
      type="button"
      onClick={() => {
        initAudio();
        toggleSfx();
      }}
      aria-label={muted ? "Unmute sound effects (s)" : "Mute sound effects (s)"}
      title="sound effects (s)"
      className={`${btnCls} ${muted ? "text-gray-500" : "text-gray-300 hover:text-accent1"}`}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

function MusicButton() {
  const [on, setOn] = useState(isMusicOn);
  useEffect(() => subscribeAudio(() => setOn(isMusicOn())), []);
  return (
    <button
      type="button"
      onClick={() => toggleMusicAndSchedule()}
      aria-label={on ? "Turn music off (m)" : "Turn music on (m)"}
      title="music (m)"
      className={`${btnCls} ${on ? "text-accent2" : "text-gray-500 hover:text-accent1"}`}
    >
      ♪
    </button>
  );
}

function FullscreenButton() {
  return (
    <button
      type="button"
      aria-label="Toggle fullscreen"
      title="fullscreen"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen?.();
        else void document.documentElement.requestFullscreen?.().catch(() => {});
      }}
      className={`${btnCls} text-gray-300 hover:text-accent1`}
    >
      ⛶
    </button>
  );
}

function RotateOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#151821] text-center px-6">
      <div className="text-5xl animate-pulse" aria-hidden>↻📱</div>
      <p className="text-accent1 font-mono text-sm">rotate your device</p>
      <p className="text-gray-500 font-mono text-xs">clawd runs best in landscape</p>
    </div>
  );
}

const Arcade = () => {
  const { touch, portrait } = useViewport();

  useEffect(() => {
    const prev = document.title;
    document.title = "clawd runner — vlads.blog";
    return () => {
      document.title = prev;
    };
  }, []);

  // --- mobile: immersive fullscreen, landscape-first ---
  if (touch) {
    return (
      <div className="fixed inset-0 z-50 bg-[#151821]" style={{ height: "100dvh" }}>
        <GameCanvas touch />
        {portrait && <RotateOverlay />}
        {/* floating controls */}
        <Link
          to="/"
          aria-label="Back to posts"
          className="absolute top-3 left-3 z-20 rounded-md border border-accent1/30 bg-[#151821]/80 px-2 py-1 text-sm text-accent1"
        >
          ←
        </Link>
        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <FullscreenButton />
          <MusicButton />
          <SfxButton />
        </div>
      </div>
    );
  }

  // --- desktop: framed terminal card ---
  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* terminal-style prompt header */}
        <p className="text-sm text-gray-400 mb-3">
          <span className="text-accent1">clawd@vlads</span>
          <span className="text-gray-500">:</span>
          <span className="text-accent2">~</span>
          <span className="text-gray-500">$</span> ./clawd_runner
          <span className="blink-cursor">_</span>
        </p>

        {/* game viewport */}
        <div className="relative w-full aspect-video rounded-md overflow-hidden border border-accent1/30 shadow-[0_0_40px_-12px_rgba(155,135,245,0.5)] bg-[#151821]">
          <GameCanvas />
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <MusicButton />
            <SfxButton />
          </div>
        </div>

        {/* controls + back */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>
            <span className="text-gray-400">space / ↑</span> jump (×2 mid-air)&nbsp;&nbsp;
            <span className="text-gray-400">↓</span> duck&nbsp;&nbsp;
            <span className="text-gray-400">esc</span> menu&nbsp;&nbsp;
            <span className="text-gray-400">m</span> music&nbsp;&nbsp;
            <span className="text-gray-400">s</span> sound&nbsp;&nbsp;
            <span className="text-gray-600">(mobile: tap = jump · hold ▲ higher · swipe ↓ drop · double-jump for the high-lane power-ups)</span>
          </p>
          <Link
            to="/"
            className="text-accent1 hover:text-accent2 transition-colors underline underline-offset-4 shrink-0"
          >
            ← back to posts
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-600">
          you found the secret. help clawd survive the codebase.
        </p>
      </div>
    </div>
  );
};

export default Arcade;
