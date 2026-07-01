// Clawd Runner — pure game state + update step. No DOM, no rendering, no network.
// One instance per mounted game; nothing shared between tabs/users.
import * as C from "./constants";
import { loadHighScore, saveHighScore } from "./highScore";

export type Phase = "ready" | "playing" | "paused" | "dead";
export type Expression = "idle" | "focused" | "alert" | "bored" | "dead";
// ground creatures (jump) · flyer (jump or duck) · overhang (duck only — can't be jumped)
export type ObstacleType = "skitter" | "crawler" | "stacker" | "flyer" | "overhang";

/** Pickup kinds. "token" is the common ground-lane reward; the rest float in the
 * high lane that only a double jump can reach. "opus" is the rare model-upgrade star. */
export type PickupKind = "token" | "gem" | "shield" | "life" | "opus" | "magnet";

/** What killed the run — picks the death-screen title/subtitle. */
export type DeathCause = "segfault" | "hallucination" | "ratelimit" | "void";

/** A gap in the floor. Hop it; fall in and you die (unless a shield/life pops you back out). */
export interface Hole {
  id: number;
  x: number; // left edge
  w: number;
}

/** An in-progress act transition: a glowing seam sweeps left, revealing the new palette behind it. */
export interface Transition {
  from: number; // the act index being left behind (its palette shows left of the seam)
  seamX: number; // x of the seam; scrolls from the right edge off to the left
}

/** A transient on-screen message (act name, power-up label, 429, milestone). */
export interface Toast {
  text: string;
  color: string;
  t: number; // seconds remaining
}

/** One-shot events the loop drains each frame to fire sound effects. */
export type SfxEvent =
  | "jump" | "duck" | "token" | "die" | "start" | "powerup" | "shield" | "life" | "hurt"
  | "act" | "throttle" | "opus" | "milestone" | "clutch";

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number; // left edge
  y: number; // top edge
  w: number;
  h: number;
  passed?: boolean; // scored for a near-miss once it's behind Clawd
  minGap?: number; // tightest vertical clearance seen while overlapping Clawd's column
}

export interface Token {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  kind: PickupKind;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
}

export interface Player {
  x: number;
  y: number; // top edge
  vy: number;
  onGround: boolean;
  ducking: boolean;
  coyote: number;
  jumpBuffer: number;
  jumpHeld: boolean;
  wantCut: boolean;
  airJumps: number; // mid-air jumps used since leaving the ground (for double jump)
  squash: number; // -1 squashed (landing) .. +1 stretched (rising)
  runPhase: number; // animation accumulator
  blink: number; // countdown to next blink
}

export interface Input {
  duck: boolean;
}

export interface GameState {
  phase: Phase;
  time: number;
  distance: number;
  speed: number;
  score: number;
  highScore: number;
  newHigh: boolean;
  combo: number;
  tokenTally: number;
  lives: number; // stored extra lives (a hit spends one instead of dying)
  shielded: boolean; // one-hit shield active
  invuln: number; // i-frames remaining after surviving a hit
  act: number; // index into THEMES — the current session act (drives the world palette)
  actOffset: number; // random starting theme; acts cycle in order from here
  lastSeamDist: number; // distance at which the last seam started (enforces MIN_ACT_GAP spacing)
  transition: Transition | null; // active act-change seam sweep (visual only)
  usage: number; // rate-limit meter 0..1; tokens fill it, time drains it
  usageGrace: number; // seconds left before the meter starts draining again (reset by each token)
  throttled: number; // seconds of "429" lockout remaining (tokens score nothing)
  comboTier: number; // highest combo tier already announced this streak (for toast triggers)
  wasHot: boolean; // was usage in the hot zone last step (edge-detect for the hot-zone toast)
  opus: number; // seconds of opus mode remaining (invincible + 2× tokens + speed burst)
  magnet: number; // seconds of "hotfix" magnet remaining (pulls nearby tokens)
  saidRight: boolean; // has the once-per-run "you're absolutely right!" fired
  deathCause: DeathCause;
  toast: Toast | null;
  player: Player;
  obstacles: Obstacle[];
  holes: Hole[];
  tokens: Token[];
  particles: Particle[];
  spawnTimer: number;
  shake: number;
  bgScroll: number;
  expression: Expression;
  calm: number; // seconds since anything was nearby (drives the bored face)
  input: Input;
  events: SfxEvent[]; // drained by the render loop each frame
  nextId: number;
}

