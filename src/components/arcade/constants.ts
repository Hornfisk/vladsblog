// Clawd Runner — tunables. All gameplay numbers live here so the feel is easy to tweak.
// Units: virtual pixels for space, seconds for time. The whole game renders at this
// internal resolution then scales up crisp (no smoothing) to fit the container.

/** The unlinked route the game lives at. Change this one string to move the secret. */
export const SECRET_PATH = "/arcade";

// --- internal pixel canvas ---
export const VIRTUAL_W = 384;
export const VIRTUAL_H = 216;
export const GROUND_Y = 178; // y of the ground surface (top of the floor)

// --- player ---
// Clawd is pinned to a fixed x on the left (Chrome-dino style); no horizontal control.
export const PLAYER_X_START = 64;
export const PLAYER_W = 22;
export const PLAYER_H = 18; // standing height
export const PLAYER_DUCK_H = 11; // crouched height

// --- jump / gravity ---
export const GRAVITY = 1500;
export const JUMP_VELOCITY = -470;
export const JUMP_CUT = 0.45; // velocity kept when jump released early (variable height)
export const MAX_AIR_JUMPS = 1; // mid-air jumps after leaving the ground (1 = double jump)
export const DOUBLE_JUMP_VELOCITY = -430; // second-jump impulse (a touch under the first)
export const MAX_FALL = 760;
export const FAST_FALL = 1700; // extra downward accel from down/swipe-down in the air (slam)
export const FAST_FALL_MAX = 1350; // raised fall-speed cap while slamming, so it actually bites
export const COYOTE_TIME = 0.09; // grace window to still jump just after leaving ground
export const JUMP_BUFFER = 0.12; // grace window to register a jump pressed just before landing

// --- world speed / difficulty ramp ---
export const BASE_SPEED = 158;
export const MAX_SPEED = 372;
export const SPEED_PER_PX = 0.018; // speed gained per px travelled
export const SCORE_PER_PX = 0.1; // distance → score

// --- spawning (kept individually passable; spacing scales with speed) ---
export const SPAWN_BASE_GAP = 1.15; // seconds between spawns at BASE_SPEED
export const SPAWN_MIN_GAP = 0.62; // floor on spacing at MAX_SPEED
export const SPAWN_JITTER = 0.45; // random extra seconds
export const TOKEN_CHANCE = 0.6; // chance to also float a token after an obstacle

// --- obstacles ---
export const SKITTER_W = 12; // small low scuttler — easy hop
export const SKITTER_H = 9;
export const CRAWLER_W = 18; // the standard beetle
export const CRAWLER_H = 15;
export const STACKER_W = 14; // tall stack-overflow tower — needs a full (held) jump
export const STACKER_H = 34;
export const FLYER_W = 24;
export const FLYER_H = 14; // compact flyer — jumpable AND duckable; a ground shadow sells "airborne"
export const FLYER_GAP = 13; // open height beneath the overhead flyer (duck to fit)

// --- tokens ---
export const TOKEN_R = 6;
export const TOKEN_POINTS = 25;
export const COMBO_MAX = 9;

// --- power-ups (float in a HIGH lane only reachable with a double jump) ---
export const POWERUP_CHANCE = 0.16; // chance to float a special pickup after an obstacle
export const POWERUP_Y_MIN = 50; // small y = high up; this lane sits above single-jump apex
export const POWERUP_Y_MAX = 70;
export const PICKUP_R = 7;
export const GEM_POINTS = 150; // gold gem bonus
export const MAX_LIVES = 3; // cap on stored extra lives
export const INVULN_TIME = 1.2; // i-frames after surviving a hit (shield break / life lost)

// --- juice ---
export const SHAKE_DECAY = 6;
export const ALERT_RANGE = 78; // obstacle distance at which Clawd's eyes go >  < (squint)
export const BORED_AFTER = 3.2; // seconds with nothing nearby before his eyes go -  - (bored)

// --- palette (matches vlads.blog; Clawd in his real Anthropic terracotta #D97757) ---
export const COLORS = {
  bg: "#151821",
  grid: "rgba(155,135,245,0.05)",
  ground: "#2a2740",
  groundLine: "#9b87f5",
  accent1: "#9b87f5",
  accent2: "#D946EF",
  text: "#f3f4f6",
  dim: "#8b8ba7",
  clawdBody: "#D97757", // the real Clawd clay
  clawdShade: "#B26247", // bottom shading band
  clawdDark: "#874A36", // leg undersides / notch
  clawdEdge: "#F0A487", // subtle top highlight (stands in for the sticker's outline)
  eyePupil: "#15110d", // solid black square eyes
  eyeWhite: "#fdf6f0", // (bug sprite eyes)
  bug: "#E0556E",
  bugDark: "#8f2a3e",
  bugLit: "#ff7d92", // brighter red for the stacker's glitch flicker
  flyer: "#D946EF",
  flyerDark: "#7a1d8a",
  token: "#46d27a",
  tokenGlow: "rgba(70,210,122,0.35)",
  gem: "#ffd24a", // points pickup
  gemGlow: "rgba(255,210,74,0.35)",
  shield: "#54d6ff", // shield pickup + shield ring
  shieldGlow: "rgba(84,214,255,0.4)",
  life: "#ff5a7a", // 1up heart
  opus: "#ffb86b", // opus-mode aura (warm terracotta-gold, sits beside Clawd's clay)
  opusGlow: "rgba(255,184,107,0.35)",
  throttle: "#ff4d5e", // 429 rate-limit red (meter cap + screen edge)
} as const;

