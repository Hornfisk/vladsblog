// Clawd Runner — tiny 8-bit sound effects synthesized live with the Web Audio API.
// No audio files: every blip is a square/saw oscillator with a fast envelope, routed
// through the shared SFX bus (see audio.ts). No-op until the first user gesture / when muted.
import { getCtx, getSfxBus, isSfxMuted } from "./audio";
import type { SfxEvent } from "./engine";

// re-export so existing call sites can keep importing initAudio from here
export { initAudio } from "./audio";

/** A pitched blip: glides through `freqs`, with a quick attack/decay envelope. */
function tone(freqs: number[], dur: number, type: OscillatorType, vol: number, delay = 0): void {
  const ctx = getCtx();
  const bus = getSfxBus();
  if (!ctx || !bus) return;
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
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A short noise burst (used for crashes). */
function noise(dur: number, vol: number, delay = 0): void {
  const ctx = getCtx();
  const bus = getSfxBus();
  if (!ctx || !bus) return;
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
  src.connect(g).connect(bus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Fire the cue for a gameplay event. No-op when muted or before the first gesture. */
export function playSfx(name: SfxEvent): void {
  if (isSfxMuted() || !getCtx()) return;
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
    case "powerup": // bright ascending arpeggio (gem)
      tone([784], 0.06, "square", 0.15);
      tone([1047], 0.06, "square", 0.15, 0.06);
      tone([1568], 0.16, "square", 0.14, 0.12);
      break;
    case "shield": // shimmery up-sweep
      tone([523, 1568], 0.22, "triangle", 0.16);
      break;
    case "life": // happy 1up jingle
      tone([659], 0.08, "square", 0.16);
      tone([988], 0.08, "square", 0.16, 0.08);
      tone([1319], 0.2, "square", 0.15, 0.16);
      break;
    case "hurt": // down-blip + thud when a shield/life absorbs a hit
      tone([440, 130], 0.18, "square", 0.16);
      noise(0.14, 0.08, 0.0);
      break;
    case "start":
      tone([440, 660, 880], 0.16, "square", 0.15);
      break;
    case "die": // descending "segfault" + crash
      tone([340, 70], 0.42, "sawtooth", 0.18);
      noise(0.34, 0.1, 0.02);
      break;
    case "act": // soft two-note "new act" chime
      tone([523, 784], 0.14, "triangle", 0.12);
      tone([784, 1047], 0.16, "triangle", 0.1, 0.06);
      break;
    case "throttle": // harsh 429 buzz-down + static
      tone([300, 110], 0.28, "sawtooth", 0.16);
      noise(0.16, 0.09, 0.02);
      break;
    case "opus": // triumphant ascending run (bigger than a normal power-up)
      tone([523], 0.07, "square", 0.16);
      tone([659], 0.07, "square", 0.16, 0.07);
      tone([784], 0.07, "square", 0.16, 0.14);
      tone([1047], 0.26, "square", 0.15, 0.21);
      break;
    case "milestone": // bright sparkle for "you're absolutely right!"
      tone([1319, 1976], 0.18, "triangle", 0.14);
      tone([1976], 0.12, "square", 0.1, 0.05);
      break;
  }
}
