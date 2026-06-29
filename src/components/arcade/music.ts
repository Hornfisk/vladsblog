// Clawd Runner — a small, nostalgic 8-bit chiptune loop synthesized live (no audio files).
// A square-wave arpeggio lead over a triangle bass walking an Am–F–C–G loop, scheduled with
// a lookahead timer so it stays sample-accurate regardless of frame rate. Routed through the
// music bus (see audio.ts), which is silent unless the player toggles music on (default off).
import { getCtx, getMusicBus, isMusicOn, initAudio, toggleMusic } from "./audio";

const BPM = 116;
const EIGHTH = 30 / BPM; // seconds per eighth note (= 60/BPM/2)
const LOOKAHEAD = 0.12; // schedule this far ahead (s)
const TICK_MS = 25; // scheduler wake interval

// Am – F – C – G, one bar each. arp = four notes (root/3rd/5th/octave), bass = low root.
const CHORDS = [
  { arp: [220.0, 261.63, 329.63, 440.0], bass: 110.0 }, // Am
  { arp: [174.61, 220.0, 261.63, 349.23], bass: 87.31 }, // F
  { arp: [261.63, 329.63, 392.0, 523.25], bass: 130.81 }, // C
  { arp: [196.0, 246.94, 293.66, 392.0], bass: 98.0 }, // G
];
const ARP_PATTERN = [0, 1, 2, 3, 3, 2, 1, 0]; // up then down across the 8 eighths of a bar

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0; // running eighth-note index

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

function scheduleStep(i: number, at: number): void {
  // The bus is muted when music is off; skip the work entirely to avoid stray notes.
  if (!isMusicOn()) return;
  const bar = Math.floor(i / 8) % CHORDS.length;
  const eighth = i % 8;
  const chord = CHORDS[bar];
  // lead arpeggio every eighth
  voice(chord.arp[ARP_PATTERN[eighth]], EIGHTH * 0.92, "square", 0.5, at);
  // bass on beats 1 and 3 of the bar
  if (eighth === 0 || eighth === 4) voice(chord.bass, EIGHTH * 1.9, "triangle", 0.62, at);
  // soft off-beat blip for a little groove
  if (eighth === 2 || eighth === 6) voice(chord.arp[3] * 2, EIGHTH * 0.3, "square", 0.12, at);
}

function scheduler(): void {
  const ctx = getCtx();
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += EIGHTH;
    step += 1;
  }
}

/** Start the lookahead scheduler (idempotent). Notes are silent until music is toggled on. */
export function startMusic(): void {
  const ctx = getCtx();
  if (!ctx || timer !== null) return;
  nextNoteTime = ctx.currentTime + 0.1;
  step = 0;
  timer = setInterval(scheduler, TICK_MS);
}

/** Stop the scheduler (e.g. tab hidden / unmount). Does not change the on/off preference. */
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