// Vibe-coder one-liners that pop on earned moments (combo tiers, hot streaks, opus).
const VIBE_TOASTS = [
  "tokenmaxing", "vibing", "locked in", "cracked", "one-shotted", "no notes",
  "LGTM", "ship it", "context loaded", "in the zone", "chef's kiss", "big brain",
  "10x-ing", "prompt engineered", "flow state",
];
// Shown when a shield/life saves you or pops you out of a pit.
const CLOSE_CALLS = ["phew", "clutch", "try/catch caught it", "that was close", "recovered", "rolled back"];
// Shown on a near-miss hop (cleared a ground creature by a hair).
const NEAR_MISS_TOASTS = ["clutch!", "threaded it", "so close", "surgical", "no scope"];

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fire a transient toast (won't clobber a fresh higher-priority one already showing). */
function say(s: GameState, text: string, color: string, t = 1.4): void {
  s.toast = { text, color, t };
}

function makePlayer(): Player {
  return {
    x: C.PLAYER_X_START,
    y: C.GROUND_Y - C.PLAYER_H,
    vy: 0,
    onGround: true,
    ducking: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    wantCut: false,
    airJumps: 0,
    squash: 0,
    runPhase: 0,
    blink: 2.5,
  };
}

export function createGameState(): GameState {
  return {
    phase: "ready",
    time: 0,
    distance: 0,
    speed: C.BASE_SPEED,
    score: 0,
    highScore: loadHighScore(),
    newHigh: false,
    combo: 0,
    tokenTally: 0,
    lives: 0,
    shielded: false,
    invuln: 0,
    act: 0,
    actOffset: 0,
    lastSeamDist: -1e9,
    transition: null,
    usage: 0,
    usageGrace: 0,
    throttled: 0,
    comboTier: 0,
    wasHot: false,
    opus: 0,
    magnet: 0,
    saidRight: false,
    deathCause: "segfault",
    toast: null,
    player: makePlayer(),
    obstacles: [],
    holes: [],
    tokens: [],
    particles: [],
    spawnTimer: 1.1,
    shake: 0,
    bgScroll: 0,
    expression: "idle",
    calm: 0,
    input: { duck: false },
    events: [],
    nextId: 1,
  };
}

/** Reset run state but keep the persisted high score, then start playing. */
export function startGame(s: GameState): void {
  const high = s.highScore;
  const input = s.input;
  Object.assign(s, createGameState());
  s.highScore = high;
  s.input = input;
  s.phase = "playing";
  // start on a random theme; acts then cycle in order from there
  s.actOffset = Math.floor(Math.random() * C.THEMES.length);
  s.act = s.actOffset;
  s.events.push("start");
}

export function togglePause(s: GameState): void {
  if (s.phase === "playing") s.phase = "paused";
  else if (s.phase === "paused") s.phase = "playing";
}

/** Press of the jump key/tap. Doubles as start/restart depending on phase. */
export function onJumpDown(s: GameState): void {
  if (s.phase === "ready" || s.phase === "dead") {
    startGame(s);
    return;
  }
  if (s.phase === "paused") {
    s.phase = "playing";
    return;
  }
  s.player.jumpBuffer = C.JUMP_BUFFER;
  s.player.jumpHeld = true;
}

export function onJumpUp(s: GameState): void {
  s.player.jumpHeld = false;
  if (s.player.vy < 0) s.player.wantCut = true;
}

function spawn(s: GameState): void {
  const EDGE = C.VIRTUAL_W + 8;
  const b = C.BIOMES[s.act] ?? C.BIOMES[0]; // biome flavor for the current act
  // keep the two forced-response hazards apart: a hole under an overhang would be unsurvivable
  const overhangNear = s.obstacles.some((o) => o.type === "overhang" && o.x > C.VIRTUAL_W - 150);
  const holeNear = s.holes.some((h) => h.x > C.VIRTUAL_W - 150);
  let holeCenter: number | null = null;

  if (Math.random() < b.overheadBias) {
    // --- overhead lane: the flyer (jump OR duck), or a duck-only overhang ---
    if (s.distance > C.OVERHANG_MIN_DISTANCE && !holeNear && Math.random() < b.overhangShare) {
      s.obstacles.push({
        id: s.nextId++, type: "overhang", x: EDGE,
        y: C.OVERHANG_TOP, w: C.OVERHANG_W, h: C.OVERHANG_BOTTOM - C.OVERHANG_TOP,
      });
    } else {
      s.obstacles.push({
        id: s.nextId++, type: "flyer", x: EDGE,
        y: C.GROUND_Y - C.FLYER_GAP - C.FLYER_H, w: C.FLYER_W, h: C.FLYER_H,
      });
    }
  } else {
    // --- ground lane: a creature (jump over), or a hole to hop ---
    if (s.distance > C.HOLE_MIN_DISTANCE && !overhangNear && Math.random() < b.holeShare) {
      const w = C.HOLE_MIN_W + Math.floor(Math.random() * (C.HOLE_MAX_W - C.HOLE_MIN_W + 1));
      s.holes.push({ id: s.nextId++, x: EDGE, w });
      holeCenter = EDGE + w / 2;
    } else {
      const r = Math.random();
      let type: ObstacleType, w: number, hh: number;
      if (r < 0.45) { type = "skitter"; w = C.SKITTER_W; hh = C.SKITTER_H; }
      else if (r < 0.85) { type = "crawler"; w = C.CRAWLER_W; hh = C.CRAWLER_H; }
      else { type = "stacker"; w = C.STACKER_W; hh = C.STACKER_H; }
      s.obstacles.push({ id: s.nextId++, type, x: EDGE, y: C.GROUND_Y - hh, w, h: hh });
    }
  }

  // tokens: reward the hop by arcing a token line right over a hole; else a normal loose arc
  if (holeCenter !== null) {
    const count = 3;
    const startX = holeCenter - 16;
    const baseY = C.GROUND_Y - 40;
    for (let i = 0; i < count; i++) {
      s.tokens.push({
        id: s.nextId++, x: startX + i * 16,
        y: baseY - Math.sin((i / (count - 1)) * Math.PI) * 16,
        collected: false, kind: "token",
      });
    }
  } else if (Math.random() < b.tokenChance) {
    const count = 1 + Math.floor(Math.random() * 3);
    const baseY = C.GROUND_Y - 34 - Math.random() * 40;
    const startX = C.VIRTUAL_W + 40 + Math.random() * 30;
    for (let i = 0; i < count; i++) {
      s.tokens.push({
        id: s.nextId++,
        x: startX + i * 16,
        y: baseY - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 14,
        collected: false,
        kind: "token",
      });
    }
  }

  // rarely float a power-up in the HIGH lane — only a double jump can reach it
  if (Math.random() < b.powerupChance) {
    const roll = Math.random();
    // opus is the rarest, and only once the run is underway (early game stays vanilla)
    let kind: PickupKind;
    if (s.distance > C.OPUS_MIN_DISTANCE && roll < 0.06) kind = "opus";
    else if (roll < 0.5) kind = "gem";
    else if (roll < 0.72) kind = "shield";
    else if (roll < 0.88) kind = "magnet";
    else kind = "life";
    s.tokens.push({
      id: s.nextId++,
      x: C.VIRTUAL_W + 60 + Math.random() * 40,
      y: C.POWERUP_Y_MIN + Math.random() * (C.POWERUP_Y_MAX - C.POWERUP_Y_MIN),
      collected: false,
      kind,
    });
  }
}

export function playerRect(p: Player) {
  // ducking only happens on the ground; the crouched box sits flush on the floor
  if (p.ducking) {
    return { x: p.x, y: C.GROUND_Y - C.PLAYER_DUCK_H, w: C.PLAYER_W, h: C.PLAYER_DUCK_H };
  }
  // otherwise p.y is the true top edge (== floor when standing on ground)
  return { x: p.x, y: p.y, w: C.PLAYER_W, h: C.PLAYER_H };
}

function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function burst(s: GameState, x: number, y: number, color: string, n: number, power: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = power * (0.4 + Math.random() * 0.8);
    s.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.3,
      life: 0.5 + Math.random() * 0.4,
      max: 0.9,
      color,
    });
  }
}

