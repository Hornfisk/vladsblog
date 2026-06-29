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
export const BUG_W = 18;
export const BUG_H = 15;
export const ERR_W = 26;
export const ERR_H = 16;
export const ERR_GAP = 13; // open height beneath an overhead ERR! banner (duck to fit)

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
  err: "#D946EF",
  errDark: "#7a1d8a",
  token: "#46d27a",
  tokenGlow: "rgba(70,210,122,0.35)",
  gem: "#ffd24a", // points pickup
  gemGlow: "rgba(255,210,74,0.35)",
  shield: "#54d6ff", // shield pickup + shield ring
  shieldGlow: "rgba(84,214,255,0.4)",
  life: "#ff5a7a", // 1up heart
} as const;

export const HIGHSCORE_KEY = "clawd.arcade.highscore.v1";
export const MUTED_KEY = "clawd.arcade.muted.v1"; // sfx mute
export const MUSIC_KEY = "clawd.arcade.music.v1"; // music on/off
