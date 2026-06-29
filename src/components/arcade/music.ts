// Clawd Runner — an evolving, nostalgic 8-bit chiptune that builds in layers and speeds up with
// the game (tempo only — pitch stays put). Everything is synthesized live (no audio files) and
// scheduled with a lookahead timer so it stays sample-accurate regardless of frame rate. Routed
// through the music bus (audio.ts), silent unless the player toggles music on (default off).
//
// Arrangement (bars are counted from when music starts):
//   bar 0+   arp lead + bass            (the core loop)
//   bar 8+   + 16th-note sub-bass, one octave below the bass
//   bar 16+  + drums (kick / snare / hats)
//   bar 24+  + a saw glide-lead with vibrato on the long held notes
//   every 16 bars (once drums are in): a fast pentatonic fill lick
import { getCtx, getMusicBus, isMusicOn, initAudio, toggleMusic } from "./audio";

const BPM = 116;
const BASE_EIGHTH = 30 / BPM; // seconds per eighth at base tempo
const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const TEMPO_RANGE = 0.45; // up to +45% tempo at full game speed

// Am – F – C – G, one bar each. lead = a melody note up high per chord.
const CHORDS = [
  { arp: [220.0, 261.63, 329.63, 440.0], bass: 110.0, lead: 880.0 }, // Am
  { arp: [174.61, 220.0, 261.63, 349.23], bass: 87.31, lead: 698.46 }, // F
  { arp: [261.63, 329.63, 392.0, 523.25], bass: 130.81, lead: 1046.5 }, // C
  { arp: [196.0, 246.94, 293.66, 392.0], bass: 98.0, lead: 783.99 }, // G
];
const ARP_PATTERN = [0, 1, 2, 3, 3, 2, 1, 0]; // up then down across a bar's 8 eighths
// A-minor pentatonic ladder for the rock fills (A C D E G across ~2 octaves)
const PENT = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const FILL = [8, 7, 5, 4, 7, 5, 4, 2, 4, 2, 1, 0, 2, 4, 5, 7]; // a descending-then-rising lick (16ths)

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0; // running eighth-note index since start
let speed01 = 0; // 0..1 game-speed → tempo
let lastLead = 0; // previous lead freq, for portamento glide

/** Feed the game's normalized speed (0..1) so tempo rises with difficulty (pitch unchanged). */
export function setMusicSpeed(v: number): void {
  speed01 = Number.isNaN(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
}

function eighthDur(): number {
  return BASE_EIGHTH / (1 + speed01 * TEMPO_RANGE);
}

function voice(freq: number, dur: number, type: OscillatorType, vol: number, at: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(bus);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function kick(at: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, at);
  o.frequency.exponentialRampToValueAtTime(48, at + 0.11);
  g.gain.setValueAtTime(0.9, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + 0.16);
}

function noiseHit(at: number, dur: number, vol: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(g).connect(bus);
  src.start(at);
  src.stop(at + dur + 0.02);
}

function snare(at: number): void {
  noiseHit(at, 0.13, 0.4);
  voice(190, 0.09, "triangle", 0.2, at); // a little body
}

function leadNote(freq: number, dur: number, at: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sawtooth";
  if (lastLead > 0) {
    o.frequency.setValueAtTime(lastLead, at);
    o.frequency.exponentialRampToValueAtTime(freq, at + 0.07); // portamento glide
  } else {
    o.frequency.setValueAtTime(freq, at);
  }
  lastLead = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
  g.gain.setValueAtTime(0.3, at + dur * 0.72);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  // vibrato that eases in once the note has been held a moment
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(5.6, at);
  lfoGain.gain.setValueAtTime(0, at);
  lfoGain.gain.linearRampToValueAtTime(freq * 0.013, at + 0.25);
  lfo.connect(lfoGain).connect(o.frequency);
  o.connect(g).connect(bus);
  o.start(at);
  lfo.start(at);
  o.stop(at + dur + 0.05);
  lfo.stop(at + dur + 0.05);
}

function scheduleStep(i: number, at: number): void {
  // bus is muted when off; skip the work entirely to avoid stray scheduled notes
  if (!isMusicOn()) return;
  const ed = eighthDur();
  const bar = Math.floor(i / 8);
  const e = i % 8;
  const chord = CHORDS[bar % CHORDS.length];
  const fillBar = bar >= 16 && bar % 16 === 15;

  // layer 0 — arpeggio + bass (always)
  voice(chord.arp[ARP_PATTERN[e]], ed * 0.92, "square", 0.42, at);
  if (e === 0 || e === 4) voice(chord.bass, ed * 1.9, "triangle", 0.6, at);
  if (e === 2 || e === 6) voice(chord.arp[3] * 2, ed * 0.3, "square", 0.1, at);

  // layer 1 (bar 8+) — 16th-note sub-bass, one octave below the bass
  if (bar >= 8) {
    const sub = chord.bass / 2;
    voice(sub, ed * 0.46, "square", 0.32, at);
    voice(sub, ed * 0.46, "square", 0.32, at + ed / 2);
  }

  // layer 2 (bar 16+) — drums
  if (bar >= 16) {
    if (e === 0 || e === 4) kick(at);
    if (e === 2 || e === 6) snare(at);
    noiseHit(at, 0.028, 0.1); // 8th-note hats
  }

  // layer 3 (bar 24+) — glide lead with vibrato, one held note per 2 beats
  if (bar >= 24 && !fillBar && (e === 0 || e === 4)) {
    leadNote(chord.lead, ed * 3.6, at);
  }

  // fills — a fast pentatonic lick (two 16ths per eighth) every 16 bars
  if (fillBar) {
    voice(PENT[FILL[(e * 2) % FILL.length]], ed * 0.45, "square", 0.34, at);
    voice(PENT[FILL[(e * 2 + 1) % FILL.length]], ed * 0.45, "square", 0.34, at + ed / 2);
  }
}

function scheduler(): void {
  const ctx = getCtx();
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += eighthDur();
    step += 1;
  }
}

/** Start the lookahead scheduler (idempotent). Notes are silent until music is toggled on. */
export function startMusic(): void {
  const ctx = getCtx();
  if (!ctx || timer !== null) return;
  nextNoteTime = ctx.currentTime + 0.1;
  step = 0;
  lastLead = 0;
  timer = setInterval(scheduler, TICK_MS);
}

/** Stop the scheduler (tab hidden / unmount). Does not change the on/off preference. */
export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

/** Flip the music preference AND start/stop the scheduler so it only runs while on. */
export function toggleMusicAndSchedule(): boolean {
  initAudio();
  const on = toggleMusic();
  if (on) startMusic();
  else stopMusic();
  return on;
}
