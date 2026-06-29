// Clawd Runner — wires the pure engine to a <canvas>, input, sound, and the render loop.
// Everything is client-side and self-contained; no network, no shared state.
// Controls are jump/duck only (Clawd is pinned to the left): keyboard on desktop, vertical
// swipes on touch (swipe up = jump, swipe down = duck, quick tap = jump).
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import * as C from "./constants";
import {
  createGameState,
  step,
  onJumpDown,
  onJumpUp,
  togglePause,
  startGame,
  type GameState,
} from "./engine";
import { render, renderText } from "./render";
import { useGameLoop } from "./useGameLoop";
import { playSfx } from "./sfx";
import { initAudio, isMusicOn, toggleSfx } from "./audio";
import { startMusic, stopMusic, toggleMusicAndSchedule, setMusicSpeed } from "./music";

const STEP = 1 / 120; // fixed physics timestep
const SWIPE = 22; // px of vertical travel before a drag counts as a swipe

export function GameCanvas({ touch = false }: { touch?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const offCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const accRef = useRef(0);
  const pressed = useRef<Set<string>>(new Set());

  // one-time setup: state + offscreen virtual canvas
  if (!stateRef.current) stateRef.current = createGameState();
  if (typeof document !== "undefined" && !offRef.current) {
    const off = document.createElement("canvas");
    off.width = C.VIRTUAL_W;
    off.height = C.VIRTUAL_H;
    offRef.current = off;
    const octx = off.getContext("2d");
    if (octx) octx.imageSmoothingEnabled = false;
    offCtxRef.current = octx;
  }

  // bring audio up on the first user gesture; only run the music scheduler if music is on
  const wakeAudio = () => {
    initAudio();
    if (isMusicOn()) startMusic();
  };

  // music scheduler lifecycle: pause when the tab is hidden, stop on unmount
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopMusic();
      } else if (isMusicOn()) {
        initAudio(); // browsers auto-suspend on hide — resume before scheduling
        startMusic();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopMusic();
    };
  }, []);

  // --- keyboard input (jump / duck / pause / restart / audio toggles) ---
  useEffect(() => {
    const s = () => stateRef.current!;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      switch (code) {
        case "Space":
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          wakeAudio();
          if (!pressed.current.has(code)) onJumpDown(s());
          break;
        case "ArrowDown":
          e.preventDefault();
          wakeAudio();
          s().input.duck = true;
          break;
        case "Escape":
          togglePause(s());
          break;
        case "KeyR":
          if (s().phase === "dead") startGame(s());
          break;
        case "KeyM": // toggle music
          if (!pressed.current.has(code)) {
            toggleMusicAndSchedule();
          }
          break;
        case "KeyS": // toggle sound effects
          if (!pressed.current.has(code)) {
            wakeAudio();
            toggleSfx();
          }
          break;
        default:
          return;
      }
      pressed.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      pressed.current.delete(code);
      switch (code) {
        case "Space":
        case "ArrowUp":
        case "KeyW":
          onJumpUp(s());
          break;
        case "ArrowDown":
          s().input.duck = false;
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // --- fullscreen (mobile only) ---
  const goFullscreen = () => {
    if (!touch || typeof document === "undefined") return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {
        /* iOS Safari blocks element fullscreen — the fixed-inset layout still fills */
      });
    }
  };

  // --- touch / pointer on the canvas: tap = jump, swipe down (+hold) = duck / fast-fall ---
  const swipe = useRef<{ y: number; ducking: boolean; wasPlaying: boolean } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported — fine */
    }
    wakeAudio();
    const s = stateRef.current!;
    const wasPlaying = s.phase === "playing";
    swipe.current = { y: e.clientY, ducking: false, wasPlaying };
    if (!wasPlaying) {
      onJumpDown(s); // tap to start / resume / restart
      goFullscreen();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    const s = stateRef.current!;
    if (!sw || s.phase !== "playing") return;
    const dy = e.clientY - sw.y;
    if (dy > SWIPE && !sw.ducking) {
      s.input.duck = true; // swipe down = duck on the ground / slam down in the air
      sw.ducking = true;
    } else if (dy < SWIPE * 0.4 && sw.ducking) {
      s.input.duck = false; // swiped back up = stop ducking
      sw.ducking = false;
    }
  };

  const endPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    const s = stateRef.current!;
    if (sw) {
      const moved = Math.abs(e.clientY - sw.y);
      // a clean tap (no downward drag) on an in-progress run = jump
      if (sw.wasPlaying && s.phase === "playing" && !sw.ducking && moved < SWIPE) {
        onJumpDown(s);
      }
      if (sw.ducking) s.input.duck = false;
    }
    swipe.current = null;
  };

  // --- dedicated JUMP button (touch): press to jump, hold for a higher jump ---
  const onJumpBtnDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // capture the pointer so a long hold can't be hijacked by the OS (Android
    // long-press, scroll-intent, etc.) and fire a spurious cancel mid-jump
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported — fine */
    }
    wakeAudio();
    const s = stateRef.current!;
    const wasPlaying = s.phase === "playing";
    onJumpDown(s);
    if (!wasPlaying) goFullscreen();
  };
  const onJumpBtnUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onJumpUp(stateRef.current!); // a genuine release cuts the jump → variable height
  };
  const onJumpBtnCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Android may fire pointercancel during a long hold. Do NOT cut the jump here
    // (that's what was shortening it) — leaving the jump "held" = full height.
  };

  // --- main loop ---
  useGameLoop((dt) => {
    const s = stateRef.current!;
    accRef.current += dt;
    let steps = 0;
    while (accRef.current >= STEP && steps < 8) {
      step(s, STEP);
      accRef.current -= STEP;
      steps++;
    }
    // drain queued one-shot events into sound effects
    if (s.events.length) {
      for (const ev of s.events) playSfx(ev);
      s.events.length = 0;
    }
    // music tempo rises with game speed (pitch unchanged)
    setMusicSpeed((s.speed - C.BASE_SPEED) / (C.MAX_SPEED - C.BASE_SPEED));
    blit();
  }, () => {
    // auto-pause when tab hidden
    const s = stateRef.current!;
    if (s.phase === "playing") s.phase = "paused";
  });

  function blit() {
    const main = canvasRef.current;
    const off = offRef.current;
    const octx = offCtxRef.current;
    if (!main || !off || !octx) return;

    render(octx, stateRef.current!);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = main.clientWidth || C.VIRTUAL_W;
    const ch = main.clientHeight || C.VIRTUAL_H;
    if (main.width !== Math.floor(cw * dpr) || main.height !== Math.floor(ch * dpr)) {
      main.width = Math.floor(cw * dpr);
      main.height = Math.floor(ch * dpr);
    }
    const mctx = main.getContext("2d");
    if (!mctx) return;
    mctx.imageSmoothingEnabled = false;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = C.COLORS.bg;
    mctx.fillRect(0, 0, cw, ch);

    let scale = Math.min(cw / C.VIRTUAL_W, ch / C.VIRTUAL_H);
    if (scale > 1) scale = Math.floor(scale); // crisp integer scale on big screens
    const dw = C.VIRTUAL_W * scale;
    const dh = C.VIRTUAL_H * scale;
    const ox = Math.floor((cw - dw) / 2);
    const oy = Math.floor((ch - dh) / 2);
    mctx.drawImage(off, ox, oy, dw, dh);

    // text drawn here, at native display resolution, so it stays crisp (not magnified)
    renderText(mctx, stateRef.current!, scale, ox, oy);
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-pointer"
        style={{ imageRendering: "pixelated" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Clawd Runner game canvas"
      />
      {touch && (
        <button
          type="button"
          aria-label="Jump (hold for a higher jump)"
          onPointerDown={onJumpBtnDown}
          onPointerUp={onJumpBtnUp}
          onPointerCancel={onJumpBtnCancel}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute bottom-6 right-6 z-20 h-20 w-20 select-none touch-none rounded-full border-2 border-accent1/60 bg-accent1/15 text-accent1 font-mono text-[10px] leading-tight active:bg-accent1/35"
        >
          ▲<br />JUMP
        </button>
      )}
    </div>
  );
}
