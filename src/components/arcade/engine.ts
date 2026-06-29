// Clawd Runner — pure game state + update step. No DOM, no rendering, no network.
// One instance per mounted game; nothing shared between tabs/users.
import * as C from "./constants";
import { loadHighScore, saveHighScore } from "./highScore";

export type Phase = "ready" | "playing" | "paused" | "dead";
export type Expression = "idle" | "focused" | "alert" | "bored" | "dead";
export type ObstacleType = "bug" | "err";

/** One-shot events the loop drains each frame to fire sound effects. */
export type SfxEvent = "jump" | "duck" | "token" | "die" | "start";

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number; // left edge
  y: number; // top edge
  w: number;
  h: number;
}

export interface Token {
  id: number;
  x: number;
  y: number;
  collected: boolean;
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
  player: Player;
  obstacles: Obstacle[];
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
    player: makePlayer(),
    obstacles: [],
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
  const errish = Math.random() < 0.5;
  if (errish) {
    // overhead ERR! banner — duck under it
    s.obstacles.push({
      id: s.nextId++,
      type: "err",
      x: C.VIRTUAL_W + 8,
      y: C.GROUND_Y - C.ERR_GAP - C.ERR_H,
      w: C.ERR_W,
      h: C.ERR_H,
    });
  } else {
    // ground bug — jump over it
    s.obstacles.push({
      id: s.nextId++,
      type: "bug",
      x: C.VIRTUAL_W + 8,
      y: C.GROUND_Y - C.BUG_H,
      w: C.BUG_W,
      h: C.BUG_H,
    });
  }
  // sometimes float a line of tokens in a reachable arc after the obstacle
  if (Math.random() < C.TOKEN_CHANCE) {
    const count = 1 + Math.floor(Math.random() * 3);
    const baseY = C.GROUND_Y - 34 - Math.random() * 40;
    const startX = C.VIRTUAL_W + 40 + Math.random() * 30;
    for (let i = 0; i < count; i++) {
      s.tokens.push({
        id: s.nextId++,
        x: startX + i * 16,
        y: baseY - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 14,
        collected: false,
      });
    }
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
  s.distance += s.speed * dt;
  s.bgScroll += s.speed * dt;

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
  if (p.y >= floor) {
    if (!p.onGround) p.squash = -1; // squash on landing
    p.y = floor;
    p.vy = 0;
    p.onGround = true;
    p.airJumps = 0; // landing refreshes the double jump
  } else {
    p.onGround = false;
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
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -8);
  s.tokens = s.tokens.filter((tk) => tk.x > -8 && !tk.collected);

  // --- collisions ---
  const pr = playerRect(p);
  let nearest = Infinity;
  for (const o of s.obstacles) {
    if (o.x > p.x) nearest = Math.min(nearest, o.x - (p.x + C.PLAYER_W));
    if (aabb(pr.x + 1, pr.y + 1, pr.w - 2, pr.h - 2, o.x, o.y, o.w, o.h)) {
      die(s);
      return;
    }
  }

  // --- token pickups ---
  for (const tk of s.tokens) {
    if (tk.collected) continue;
    const cx = pr.x + pr.w / 2;
    const cy = pr.y + pr.h / 2;
    const dx = cx - tk.x;
    const dy = cy - tk.y;
    if (dx * dx + dy * dy < (C.TOKEN_R + 11) * (C.TOKEN_R + 11)) {
      tk.collected = true;
      s.combo = Math.min(C.COMBO_MAX, s.combo + 1);
      s.tokenTally += C.TOKEN_POINTS * s.combo;
      s.events.push("token");
      burst(s, tk.x, tk.y, C.COLORS.token, 8, 130);
    }
  }

  // --- score = distance travelled + collected token points ---
  s.score = Math.floor(s.distance * C.SCORE_PER_PX) + s.tokenTally;

  // --- expression ---
  // calm counts up while nothing's near; resets the moment danger shows up
  if (nearest < C.ALERT_RANGE * 2.2) s.calm = 0;
  else s.calm += dt;
  if (!p.onGround) s.expression = "focused"; // wide-eyed mid-air
  else if (nearest < C.ALERT_RANGE) s.expression = "alert"; // >  < squint
  else if (s.calm > C.BORED_AFTER) s.expression = "bored"; // -  -
  else s.expression = "idle";
}