function die(s: GameState): void {
  s.phase = "dead";
  s.shake = 1;
  s.expression = "dead";
  s.events.push("die");
  burst(s, s.player.x + C.PLAYER_W / 2, s.player.y + C.PLAYER_H / 2, C.COLORS.clawdBody, 18, 220);
  if (s.score > s.highScore) {
    s.highScore = s.score;
    s.newHigh = true;
    saveHighScore(s.highScore);
  }
}

/** Spend a shield, then a stored life. Returns true if the hit was absorbed (survived).
 *  A survived hit interrupts your flow — combo AND the usage meter both reset. */
function absorbHit(s: GameState): boolean {
  const cx = s.player.x + C.PLAYER_W / 2;
  const cy = s.player.y + C.PLAYER_H / 2;
  if (s.shielded) {
    s.shielded = false;
    s.combo = 0;
    s.comboTier = 0;
    s.usage = 0;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.7;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.shield, 16, 170);
    say(s, pick(CLOSE_CALLS), C.COLORS.shield, 1.2);
    return true;
  }
  if (s.lives > 0) {
    s.lives -= 1;
    s.combo = 0;
    s.comboTier = 0;
    s.usage = 0;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.8;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.clawdBody, 16, 190);
    say(s, pick(CLOSE_CALLS), C.COLORS.life, 1.2);
    return true;
  }
  return false;
}

