// Clawd Runner — the game's chiptune theme. A composed, multi-section A-minor track (not a loop):
// Intro (descending bass, instruments enter one at a time) -> A "Drive" -> B "Memory" (relative-
// major colour) -> C "Surge" (circle-of-fifths + dominant build) -> Chorus "Apex" (duotone lead).
// The second pass modulates up a half-step (the turnaround bass climbs a semitone on beat 4), then
// alternates home / +1 each loop. Crystal square lead throughout; harmonized duotone in the chorus.
// Everything is synthesized live (no audio files), scheduled with a 16th-note lookahead, routed
// through the music bus (audio.ts), and silent until the player toggles music on (default off).
// Tempo rises with game speed (setMusicSpeed) — pitch never does.
import { getCtx, getMusicBus, isMusicOn, initAudio, toggleMusic } from "./audio";

const BASE_BPM = 122;
const BASE_SIXTEENTH = 15 / BASE_BPM; // seconds per 16th at base tempo
const TEMPO_RANGE = 0.4; // up to +40% tempo at full game speed
const LOOKAHEAD = 0.14;
const TICK_MS = 25;
const SEMI = 1.0594630943592953; // 2^(1/12), one half-step

type Chord = { arp: number[]; bass: number; root: number; third: number; fifth: number };
type LeadNote = { f: number; d: number; h: number };
type Opts = {
  detune?: number; glideFrom?: number; attack?: number; release?: number;
  vibRate?: number; vibDepth?: number; filter?: number; filterQ?: number;
};
interface Section {
  name: string; back: string; preset: string; chords: string; lead: string;
  chordArr: Chord[]; bars: number; leadArr: (LeadNote | null)[]; start: number;
}

const N: Record<string, number> = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47, C3: 130.81, D3: 146.83,
  E3: 164.81, F3: 174.61, G3: 196.0, Ab3: 207.65, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, Ab5: 830.61, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98,
};

const CH: Record<string, Chord> = {
  Am: { arp: [N.A3, N.C4, N.E4, N.A4], bass: N.A2, root: N.A3, third: N.C4, fifth: N.E4 },
  "Am/G": { arp: [N.A3, N.C4, N.E4, N.A4], bass: N.G2, root: N.A3, third: N.C4, fifth: N.E4 },
  Em: { arp: [N.E3, N.G3, N.B3, N.E4], bass: N.E2, root: N.E3, third: N.G3, fifth: N.B3 },
  Dm: { arp: [N.D3, N.F3, N.A3, N.D4], bass: N.D2, root: N.D3, third: N.F3, fifth: N.A3 },
  "Dm/F": { arp: [N.D3, N.F3, N.A3, N.D4], bass: N.F2, root: N.D3, third: N.F3, fifth: N.A3 },
  F: { arp: [N.F3, N.A3, N.C4, N.F4], bass: N.F2, root: N.F3, third: N.A3, fifth: N.C4 },
  C: { arp: [N.C4, N.E4, N.G4, N.C5], bass: N.C3, root: N.C4, third: N.E4, fifth: N.G4 },
  "C/G": { arp: [N.C4, N.E4, N.G4, N.C5], bass: N.G2, root: N.C4, third: N.E4, fifth: N.G4 },
  G: { arp: [N.G3, N.B3, N.D4, N.G4], bass: N.G2, root: N.G3, third: N.B3, fifth: N.D4 },
  "G/B": { arp: [N.G3, N.B3, N.D4, N.G4], bass: N.B2, root: N.G3, third: N.B3, fifth: N.D4 },
  E: { arp: [N.E3, N.Ab3, N.B3, N.E4], bass: N.E2, root: N.E3, third: N.Ab3, fifth: N.B3 },
  E7: { arp: [N.E3, N.Ab3, N.B3, N.D4], bass: N.E2, root: N.E3, third: N.Ab3, fifth: N.B3 },
  Bdim: { arp: [N.B3, N.D4, N.F4, N.B4], bass: N.B2, root: N.B3, third: N.D4, fifth: N.F4 },
};

