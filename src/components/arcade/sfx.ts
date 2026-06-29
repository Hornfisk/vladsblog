// Clawd Runner — tiny 8-bit sound effects synthesized live with the Web Audio API.
// No audio files, no network: every blip is a square/saw oscillator with a fast envelope.
// The AudioContext is created lazily on the first user gesture (browser autoplay policy),
// and a mute toggle is persisted to localStorage.
import { MUTED_KEY } from "./constants";
import type { SfxEvent } from "./engine";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function getMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(MUTED_KEY, v ? "1" : "0");
  } catch {
    /* private mode — fine, just won't persist */
  }
  if (master) master.gain.value = v ? 0 : 0.9;
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

/** Create/resume the context. MUST run inside a user gesture (first key press / tap). */
export function initAudio(): void {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

/** A pitched blip: glides through `freqs`, with a quick attack/decay envelope. */
function tone(freqs: number[], dur: number, type: OscillatorType, vol: number, delay = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freqs[0]), t);
  const seg = freqs.length > 1 ? dur / (freqs.length - 1) : dur;
  for (let i = 1; i < freqs.length; i++) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqs[i]), t + seg * i);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A short noise burst (used for the crash on death). */
function noise(dur: number, vol: number, delay = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Fire the cue for a gameplay event. No-op when muted or before the first gesture. */
export function playSfx(name: SfxEvent): void {
  if (muted || !ctx) return;
  switch (name) {
    case "jump":
      tone([330, 760], 0.13, "square", 0.16);
      break;
    case "duck":
      tone([280, 150], 0.09, "square", 0.13);
      break;
    case "token": // classic two-step coin
      tone([988], 0.05, "square", 0.15);
      tone([1319], 0.14, "square", 0.13, 0.05);
      break;
    case "start":
      tone([440, 660, 880], 0.16, "square", 0.15);
      break;
    case "die": // descending "segfault" + crash
      tone([340, 70], 0.42, "sawtooth", 0.18);
      noise(0.34, 0.1, 0.02);
      break;
  }
}
