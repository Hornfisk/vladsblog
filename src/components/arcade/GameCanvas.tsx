// Clawd Runner — wires the pure engine to a <canvas>, input, sound, and the render loop.
// Everything is client-side and self-contained; no network, no shared state.
// Controls are jump/duck only (Clawd is pinned to the left): keyboard on desktop, vertical
// swipes on touch (swipe up = jump, swipe down = duck, quick tap = jump).
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as C from "./constants";
import {
  createGameState,
  step,
  onJumpDown,
  onJumpUp,
  togglePause,
  startGame,
  type GameState,
  type Phase,
} from "./engine";
import { render, renderText } from "./render";
import { useGameLoop } from "./useGameLoop";
import { playSfx } from "./sfx";
import { initAudio, isMusicOn, toggleSfx } from "./audio";
import { startMusic, stopMusic, toggleMusicAndSchedule, setMusicSpeed } from "./music";

const STEP = 1 / 120; // fixed physics timestep
const SWIPE = 22; // px of vertical travel before a drag counts as a swipe
const HINT_KEY = "clawd:jumpHintSeen"; // localStorage flag — skip the side-tap hint for repeat visitors
const GAME_ASPECT = C.VIRTUAL_W / C.VIRTUAL_H; // 16:9 — drives the pillar-margin tap zones
const MIN_ZONE = 56; // px floor on side tap-zone width (usable target even on near-16:9 phones)
const HINT_MS = 2600; // how long the side boxes stay visible before fading on first visit
const DUCK_BAND = 0.62; // press below this fraction of the canvas height = hold-to-duck (else jump)

