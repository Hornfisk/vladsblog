// Shared Web Audio plumbing for Clawd Runner: one AudioContext with two gain buses
// (sound effects + music) so each can be muted independently. The context is created
// lazily on the first user gesture (autoplay policy). Toggles persist to localStorage.
// Defaults: SFX on, music off.
import { MUTED_KEY, MUSIC_KEY } from "./constants";

export const MUSIC_VOL = 0.13; // master music level — deliberately gentle
const SFX_VOL = 0.9;

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;

let sfxMuted = load(MUTED_KEY, false); // default: SFX ON
let musicOn = load(MUSIC_KEY, false); // default: music OFF

function load(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}
function save(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* private mode — fine, just won't persist */
  }
}

// tiny pub/sub so on-screen buttons reflect toggles made via the keyboard
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeAudio(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify(): void {
  for (const fn of listeners) fn();
}

/** Create/resume the context + buses. MUST run inside a user gesture. Idempotent. */
export function initAudio(): void {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxMuted ? 0 : SFX_VOL;
    sfxBus.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? MUSIC_VOL : 0;
    musicBus.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function getCtx(): AudioContext | null {
  return ctx;
}
export function getSfxBus(): GainNode | null {
  return sfxBus;
}
export function getMusicBus(): GainNode | null {
  return musicBus;
}

export function isSfxMuted(): boolean {
  return sfxMuted;
}
export function toggleSfx(): boolean {
  sfxMuted = !sfxMuted;
  save(MUTED_KEY, sfxMuted);
  if (sfxBus) sfxBus.gain.value = sfxMuted ? 0 : SFX_VOL;
  notify();
  return sfxMuted;
}

export function isMusicOn(): boolean {
  return musicOn;
}
export function toggleMusic(): boolean {
  musicOn = !musicOn;
  save(MUSIC_KEY, musicOn);
  if (musicBus && ctx) {
    // short ramp so it doesn't click
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(musicOn ? MUSIC_VOL : 0, t + 0.08);
  }
  notify();
  return musicOn;
}