// --- session acts: the world recolors as the run progresses through named phases.
// Clawd himself stays terracotta (see clawdSprite / the fixed COLORS above) — he's the
// constant anchor while the world cycles. A run steps through these in order, then loops.
// Only the WORLD keys live here; tokens/gem/shield/life keep their fixed colors for
// readability, and the flyer recolors to each theme's accent2 to stay legible on any bg. ---
export const ACT_LENGTH = 5200; // virtual px of distance per act before the theme advances (~2× the first pass, ~25s)
export const SEAM_SPEED_TRACK = 1; // the transition seam scrolls at world speed × this

export interface Theme {
  name: string; // shown as a "» <name>" toast when the act begins
  bg: string;
  ground: string;
  groundLine: string;
  accent1: string; // primary — ground line, ground ticks, title text, act toast
  accent2: string; // secondary — the flyer + magenta-ish window lights
  bug: string; // ground-creature body
  bugDark: string; // ground-creature shading / legs
  bugLit: string; // stacker glitch-flicker highlight
  silhouette: string; // city skyline buildings
  star: string; // star hue (hex; alpha applied at draw time)
}

export const THEMES: Theme[] = [
  { name: "cold start", bg: "#0b1410", ground: "#12251a", groundLine: "#46d27a", accent1: "#46d27a", accent2: "#8affc1", bug: "#2fae63", bugDark: "#155f38", bugLit: "#8affc1", silhouette: "#0e2016", star: "#7bffb0" },
  { name: "in the flow", bg: "#1a1206", ground: "#2c1f0c", groundLine: "#ffb347", accent1: "#ffb347", accent2: "#ffd98a", bug: "#e08a2e", bugDark: "#8f4f13", bugLit: "#ffd98a", silhouette: "#241906", star: "#ffcf8f" },
  { name: "deep context", bg: "#151821", ground: "#2a2740", groundLine: "#9b87f5", accent1: "#9b87f5", accent2: "#D946EF", bug: "#E0556E", bugDark: "#8f2a3e", bugLit: "#ff7d92", silhouette: "#1b1e2c", star: "#cbd5ff" },
  { name: "rate climbing", bg: "#1a0a1e", ground: "#2e0f36", groundLine: "#D946EF", accent1: "#D946EF", accent2: "#ff8af0", bug: "#c93ad6", bugDark: "#6a1370", bugLit: "#ff8af0", silhouette: "#25082b", star: "#f0a6ff" },
  { name: "shipping", bg: "#0d0f14", ground: "#20242e", groundLine: "#e8ecf4", accent1: "#e8ecf4", accent2: "#8b8ba7", bug: "#c2c7d4", bugDark: "#5b606e", bugLit: "#ffffff", silhouette: "#171a21", star: "#ffffff" },
];

// --- rate-limit / usage meter (push-your-luck token multiplier) ---
// Collecting tokens fills a "usage" meter. Above USAGE_HOT it pays a rising bonus (up to
// 1 + USAGE_BONUS ×). Overfill it and you trip a 429: THROTTLE_TIME seconds where tokens
// score nothing and the combo is wiped. Skill = ride it hot, back off before the cap.
export const USAGE_PER_TOKEN = 0.16; // meter gained per token (0..1)
export const USAGE_DECAY = 0.1; // meter drained per second once the grace window lapses
export const USAGE_GRACE = 0.7; // seconds after a token before the meter starts draining (keeps a streak fillable)
export const USAGE_HOT = 0.6; // fraction where the token bonus starts ramping in
export const USAGE_BONUS = 1.0; // extra token multiplier at a full meter (=> up to 2×)
export const THROTTLE_TIME = 1.5; // seconds of "429" lockout when the meter overflows

// --- opus mode: a rare "model upgrade" power state ---
export const OPUS_TIME = 5.0; // seconds of invincible + 2× tokens + speed burst
export const OPUS_SPEED_MULT = 1.35; // world-speed boost while active (a joyride)
export const OPUS_TOKEN_MULT = 2; // token points multiplier while active
export const OPUS_MIN_DISTANCE = 1500; // the opus pickup can't spawn before this (early game stays normal)

// --- floor holes: a gap in the ground you must hop; fall in and you die (unless a shield/life
// pops you back out, blinking). Sized well inside a single hop. Ease in after some distance. ---
export const HOLE_MIN_DISTANCE = 1200; // no holes in the opening stretch
export const HOLE_MIN_W = 22;
export const HOLE_MAX_W = 40;
export const HOLE_GROUND_SHARE = 0.32; // chance a ground-lane spawn is a hole (once past HOLE_MIN_DISTANCE)
export const PIT_DEATH_Y = GROUND_Y + 32; // y (below the floor) past which a fall counts as into the void

// --- duck-only overhang: a bar hung at head height with clearance ONLY for a crouched Clawd.
// You cannot jump it (jumping into it kills you) — it forces a duck. Eases in after some distance. ---
export const OVERHANG_MIN_DISTANCE = 900;
export const OVERHANG_SHARE = 0.4; // chance an overhead spawn is an overhang vs the flyer (once past its min distance)
export const OVERHANG_W = 26;
export const OVERHANG_TOP = 138; // top edge of the hanging block
export const OVERHANG_BOTTOM = 166; // bottom edge — leaves ~12px, enough for a duck (11) but not a stand (18)

export const HIGHSCORE_KEY = "clawd.arcade.highscore.v1";
export const MUTED_KEY = "clawd.arcade.muted.v1"; // sfx mute
export const MUSIC_KEY = "clawd.arcade.music.v1"; // music on/off
