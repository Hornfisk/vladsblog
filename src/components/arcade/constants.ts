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
export const PLAYER_X_START = 96;
export const PLAYER_X_MIN = 28;
export const PLAYER_X_MAX = 240;
export const PLAYER_W = 22;
export const PLAYER_H = 18; // standing height
export const PLAYER_DUCK_H = 11; // crouched height
export const PLAYER_MOVE_ACCEL = 900; // horizontal accel from ← →
export const PLAYER_MOVE_MAX = 150; // max horizontal speed
export const PLAYER_FRICTION = 8; // how fast horizontal speed bleeds off

// --- jump / gravity ---
export const GRAVITY = 1500;
export const JUMP_VELOCITY = -470;
export const JUMP_CUT = 0.45; // velocity kept when jump released early (variable height)
export const MAX_FALL = 760;
export const FAST_FALL = 900; // extra downward accel while ducking mid-air
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
export const BUG_W = 18;
export const BUG_H = 15;
export const ERR_W = 26;
export const ERR_H = 16;
export const ERR_GAP = 13; // open height beneath an overhead ERR! banner (duck to fit)

// --- tokens ---
export const TOKEN_R = 6;
export const TOKEN_POINTS = 25;
export const COMBO_MAX = 9;

// --- juice ---
export const SHAKE_DECAY = 6;
export const ALERT_RANGE = 78; // obstacle distance at which Clawd's eyes go wide

// --- palette (matches vlads.blog; Clawd in peach so the hero pops) ---
export const COLORS = {
  bg: "#151821",
  grid: "rgba(155,135,245,0.05)",
  ground: "#2a2740",
  groundLine: "#9b87f5",
  accent1: "#9b87f5",
  accent2: "#D946EF",
  text: "#f3f4f6",
  dim: "#8b8ba7",
  clawdBody: "#F4B89A",
  clawdShade: "#D98C6A",
  clawdDark: "#9c5b3f",
  eyeWhite: "#fdf6f0",
  eyePupil: "#1a1420",
  bug: "#E0556E",
  bugDark: "#8f2a3e",
  err: "#D946EF",
  errDark: "#7a1d8a",
  token: "#46d27a",
  tokenGlow: "rgba(70,210,122,0.35)",
} as const;

export const HIGHSCORE_KEY = "clawd.arcade.highscore.v1";
