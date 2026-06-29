// Hidden easter-egg route — not linked anywhere in nav, kept out of the sitemap.
// 100% client-side: no backend, no network, nothing shared between visitors.
// On touch devices the game goes fullscreen and asks for landscape; on desktop it stays
// framed in a terminal-style card.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GameCanvas } from "@/components/arcade/GameCanvas";
import { getMuted, toggleMute, initAudio } from "@/components/arcade/sfx";

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

function MuteButton({ className = "" }: { className?: string }) {
  const [muted, setMutedState] = useState(getMuted);
  return (
    <button
      type="button"
      onClick={() => {
        initAudio();
        setMutedState(toggleMute());
      }}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      className={`rounded-md border border-accent1/30 bg-[#151821]/80 px-2 py-1 text-sm text-gray-300 hover:text-accent1 transition-colors ${className}`}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

function FullscreenButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Toggle fullscreen"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen?.();
        else void document.documentElement.requestFullscreen?.().catch(() => {});
      }}
      className={`rounded-md border border-accent1/30 bg-[#151821]/80 px-2 py-1 text-sm text-gray-300 hover:text-accent1 transition-colors ${className}`}
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
        <FullscreenButton className="absolute top-3 right-14 z-20" />
        <MuteButton className="absolute top-3 right-3 z-20" />
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
          <MuteButton className="absolute top-2 right-2 z-10" />
        </div>

        {/* controls + back */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>
            <span className="text-gray-400">space / ↑</span> jump&nbsp;&nbsp;
            <span className="text-gray-400">↓</span> duck&nbsp;&nbsp;
            <span className="text-gray-400">esc</span> menu&nbsp;&nbsp;
            <span className="text-gray-600">(mobile: tap = jump · hold ▲ for higher · swipe ↓ to drop)</span>
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
