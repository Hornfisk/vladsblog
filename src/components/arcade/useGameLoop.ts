// requestAnimationFrame loop with delta clamping and auto-pause when the tab is hidden.
import { useEffect, useRef } from "react";

export function useGameLoop(
  cb: (dt: number) => void,
  onHide?: () => void,
): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const hideRef = useRef(onHide);
  hideRef.current = onHide;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05; // clamp tab-switch / GC hitches
      cbRef.current(dt);
      raf = requestAnimationFrame(frame);
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        hideRef.current?.();
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
