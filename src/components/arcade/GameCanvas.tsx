// Clawd Runner — wires the pure engine to a <canvas>, input, and the render loop.
// Everything is client-side and self-contained; no network, no shared state.
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
import { render } from "./render";
import { useGameLoop } from "./useGameLoop";

const STEP = 1 / 120; // fixed physics timestep

export function GameCanvas() {
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

  // --- input ---
  useEffect(() => {
    const s = () => stateRef.current!;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      switch (code) {
        case "Space":
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          if (!pressed.current.has(code)) onJumpDown(s());
          break;
        case "ArrowLeft":
        case "KeyA":
          e.preventDefault();
          s().input.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          e.preventDefault();
          s().input.right = true;
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          s().input.duck = true;
          break;
        case "Escape":
          togglePause(s());
          break;
        case "KeyR":
          if (s().phase === "dead") startGame(s());
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
        case "ArrowLeft":
        case "KeyA":
          s().input.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          s().input.right = false;
          break;
        case "ArrowDown":
        case "KeyS":
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

  // --- touch / pointer ---
  const touchDuck = useRef(false);
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const s = stateRef.current!;
    const rect = e.currentTarget.getBoundingClientRect();
    const yFrac = (e.clientY - rect.top) / rect.height;
    if (s.phase === "playing" && yFrac > 0.6) {
      s.input.duck = true;
      touchDuck.current = true;
    } else {
      onJumpDown(s);
    }
  };
  const endPointer = () => {
    const s = stateRef.current!;
    if (touchDuck.current) {
      s.input.duck = false;
      touchDuck.current = false;
    }
    onJumpUp(s);
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
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none cursor-pointer"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={onPointerDown}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      aria-label="Clawd Runner game canvas"
    />
  );
}