export function GameCanvas({
  touch = false,
  onPhaseChange,
}: {
  touch?: boolean;
  onPhaseChange?: (phase: Phase) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const offCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const mctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const showFpsRef = useRef(false);
  const fpsRef = useRef(0);
  const accRef = useRef(0);
  const pressed = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPhaseRef = useRef<Phase>("ready");
  // side jump zones (touch): width tracks the pillar margin; hint outline fades after first sight
  const [zoneW, setZoneW] = useState(MIN_ZONE);
  const [hintOn, setHintOn] = useState(false);

  const dismissHint = () => {
    setHintOn(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* private mode / blocked storage — fine, hint just shows again next time */
    }
  };

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
        case "KeyF": // toggle the debug FPS readout
          if (!pressed.current.has(code)) showFpsRef.current = !showFpsRef.current;
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

  // --- side jump zones: size to the empty pillar margins beside the 16:9 play area ---
  useLayoutEffect(() => {
    if (!touch) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const gameW = Math.min(w, h * GAME_ASPECT);
      const margin = Math.max(0, (w - gameW) / 2);
      setZoneW(Math.max(MIN_ZONE, Math.floor(margin)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [touch]);

  // --- one-time "tap here" hint: show the side boxes, then fade after a beat ---
  useEffect(() => {
    if (!touch || typeof window === "undefined") return;
    let seen = false;
    try {
      seen = localStorage.getItem(HINT_KEY) === "1";
    } catch {
      /* storage blocked — treat as unseen */
    }
    if (seen) return;
    setHintOn(true);
    const t = window.setTimeout(() => dismissHint(), HINT_MS);
    return () => window.clearTimeout(t);
  }, [touch]);

  // report the initial phase once mounted, so the page starts in the right state
  useEffect(() => {
    onPhaseChange?.(stateRef.current!.phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // --- touch / pointer on the canvas ---
  // Press in the upper area = jump NOW (snappy; hold for higher, release cuts). Press-and-hold
  // the bottom band = duck. A downward drag still slams in the air / ducks on the ground.
  const swipe = useRef<{
    y: number;
    ducking: boolean;
    wasPlaying: boolean;
    bandDuck: boolean;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported — fine */
    }
    wakeAudio();
    if (hintOn) dismissHint();
    const s = stateRef.current!;
    const wasPlaying = s.phase === "playing";
    if (!wasPlaying) {
      swipe.current = { y: e.clientY, ducking: false, wasPlaying, bandDuck: false };
      onJumpDown(s); // tap to start / resume / restart
      goFullscreen();
      return;
    }
    // bottom band = hold-to-duck; everywhere else = jump immediately
    const rect = e.currentTarget.getBoundingClientRect();
    const inDuckBand = e.clientY - rect.top > rect.height * DUCK_BAND;
    if (inDuckBand) {
      s.input.duck = true;
      swipe.current = { y: e.clientY, ducking: true, wasPlaying, bandDuck: true };
    } else {
      onJumpDown(s); // press = jump now
      swipe.current = { y: e.clientY, ducking: false, wasPlaying, bandDuck: false };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    const s = stateRef.current!;
    if (!sw || s.phase !== "playing") return;
    if (sw.bandDuck) return; // holding the duck zone — release ends it; ignore drags
    const dy = e.clientY - sw.y;
    if (dy > SWIPE && !sw.ducking) {
      s.input.duck = true; // drag down = slam in the air / duck on the ground
      sw.ducking = true;
    } else if (dy < SWIPE * 0.4 && sw.ducking) {
      s.input.duck = false; // dragged back up = stop ducking
      sw.ducking = false;
    }
  };

  const endPointer = () => {
    const sw = swipe.current;
    const s = stateRef.current!;
    if (sw) {
      if (sw.ducking) {
        s.input.duck = false; // release ends the duck / slam
      } else if (sw.wasPlaying) {
        onJumpUp(s); // release cuts the jump → variable height
      }
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
    if (hintOn) dismissHint(); // first interaction with a zone retires the hint
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
    if (dt > 0) fpsRef.current = fpsRef.current ? fpsRef.current * 0.9 + (1 / dt) * 0.1 : 1 / dt;
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
    // surface phase transitions (ready/playing/paused/dead) to the page
    if (s.phase !== lastPhaseRef.current) {
      lastPhaseRef.current = s.phase;
      onPhaseChange?.(s.phase);
    }
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
    let mctx = mctxRef.current;
    if (!mctx) {
      mctx = main.getContext("2d");
      mctxRef.current = mctx;
    }
    if (!mctx) return;
    mctx.imageSmoothingEnabled = false;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // pillarbox margins match the current act's background so it reads as one world
    mctx.fillStyle = (C.THEMES[stateRef.current!.act] ?? C.THEMES[0]).bg;
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

    // debug-only FPS readout (toggle with F); drawn in the same dpr-transformed CSS-px space
    if (showFpsRef.current) {
      mctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      mctx.textAlign = "left";
      mctx.textBaseline = "bottom";
      mctx.fillStyle = "rgba(155,135,245,0.9)";
      mctx.fillText(`${Math.round(fpsRef.current)} fps`, 4, ch - 4);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
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
      {/* Side jump zones: the empty pillar space beside the game is the tap target
          (press = jump, hold = higher). The rounded outline is just a first-visit hint
          that fades out; the zones stay tappable after it's gone. */}
      {touch &&
        (["left", "right"] as const).map((side) => (
          <button
            key={side}
            type="button"
            aria-label="Jump (hold for a higher jump)"
            onPointerDown={onJumpBtnDown}
            onPointerUp={onJumpBtnUp}
            onPointerCancel={onJumpBtnCancel}
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: zoneW }}
            className={`absolute top-16 bottom-0 z-20 flex select-none touch-none items-center justify-center bg-transparent ${
              side === "left" ? "left-0" : "right-0"
            }`}
          >
            <span
              className={`pointer-events-none mx-1 flex h-[55%] w-[calc(100%-0.5rem)] items-center justify-center rounded-2xl border-2 border-accent1/45 bg-accent1/5 font-mono text-[10px] uppercase tracking-widest text-accent1/75 transition-opacity duration-700 ${
                hintOn ? "opacity-100" : "opacity-0"
              }`}
            >
              tap
            </span>
          </button>
        ))}
    </div>
  );
}
