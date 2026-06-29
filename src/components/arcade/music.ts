// Clawd Runner — an evolving, melodic 8-bit chiptune in the spirit of classic Japanese tracker
// music. Everything is synthesized live (no audio files) and scheduled with a 16th-note lookahead
// so it stays sample-accurate regardless of frame rate. Routed through the music bus (audio.ts),
// silent unless the player toggles music on (default off).
//
// Form: AABA over a written lead melody (A = Am–F–C–G, B = Dm–G–C–E bridge). The lead uses
// portamento (it glides into each note) but is NOT legato — every note re-attacks with a gap, and
// vibrato eases in progressively the longer a note is held. Note lengths vary (some 16ths, some
// held). The backing builds in layers: bar 8 adds a 16th sub-bass (1 oct down), bar 16 adds drums;
// a pentatonic fill lick lands every 16 bars. Tempo rises with game speed — pitch never does.
import { getCtx, getMusicBus, isMusicOn, initAudio, toggleMusic } from "./audio";

const BPM = 116;
const BASE_SIXTEENTH = 15 / BPM; // seconds per 16th at base tempo (= 60/BPM/4)
const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const TEMPO_RANGE = 0.45; // up to +45% tempo at full game speed

// note name → frequency
const N: Record<string, number> = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, C3: 130.81, D3: 146.83,
  E3: 164.81, F3: 174.61, G3: 196.0, Ab3: 207.65, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, Ab5: 830.61, A5: 880.0,
  B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51,
};

type Chord = { arp: number[]; bass: number };
const CH: Record<string, Chord> = {
  Am: { arp: [N.A3, N.C4, N.E4, N.A4], bass: N.A2 },
  F: { arp: [N.F3, N.A3, N.C4, N.F4], bass: N.F2 },
  C: { arp: [N.C4, N.E4, N.G4, N.C5], bass: N.C3 },
  G: { arp: [N.G3, N.B3, N.D4, N.G4], bass: N.G2 },
  Dm: { arp: [N.D3, N.F3, N.A3, N.D4], bass: N.D2 },
  E: { arp: [N.E3, N.Ab3, N.B3, N.E4], bass: N.E2 },
};
const A_CHORDS = [CH.Am, CH.F, CH.C, CH.G];
const B_CHORDS = [CH.Dm, CH.G, CH.C, CH.E];
const ORDER: ("A" | "B")[] = ["A", "A", "B", "A"]; // AABA, 16 bars, loops
const ARP_PATTERN = [0, 1, 2, 3, 3, 2, 1, 0];

// lead melodies as [noteName | rest(0), durationIn16ths]; each section = 64 sixteenths (4 bars)
type Step = [keyof typeof N | 0, number];
const A_LEAD: Step[] = [
  ["E5", 4], ["G5", 2], ["A5", 2], ["G5", 4], ["E5", 2], ["D5", 2], // Am
  ["C5", 4], ["F5", 4], ["E5", 4], ["C5", 2], [0, 2], // F
  ["E5", 2], ["G5", 2], ["C6", 4], ["B5", 2], ["G5", 2], ["E5", 4], // C
  ["D5", 4], ["B4", 2], ["D5", 2], ["G5", 6], [0, 2], // G
];
const B_LEAD: Step[] = [
  ["A5", 4], ["F5", 2], ["A5", 2], ["D6", 4], ["A5", 2], ["F5", 2], // Dm
  ["G5", 4], ["B5", 2], ["D6", 2], ["B5", 4], ["G5", 4], // G
  ["C6", 4], ["B5", 2], ["G5", 2], ["E5", 4], ["G5", 2], ["C6", 2], // C
  ["B5", 4], ["Ab5", 2], ["E5", 2], ["B4", 4], ["E5", 4], // E
];

function buildLead(notes: Step[]): ({ f: number; d: number } | null)[] {
  const arr: ({ f: number; d: number } | null)[] = new Array(64).fill(null);
  let pos = 0;
  for (const [name, d] of notes) {
    if (name !== 0 && pos < 64) arr[pos] = { f: N[name], d };
    pos += d;
  }
  return arr;
}
const A_LEAD_MAP = buildLead(A_LEAD);
const B_LEAD_MAP = buildLead(B_LEAD);