const PENT = [N.A3, N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.D5, N.E5];

// lead notation: "Name:dur" (16ths) | "-:dur" rest | "Name:dur:Harm" (duotone harmony note)
const SONG: Section[] = [
  { name: "Intro", back: "intro", preset: "none", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Am Am/G Dm/F E Am Am/G Dm/F E", lead: "" },
  { name: "A-Drive", back: "arcade", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Am Em F C",
    lead: "E5:6 A5:2 G5:4 E5:4  D5:4 E5:2 G5:2 E5:4 D5:4  F5:4 A5:4 G5:2 F5:2 C5:4  E5:4 G5:2 E5:2 C5:4 D5:4" },
  { name: "A-Cadence", back: "arcade", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Dm Bdim E7 Am",
    lead: "F5:4 A5:4 G5:2 F5:2 D5:4  F5:4 D5:2 B4:2 D5:4 F5:4  E5:4 Ab5:4 B5:2 Ab5:2 E5:4  A5:6 E5:2 C5:4 A4:4" },
  { name: "B-Memory", back: "gentle", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "C G/B Am Em",
    lead: "G5:4 C6:4 B5:2 G5:2 E5:4  D6:4 B5:2 G5:2 B5:4 D6:4  C6:4 A5:2 E5:2 A5:4 C6:4  B5:4 G5:2 E5:2 G5:4 B5:4" },
  { name: "B-TurnV7", back: "gentle", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "F C/G Dm E7",
    lead: "A5:4 C6:4 A5:4 F5:4  E5:4 G5:4 C6:4 G5:4  F5:4 A5:4 D6:4 A5:4  B5:4 Ab5:4 E5:4 B4:4" },
  { name: "C-Surge", back: "build", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Dm G C F",
    lead: "A5:4 F5:2 A5:2 D6:4 A5:4  B5:4 D6:2 B5:2 G5:4 B5:4  C6:4 G5:2 E5:2 G5:4 C6:4  A5:4 C6:4 F6:4 C6:4" },
  { name: "C-Build", back: "build", preset: "crystal", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Bdim E7 E7 E7",
    lead: "F5:4 D5:4 F5:4 B5:4  E6:4 B5:4 Ab5:4 B5:4  E6:8 D6:4 B5:4  B5:2 D6:2 E6:2 D6:2 B5:4 -:4" },
  { name: "Chorus-Apex", back: "chorus", preset: "duotone", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "Dm E7 Am C",
    lead: "A5:4:F5 G5:4:E5 F5:4:D5 A5:4:F5  Ab5:4:E5 B5:4:Ab5 E5:4:B4 Ab5:4:E5  A5:6:E5 C6:2:A5 E5:4:C5 A5:4:E5  G5:4:E5 C6:4:G5 E5:4:C5 G5:4:E5" },
  { name: "Chorus-Pivot", back: "chorus", preset: "duotone", chordArr: [], bars: 0, leadArr: [], start: 0,
    chords: "F G Am E7",
    lead: "A5:4:F5 C6:4:A5 A5:4:F5 G5:4:E5  B5:4:G5 D6:4:B5 B5:4:G5 G5:4:D5  C6:4:A5 A5:4:E5 E5:4:C5 A5:4:E5  B5:4:Ab5 Ab5:4:E5 E5:8:B4" },
];
const LOOP_FROM = 1; // intro plays once, then loops from "A-Drive"

function parseChords(s: string): Chord[] {
  return s.trim().split(/\s+/).map((n) => CH[n]);
}
function parseLead(s: string): LeadNote[] {
  if (!s) return [];
  return s.trim().split(/\s+/).map((tok) => {
    const p = tok.split(":");
    return { f: p[0] === "-" ? 0 : N[p[0]], d: +p[1], h: p[2] ? N[p[2]] : 0 };
  });
}
function buildOnsets(notes: LeadNote[], len: number): (LeadNote | null)[] {
  const a: (LeadNote | null)[] = new Array(len).fill(null);
  let pos = 0;
  for (const nt of notes) {
    if (pos < len && nt.f) a[pos] = { f: nt.f, d: nt.d, h: nt.h };
    pos += nt.d;
  }
  return a;
}
let songEnd = 0, loopStart = 0, loopLen = 0;
{
  let off = 0;
  SONG.forEach((sec, i) => {
    sec.chordArr = parseChords(sec.chords);
    sec.bars = sec.chordArr.length;
    sec.leadArr = buildOnsets(parseLead(sec.lead), sec.bars * 16);
    sec.start = off;
    off += sec.bars * 16;
    if (i === LOOP_FROM) loopStart = sec.start;
  });
  songEnd = off;
  loopLen = songEnd - loopStart;
}

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0;
let speed01 = 0;
let TR = 1; // pitch transpose factor (second pass = +1 semitone)
let glidePrev = 0;

export function setMusicSpeed(v: number): void {
  speed01 = Number.isNaN(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
}
function sixteenth(): number {
  return BASE_SIXTEENTH / (1 + speed01 * TEMPO_RANGE);
}

function voice(freq: number, dur: number, type: OscillatorType, vol: number, opts: Opts, at: number): void {
  const ctx = getCtx();
  const bus = getMusicBus();
  if (!ctx || !bus) return;
  const f = freq * TR;
  const glide = opts.glideFrom ? opts.glideFrom * TR : 0;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, at);
  if (glide) {
    osc.frequency.setValueAtTime(glide, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f), at + 0.05);
  } else {
    osc.frequency.setValueAtTime(Math.max(1, f), at);
  }
  const atk = opts.attack != null ? opts.attack : 0.005;
  const rel = opts.release != null ? opts.release : 0.04;
  const sus = Math.max(0.02, dur - rel);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + atk);
  g.gain.setValueAtTime(Math.max(0.0002, vol), at + sus);
  g.gain.exponentialRampToValueAtTime(0.0001, at + sus + rel);
  let node: AudioNode = osc;
  if (opts.filter) {
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(opts.filter, at);
    flt.Q.setValueAtTime(opts.filterQ || 1, at);
    osc.connect(flt);
    node = flt;
  }
  node.connect(g).connect(bus);
  if (opts.vibRate && opts.vibDepth) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(opts.vibRate, at);
    lg.gain.setValueAtTime(0, at);
    lg.gain.setValueAtTime(0, at + Math.min(0.13, sus * 0.3));
    lg.gain.linearRampToValueAtTime(opts.vibDepth, at + sus);
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(at);
    lfo.stop(at + sus + rel + 0.02);
  }
  osc.start(at);
  osc.stop(at + sus + rel + 0.02);
}