/** An obstacle collision: absorb it (survive) or die with a cause chosen by what struck us. */
function hit(s: GameState, type: ObstacleType): boolean {
  if (absorbHit(s)) return false;
  s.deathCause = s.throttled > 0 ? "ratelimit" : type === "flyer" ? "hallucination" : "segfault";
  die(s);
  return true;
}

/** Advance the simulation by a fixed dt (seconds). Safe to call in any phase. */
export function step(s: GameState, dt: number): void {
  s.time += dt;

  // particles + shake animate in every phase
  for (const pt of s.particles) {
    pt.life -= dt;
    pt.vy += 700 * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  s.particles = s.particles.filter((p) => p.life > 0);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - C.SHAKE_DECAY * dt);

  const p = s.player;

  // idle blink animation when not actively playing
  p.blink -= dt;
  if (p.blink < 0) p.blink = 2 + Math.random() * 3;

  if (s.phase !== "playing") {
    // gentle idle: scroll the backdrop slowly so it never feels frozen
    s.bgScroll += (s.phase === "dead" ? 0 : 24) * dt;
    p.runPhase += dt * 6;
    p.squash *= Math.max(0, 1 - dt * 8);
    // on the ready/paused screen Clawd gets bored after a few seconds
    if (s.phase !== "dead") {
      s.calm += dt;
      s.expression = s.calm > C.BORED_AFTER ? "bored" : "idle";
    }
    return;
  }

  // --- difficulty ramp ---
  s.speed = Math.min(C.MAX_SPEED, C.BASE_SPEED + s.distance * C.SPEED_PER_PX);
  s.speed *= (C.BIOMES[s.act] ?? C.BIOMES[0]).speedMult; // per-biome flavor (mild)
  if (s.opus > 0) s.speed *= C.OPUS_SPEED_MULT; // opus burst can push past the normal cap
  s.distance += s.speed * dt;
  s.bgScroll += s.speed * dt;

  // --- session act: crossing an ACT_LENGTH boundary starts a seam sweep to the new palette ---
  const target = (s.actOffset + Math.floor(s.distance / C.ACT_LENGTH)) % C.THEMES.length;
  if (target !== s.act) {
    const from = s.act;
    s.act = target;
    // one seam at a time, and never two within MIN_ACT_GAP; otherwise just advance the palette quietly
    if (!s.transition && s.distance - s.lastSeamDist >= C.MIN_ACT_GAP) {
      s.transition = { from, seamX: C.VIRTUAL_W + 4 };
      s.lastSeamDist = s.distance;
      const th = C.THEMES[target];
      say(s, `» ${th.name} — ${(C.BIOMES[target] ?? C.BIOMES[0]).tag}`, th.accent1, 2.2);
      s.events.push("act");
    }
  }
  if (s.transition) {
    s.transition.seamX -= s.speed * dt * C.SEAM_SPEED_TRACK; // sweeps left at world speed
    if (s.transition.seamX < -8) s.transition = null;
  }

  // --- rate-limit meter + timed states ---
  if (s.usageGrace > 0) s.usageGrace = Math.max(0, s.usageGrace - dt);
  if (s.throttled > 0) s.throttled = Math.max(0, s.throttled - dt);
  else if (s.usageGrace <= 0) s.usage = Math.max(0, s.usage - C.USAGE_DECAY * dt); // drains once the grace lapses
  if (s.opus > 0) {
    const before = s.opus;
    s.opus = Math.max(0, s.opus - dt);
    if (before > 0 && s.opus === 0) {
      burst(s, s.player.x + C.PLAYER_W / 2, s.player.y + C.PLAYER_H / 2, C.COLORS.opus, 12, 150);
    }
  }
  if (s.magnet > 0) s.magnet = Math.max(0, s.magnet - dt);
  if (s.toast) {
    s.toast.t -= dt;
    if (s.toast.t <= 0) s.toast = null;
  }

  // Clawd holds a fixed x (no horizontal control); the world scrolls past him.

  // --- jump (buffer + coyote) ---
  p.coyote = p.onGround ? C.COYOTE_TIME : Math.max(0, p.coyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = C.JUMP_VELOCITY;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.squash = 1; // stretch up
    s.events.push("jump");
  } else if (p.jumpBuffer > 0 && !p.onGround && p.airJumps < C.MAX_AIR_JUMPS) {
    // double jump — a fresh upward boost mid-air (resets any fall velocity)
    p.vy = C.DOUBLE_JUMP_VELOCITY;
    p.airJumps += 1;
    p.jumpBuffer = 0;
    p.squash = 1;
    s.events.push("jump");
  }
  if (p.wantCut && p.vy < 0) {
    p.vy *= C.JUMP_CUT;
    p.wantCut = false;
  }

  // --- duck / fast-fall ---
  const wasDucking = p.ducking;
  p.ducking = s.input.duck && p.onGround;
  if (p.ducking && !wasDucking) s.events.push("duck");
  // down / swipe-down in the air = slam back to the ground fast (vital at high speed)
  const fastFalling = s.input.duck && !p.onGround;
  const fastFall = fastFalling ? C.FAST_FALL : 0;

  // --- gravity / vertical integrate ---
  const fallCap = fastFalling ? C.FAST_FALL_MAX : C.MAX_FALL;
  p.vy = Math.min(fallCap, p.vy + (C.GRAVITY + fastFall) * dt);
  p.y += p.vy * dt;
  const floor = C.GROUND_Y - C.PLAYER_H;
  // a gap in the floor under Clawd? (i-frames / opus let him ghost across it)
  const cxp = p.x + C.PLAYER_W / 2;
  const overHole = s.invuln <= 0 && s.opus <= 0 && s.holes.some((h) => h.x < cxp && h.x + h.w > cxp);
  if (p.y >= floor && !overHole) {
    if (!p.onGround) p.squash = -1; // squash on landing
    p.y = floor;
    p.vy = 0;
    p.onGround = true;
    p.airJumps = 0; // landing refreshes the double jump
  } else {
    p.onGround = false; // airborne, or dropping through a gap
  }
  // fell into the void — absorb it (pop back onto solid ground, blinking) or die
  if (p.y > C.PIT_DEATH_Y) {
    if (absorbHit(s)) {
      p.y = floor;
      p.vy = 0;
      p.onGround = true;
      p.airJumps = 0;
    } else {
      s.deathCause = "void";
      die(s);
      return;
    }
  }
  p.squash *= Math.max(0, 1 - dt * 9);
  p.runPhase += (p.onGround ? s.speed * 0.05 : 4) * dt;

  // --- spawning ---
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    spawn(s);
    const t = (s.speed - C.BASE_SPEED) / (C.MAX_SPEED - C.BASE_SPEED);
    const gap = C.SPAWN_BASE_GAP + (C.SPAWN_MIN_GAP - C.SPAWN_BASE_GAP) * t;
    s.spawnTimer = gap + Math.random() * C.SPAWN_JITTER;
  }

  // --- move world left, cull ---
  for (const o of s.obstacles) o.x -= s.speed * dt;
  for (const tk of s.tokens) tk.x -= s.speed * dt;
  for (const h of s.holes) h.x -= s.speed * dt;
  // "hotfix" magnet: pull nearby ground tokens toward Clawd while active
  if (s.magnet > 0) {
    const pcx = p.x + C.PLAYER_W / 2;
    const pcy = p.y + C.PLAYER_H / 2;
    const pullK = Math.min(1, C.MAGNET_PULL * dt);
    for (const tk of s.tokens) {
      if (tk.collected || tk.kind !== "token") continue;
      const dx = pcx - tk.x;
      const dy = pcy - tk.y;
      if (dx * dx + dy * dy < C.MAGNET_RANGE * C.MAGNET_RANGE) {
        tk.x += dx * pullK;
        tk.y += dy * pullK;
      }
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -8);
  s.tokens = s.tokens.filter((tk) => tk.x > -8 && !tk.collected);
  s.holes = s.holes.filter((h) => h.x + h.w > -8);

  // --- invulnerability frames decay ---
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);

  // --- collisions ---
  const pr = playerRect(p);
  let nearest = Infinity;
  for (const o of s.obstacles) {
    if (o.x > p.x) nearest = Math.min(nearest, o.x - (p.x + C.PLAYER_W));
    // near-miss "clutch": for ground creatures, track the tightest clearance as Clawd hops over,
    // then reward a hair's-breadth pass once the creature is safely behind him.
    const isGround = o.type === "skitter" || o.type === "crawler" || o.type === "stacker";
    if (isGround) {
      if (o.x < pr.x + pr.w && o.x + o.w > pr.x) {
        const gap = o.y - (pr.y + pr.h); // creature top minus Clawd's feet (positive => cleared above)
        if (gap >= 0) o.minGap = Math.min(o.minGap ?? Infinity, gap);
      } else if (!o.passed && o.x + o.w < pr.x) {
        o.passed = true;
        if (o.minGap !== undefined && o.minGap <= C.NEAR_MISS_GAP) {
          s.tokenTally += C.NEAR_MISS_BONUS;
          s.events.push("clutch");
          say(s, pick(NEAR_MISS_TOASTS), C.COLORS.token, 1.0);
          burst(s, pr.x + pr.w, pr.y, C.COLORS.token, 6, 90);
        }
      }
    }
    // opus mode phases straight through obstacles (invincible joyride)
    if (s.invuln <= 0 && s.opus <= 0 && aabb(pr.x + 1, pr.y + 1, pr.w - 2, pr.h - 2, o.x, o.y, o.w, o.h)) {
      if (hit(s, o.type)) return; // fatal
      break; // survived (shield/life) — i-frames are up now, stop checking this frame
    }
  }

  // --- pickups: ground tokens + high-lane power-ups ---
  for (const tk of s.tokens) {
    if (tk.collected) continue;
    const cx = pr.x + pr.w / 2;
    const cy = pr.y + pr.h / 2;
    const dx = cx - tk.x;
    const dy = cy - tk.y;
    const reach = (tk.kind === "token" ? C.TOKEN_R : C.PICKUP_R) + 11;
    if (dx * dx + dy * dy < reach * reach) {
      tk.collected = true;
      switch (tk.kind) {
        case "token": {
          if (s.throttled > 0) {
            // rate limited — the token is consumed but scores nothing (dud puff)
            s.events.push("token");
            burst(s, tk.x, tk.y, C.COLORS.dim, 6, 90);
            break;
          }
          s.combo = Math.min(C.COMBO_MAX, s.combo + 1);
          // earned-moment toasts: max combo = the once-per-run line; x3/x6 = a vibe one-liner
          if (s.combo >= C.COMBO_MAX && !s.saidRight) {
            s.saidRight = true;
            s.events.push("milestone");
            say(s, "you're absolutely right!", C.COLORS.token, 1.9);
          } else if ((s.combo === 3 || s.combo === 6) && s.combo > s.comboTier) {
            s.comboTier = s.combo;
            say(s, pick(VIBE_TOASTS), C.THEMES[s.act].accent2, 1.2);
          }
          const biome = C.BIOMES[s.act] ?? C.BIOMES[0];
          s.usage = Math.min(1, s.usage + C.USAGE_PER_TOKEN * biome.usageMult);
          s.usageGrace = C.USAGE_GRACE; // pause the drain so an active streak actually fills
          // "hot" meter pays a rising bonus; opus mode + biome multiplier stack on top
          const hotBonus =
            s.usage > C.USAGE_HOT
              ? 1 + ((s.usage - C.USAGE_HOT) / (1 - C.USAGE_HOT)) * C.USAGE_BONUS
              : 1;
          const opusMult = s.opus > 0 ? C.OPUS_TOKEN_MULT : 1;
          s.tokenTally += Math.round(C.TOKEN_POINTS * s.combo * hotBonus * opusMult * biome.tokenMult);
          s.events.push("token");
          burst(s, tk.x, tk.y, C.COLORS.token, 8, 130);
          // overfill → 429: wipe the combo + meter, lock scoring out for a beat
          if (s.usage >= 1) {
            s.throttled = C.THROTTLE_TIME;
            s.combo = 0;
            s.comboTier = 0;
            s.usage = 0;
            s.events.push("throttle");
            say(s, "429 · RATE LIMITED", C.COLORS.throttle, 1.6);
          }
          break;
        }
        case "gem":
          s.tokenTally += C.GEM_POINTS;
          s.events.push("powerup");
          s.toast = { text: `cache hit  +${C.GEM_POINTS}`, color: C.COLORS.gem, t: 1.4 };
          burst(s, tk.x, tk.y, C.COLORS.gem, 14, 170);
          break;
        case "shield":
          s.shielded = true;
          s.events.push("shield");
          s.toast = { text: "try / catch", color: C.COLORS.shield, t: 1.4 };
          burst(s, tk.x, tk.y, C.COLORS.shield, 14, 170);
          break;
        case "life":
          s.lives = Math.min(C.MAX_LIVES, s.lives + 1);
          s.events.push("life");
          s.toast = { text: "git commit  +1UP", color: C.COLORS.life, t: 1.4 };
          burst(s, tk.x, tk.y, C.COLORS.life, 14, 170);
          break;
        case "opus":
          s.opus = C.OPUS_TIME;
          s.events.push("opus");
          s.toast = { text: "▲ OPUS MODE", color: C.COLORS.opus, t: 2.0 };
          burst(s, tk.x, tk.y, C.COLORS.opus, 22, 210);
          break;
        case "magnet":
          s.magnet = C.MAGNET_TIME;
          s.events.push("powerup");
          s.toast = { text: "hotfix · magnet", color: C.COLORS.magnet, t: 1.4 };
          burst(s, tk.x, tk.y, C.COLORS.magnet, 14, 170);
          break;
      }
    }
  }

  // --- score = distance travelled + collected token points ---
  s.score = Math.floor(s.distance * C.SCORE_PER_PX) + s.tokenTally;

  // hot-zone entry gets its own vibe toast (edge-detected so it fires once per streak)
  const nowHot = s.throttled <= 0 && s.usage > C.USAGE_HOT;
  if (nowHot && !s.wasHot) say(s, "tokenmaxing", C.THEMES[s.act].accent2, 1.2);
  s.wasHot = nowHot;

  // --- expression ---
  // calm counts up while nothing's near; resets the moment danger shows up
  if (nearest < C.ALERT_RANGE * 2.2) s.calm = 0;
  else s.calm += dt;
  if (!p.onGround) s.expression = "focused"; // wide-eyed mid-air
  else if (nearest < C.ALERT_RANGE) s.expression = "alert"; // >  < squint
  else if (s.calm > C.BORED_AFTER) s.expression = "bored"; // -  -
  else s.expression = "idle";
}