// A-minor pentatonic ladder for the rock fill lick
const PENT = [N.A3, N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.D5, N.E5];
const FILL = [8, 7, 5, 4, 7, 5, 4, 2, 4, 2, 1, 0, 2, 4, 5, 7];

const SECTION_STEPS = 64;
const SONG_STEPS = ORDER.length * SECTION_STEPS; // 256 (16 bars)

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0;
let speed01 = 0;
let lastLead = 0;

/** Feed the game's normalized speed (0..1) so tempo rises with difficulty (pitch unchanged). */
export function setMusicSpeed(v: number): void {
  speed01 = Number.isNaN(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
}
function sixteenth(): number {
  return BASE_SIXTEENTH / (1 + speed01 * TEMPO_RANGE);
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
  voice(190, 0.09, "triangle", 0.2, at);
}

// lead voice: portamento glide in, NOT legato (releases before the slot ends), with vibrato that
// eases in and deepens the longer the note is held. `d` = note length in 16ths.
function leadNote(f: number, durSec: number, d: number, at: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sawtooth";
  if (lastLead > 0) {
    o.frequency.setValueAtTime(lastLead, at);
    o.frequency.exponentialRampToValueAtTime(f, at + 0.05); // portamento
  } else {
    o.frequency.setValueAtTime(f, at);
  }
  lastLead = f;
  const sus = durSec * 0.82; // release before the slot ends → re-articulated, not legato
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.34, at + 0.012);
  g.gain.setValueAtTime(0.34, at + sus * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, at + sus);
  // progressive vibrato — depth grows across the note, and deeper for longer notes
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(5.6, at);
  const maxDepth = f * (0.005 + Math.min(0.022, d * 0.0045));
  lg.gain.setValueAtTime(0, at);
  lg.gain.linearRampToValueAtTime(maxDepth, at + sus);
  lfo.connect(lg).connect(o.frequency);
  o.connect(g).connect(bus);
  o.start(at);
  lfo.start(at);
  o.stop(at + durSec);
  lfo.stop(at + durSec);
}

function scheduleStep(i: number, at: number): void {
  if (!isMusicOn()) return;
  const sd = sixteenth();
  const bar = Math.floor(i / 16);
  const songStep = ((i % SONG_STEPS) + SONG_STEPS) % SONG_STEPS;
  const sec = Math.floor(songStep / SECTION_STEPS);
  const secStep = songStep % SECTION_STEPS;
  const barInSec = Math.floor(secStep / 16);
  const s16 = secStep % 16;
  const isA = ORDER[sec] === "A";
  const chord = (isA ? A_CHORDS : B_CHORDS)[barInSec];
  const leadMap = isA ? A_LEAD_MAP : B_LEAD_MAP;
  const fillBar = bar >= 16 && bar % 16 === 15;

  // chord backing — soft 8th-note arpeggio under the melody
  if (s16 % 2 === 0) voice(chord.arp[ARP_PATTERN[s16 / 2]], sd * 1.7, "square", 0.22, at);
  // bass on beats 1 & 3
  if (s16 === 0 || s16 === 8) voice(chord.bass, sd * 3.6, "triangle", 0.55, at);
  // sub-bass 16ths, one octave down (bar 8+)
  if (bar >= 8) voice(chord.bass / 2, sd * 0.9, "square", 0.3, at);
  // drums (bar 16+)
  if (bar >= 16) {
    if (s16 === 0 || s16 === 8) kick(at);
    if (s16 === 4 || s16 === 12) snare(at);
    if (s16 % 2 === 0) noiseHit(at, 0.025, 0.08);
  }

  if (fillBar) {
    // turnaround fill lick (replaces the melody that bar)
    voice(PENT[FILL[s16 % FILL.length]], sd * 0.9, "square", 0.34, at);
  } else {
    // the main melody
    const on = leadMap[secStep];
    if (on) leadNote(on.f, on.d * sd * 0.96, on.d, at);
  }
}

function scheduler(): void {
  const ctx = getCtx();
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += sixteenth();
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