function noise(dur: number, vol: number, hp: number, at: number): void {
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
  let node: AudioNode = src;
  if (hp) {
    const flt = ctx.createBiquadFilter();
    flt.type = "highpass";
    flt.frequency.setValueAtTime(hp, at);
    src.connect(flt);
    node = flt;
  }
  node.connect(g).connect(bus);
  src.start(at);
  src.stop(at + dur + 0.02);
}
function kick(at: number): void {
  const ctx = getCtx(); const bus = getMusicBus(); if (!ctx || !bus) return;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(46, at + 0.11);
  g.gain.setValueAtTime(0.9, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  o.connect(g).connect(bus); o.start(at); o.stop(at + 0.16);
}
function snare(at: number): void {
  noise(0.13, 0.4, 1800, at);
  const ctx = getCtx(); const bus = getMusicBus(); if (!ctx || !bus) return;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(190, at);
  g.gain.setValueAtTime(0.2, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  o.connect(g).connect(bus); o.start(at); o.stop(at + 0.1);
}
function hat(at: number, v: number): void {
  noise(0.025, v || 0.09, 7000, at);
}

function backing(style: string, ch: Chord, s16: number, bar: number, sd: number, at: number, turn: boolean): void {
  if (style === "intro") {
    const seq = [0, 1, 2, 3, 3, 2, 1, 0];
    if (s16 % 2 === 0) voice(ch.arp[seq[s16 / 2]], sd * 1.7, "square", 0.2, {}, at);
    if (bar >= 2 && (s16 === 0 || s16 === 8)) voice(ch.bass, sd * 3.6, "triangle", 0.5, { attack: 0.004, release: 0.06 }, at);
    if (bar >= 4) {
      if (s16 === 0 || s16 === 8) kick(at);
      if (s16 === 4 || s16 === 12) snare(at);
      if (s16 % 2 === 0) hat(at, 0.07);
    }
    return;
  }
  if (style === "arcade") {
    if (s16 === 0 || s16 === 7 || s16 === 11) kick(at);
    if (s16 === 4 || s16 === 12) snare(at);
    if ([1, 3, 5, 9, 13, 15].indexOf(s16) >= 0) hat(at, 0.08);
    if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) {
      voice(ch.root * 2, sd * 1.6, "square", 0.09, { filter: 3600, filterQ: 2 }, at);
      voice(ch.fifth * 2, sd * 1.6, "square", 0.07, { filter: 3600, filterQ: 2, detune: 6 }, at);
    }
    if (s16 === 0) voice(ch.bass, sd * 1.5, "triangle", 0.3, { attack: 0.003, release: 0.05 }, at);
    else if (s16 === 4) voice(ch.bass * 2, sd * 0.7, "triangle", 0.2, { attack: 0.003, release: 0.04 }, at);
    else if (s16 === 6) voice(ch.bass, sd * 1.5, "triangle", 0.3, { attack: 0.003, release: 0.05 }, at);
    else if (s16 === 10) voice(ch.bass * 2, sd, "triangle", 0.2, { glideFrom: ch.bass, attack: 0.003, release: 0.04 }, at);
    else if (s16 === 12) voice(ch.fifth, sd * 1.5, "triangle", 0.26, { attack: 0.003, release: 0.05 }, at);
    return;
  }
  if (style === "gentle") {
    if (s16 === 0) voice(ch.bass, sd * 4, "triangle", 0.28, { attack: 0.01, release: 0.12 }, at);
    if (s16 === 8) voice(ch.fifth, sd * 4, "triangle", 0.22, { attack: 0.01, release: 0.12 }, at);
    if (s16 === 0 || s16 === 4 || s16 === 8 || s16 === 12) hat(at, 0.05);
    if (s16 % 2 === 1) { const bi = Math.floor(s16 / 2) % 4; voice(ch.arp[bi] * 2, sd * 0.5, "sine", 0.1, { attack: 0.005, release: 0.05 }, at); }
    return;
  }
  if (style === "build") {
    if (s16 === 0 || s16 === 8) kick(at);
    if (s16 === 4 || s16 === 12) snare(at);
    if (s16 % 2 === 0) hat(at, 0.06 + bar * 0.01);
    if (s16 % 4 === 0) voice(ch.bass, sd * 4, "sawtooth", 0.26, { filter: 700 + bar * 120, filterQ: 4, attack: 0.004, release: 0.05 }, at);
    if (s16 % 4 === 0) voice(ch.bass / 2, sd * 4, "sine", 0.18, { attack: 0.01, release: 0.06 }, at);
    return;
  }
  if (style === "chorus") {
    if (s16 === 0 || s16 === 8) kick(at);
    if (s16 === 4 || s16 === 12) snare(at);
    if (s16 % 2 === 0) hat(at, 0.08);
    if (turn) {
      // turnaround: bass climbs a half-step on beat 4 to pivot UP into the next pass
      if (s16 === 0) voice(ch.bass, sd * 4, "triangle", 0.32, { attack: 0.004, release: 0.06 }, at);
      if (s16 === 8) voice(ch.bass, sd * 3, "triangle", 0.3, { attack: 0.004, release: 0.05 }, at);
      if (s16 === 12) voice(ch.bass * SEMI, sd * 3, "triangle", 0.36, { glideFrom: ch.bass, attack: 0.004, release: 0.07 }, at);
    } else {
      if (s16 === 0 || s16 === 8) voice(ch.bass, sd * 4, "triangle", 0.32, { attack: 0.004, release: 0.06 }, at);
      if (s16 === 4 || s16 === 12) voice(ch.bass * 1.5, sd * 1.5, "triangle", 0.24, { attack: 0.004, release: 0.05 }, at);
    }
    if (s16 % 4 === 0) voice(ch.fifth, sd * 4, "square", 0.05, { filter: 2000, filterQ: 2, attack: 0.02, release: 0.1 }, at);
    return;
  }
}

function lead(preset: string, f: number, dur: number, d: number, harm: number, at: number): void {
  if (preset === "crystal") {
    const c: Opts = { attack: 0.01, release: d >= 4 ? 0.09 : 0.05 };
    if (d >= 4) { c.vibRate = 5.5; c.vibDepth = 20; }
    voice(f, dur, "square", 0.22, c, at);
    glidePrev = f;
  } else if (preset === "duotone") {
    const hh = harm || f * 0.6674;
    const m: Opts = { filter: 3200, filterQ: 2.5, attack: 0.004, release: d >= 4 ? 0.07 : 0.04 };
    if (d >= 4) { m.vibRate = 5.4; m.vibDepth = 14; }
    voice(f, dur, "square", 0.16, m, at);
    voice(hh, dur, "square", 0.12, { filter: 2800, filterQ: 2.5, attack: 0.004, release: d >= 4 ? 0.07 : 0.04, vibRate: d >= 4 ? 5.4 : 0, vibDepth: d >= 4 ? 10 : 0 }, at);
    glidePrev = f;
  } else if (preset === "fmlead") {
    const o: Opts = { filter: 3000, filterQ: 3, attack: 0.002, release: d >= 4 ? 0.06 : 0.03 };
    if (glidePrev > 0) o.glideFrom = glidePrev;
    if (d >= 4) { o.vibRate = 5.5; o.vibDepth = 16; }
    voice(f, dur, "square", 0.18, o, at);
    glidePrev = f;
  }
}

function fullStep(gs: number, sd: number, at: number): void {
  let sec: Section | null = null;
  for (const s of SONG) {
    if (gs >= s.start && gs < s.start + s.bars * 16) { sec = s; break; }
  }
  if (!sec) return;
  const secStep = gs - sec.start;
  const bar = Math.floor(secStep / 16);
  const s16 = secStep % 16;
  const ch = sec.chordArr[bar];
  const turn = sec === SONG[SONG.length - 1] && bar === sec.bars - 1; // the pivot bar
  backing(sec.back, ch, s16, bar, sd, at, turn);
  if (sec.preset !== "none") {
    const on = sec.leadArr[secStep];
    if (on) lead(sec.preset, on.f, on.d * sd * 0.97, on.d, on.h, at);
  }
}

function scheduler(): void {
  const ctx = getCtx();
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    if (isMusicOn()) {
      const sd = sixteenth();
      let gs: number, pass: number;
      if (step < songEnd) { gs = step; pass = 0; }
      else { const rel = step - loopStart; pass = Math.floor(rel / loopLen) % 2; gs = loopStart + (rel % loopLen); }
      TR = Math.pow(2, pass / 12); // second pass = +1 semitone, in key
      fullStep(gs, sd, nextNoteTime);
    }
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
  glidePrev = 0;
  TR = 1;
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
