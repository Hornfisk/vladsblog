// Per-browser high score. localStorage is origin- and browser-scoped, so this is
// inherently isolated to each user — nothing is ever shared or sent anywhere.
import { HIGHSCORE_KEY } from "./constants";

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // private mode / storage disabled — just play without persistence
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore — non-fatal
  }
}
