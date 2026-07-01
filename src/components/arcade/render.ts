// Clawd Runner — renders game state to the low-res virtual canvas. Pure draw calls,
// no state mutation. The caller blits this canvas, integer-scaled, to the screen.
import * as C from "./constants";
import type { Theme } from "./constants";
import type { GameState, Obstacle, Token } from "./engine";
import { drawClawd } from "./clawdSprite";

type Ctx = CanvasRenderingContext2D;

/** The world palette for the current act. Clawd's own colors never come from here. */
function palette(s: GameState): Theme {
  return C.THEMES[s.act] ?? C.THEMES[0];
}

/** Turn a "#rrggbb" into an rgba() string at the given alpha (for atmospheric tints). */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Cheap deterministic hash → [0,1). Indexing by absolute world-cell number means each
// layer's field is generated fresh as it scrolls, so nothing visibly repeats: stars and
// buildings are placed per-cell, and the cell index climbs forever with bgScroll.
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

// Three back-to-front depth layers, all driven by s.bgScroll at different parallax rates:
// stars (farthest, slowest) → city skyline (mid) → ground ticks (nearest). Kept subtle so
// it sits behind the action and never competes with obstacles.
function drawBackground(ctx: Ctx, s: GameState, pal: Theme): void {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, C.VIRTUAL_W, C.VIRTUAL_H);

  const starBright = withAlpha(pal.star, 0.3);
  const starDim = withAlpha(pal.star, 0.16);

  // --- layer 1: stars (farthest, ~0.12×) — sparse dim pixels in the upper sky ---
  const starOff = s.bgScroll * 0.12;
  const cellW = 19;
  const skyH = C.GROUND_Y - 26;
  const rows = 4;
  const cols = Math.ceil(C.VIRTUAL_W / cellW) + 2;
  for (let row = 0; row < rows; row++) {
    for (let i = -1; i < cols; i++) {
      const cell = Math.floor(starOff / cellW) + i;
      if (hash(cell * 1.7 + row * 91.3) > 0.45) continue; // ~45% of cells get a star
      const jx = hash(cell * 3.3 + row * 7.1);
      const jy = hash(cell * 5.9 + row * 13.7);
      const px = Math.round(cell * cellW - starOff + jx * cellW);
      const py = Math.round(5 + row * (skyH / rows) + jy * (skyH / rows - 3));
      ctx.fillStyle = jy < 0.3 ? starBright : starDim;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // --- layer 2: city skyline (mid, ~0.4×) — flat silhouettes + a few lit windows ---
  const winRare = withAlpha(pal.accent2, 0.28); // the odd bright accent window
  const winCommon = withAlpha(pal.accent1, 0.3);
  const cityOff = s.bgScroll * 0.4;
  const slotW = 34;
  const slots = Math.ceil(C.VIRTUAL_W / slotW) + 2;
  for (let i = -1; i < slots; i++) {
    const slot = Math.floor(cityOff / slotW) + i;
    const bw = 16 + Math.floor(hash(slot * 2.1 + 0.5) * 16); // 16..32 wide
    const bh = 16 + Math.floor(hash(slot * 4.7 + 1.3) * 42); // 16..58 tall
    const bx = Math.round(slot * slotW - cityOff + (slotW - bw) * hash(slot * 6.1));
    const by = C.GROUND_Y - bh;
    ctx.fillStyle = pal.silhouette; // silhouette barely above the bg — atmospheric, low contrast
    ctx.fillRect(bx, by, bw, bh);
    // lit windows: sparse, dim, mostly the primary accent with the odd bright one
    for (let wy = by + 3; wy < C.GROUND_Y - 2; wy += 6) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 5) {
        const hw = hash(slot * 17.3 + wx * 2.7 + wy * 0.31);
        if (hw > 0.12) continue; // ~12% of windows lit
        ctx.fillStyle = hw < 0.025 ? winRare : winCommon;
        ctx.fillRect(wx, wy, 1, 2);
      }
    }
  }

  // ground
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, C.GROUND_Y, C.VIRTUAL_W, C.VIRTUAL_H - C.GROUND_Y);
  ctx.fillStyle = pal.groundLine;
  ctx.fillRect(0, C.GROUND_Y, C.VIRTUAL_W, 1);
  // scrolling ground ticks
  ctx.fillStyle = withAlpha(pal.accent1, 0.25);
  const goff = s.bgScroll % 16;
  for (let gx = -goff; gx < C.VIRTUAL_W; gx += 16) {
    ctx.fillRect(Math.round(gx), C.GROUND_Y + 4, 6, 1);
  }
}

function drawCrawler(ctx: Ctx, o: Obstacle, t: number, pal: Theme): void {
  const { x, y, w, h } = o;
  const wob = Math.sin(t * 14 + o.id) * 0.5;
  // legs
  ctx.fillStyle = pal.bugDark;
  for (let i = 0; i < 3; i++) {
    const ly = y + 5 + i * 3;
    ctx.fillRect(x - 2, Math.round(ly + wob), 3, 1);
    ctx.fillRect(x + w - 1, Math.round(ly - wob), 3, 1);
  }
  // body
  ctx.fillStyle = pal.bug;
  ctx.fillRect(x + 2, y + 3, w - 4, h - 4);
  ctx.fillRect(x + 1, y + 5, w - 2, h - 8);
  // shell split + spots
  ctx.fillStyle = pal.bugDark;
  ctx.fillRect(x + w / 2 - 0.5, y + 3, 1, h - 4);
  ctx.fillRect(x + 4, y + 7, 1, 1);
  ctx.fillRect(x + w - 5, y + 9, 1, 1);
  // antennae + eyes
  ctx.fillRect(x + 4, y, 1, 3);
  ctx.fillRect(x + w - 5, y, 1, 3);
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 4, y + 4, 1, 1);
  ctx.fillRect(x + w - 5, y + 4, 1, 1);
}

function drawSkitter(ctx: Ctx, o: Obstacle, t: number, pal: Theme): void {
  const { x, y, w, h } = o;
  const wob = Math.sin(t * 24 + o.id) * 0.6; // fast scuttle
  // six little legs
  ctx.fillStyle = pal.bugDark;
  for (let i = 0; i < 3; i++) {
    const lx = x + 2 + i * 4;
    ctx.fillRect(Math.round(lx), Math.round(y + h - 1 + wob), 1, 2);
    ctx.fillRect(Math.round(lx + 1), Math.round(y + h - 1 - wob), 1, 2);
  }
  // squat body
  ctx.fillStyle = pal.bug;
  ctx.fillRect(x + 1, y + 2, w - 2, h - 3);
  ctx.fillRect(x + 2, y + 1, w - 4, h - 1);
  // eyes
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 2, y + 3, 1, 1);
  ctx.fillRect(x + w - 3, y + 3, 1, 1);
}

function drawStacker(ctx: Ctx, o: Obstacle, t: number, pal: Theme): void {
  const { x, y, w, h } = o;
  const seg = 6; // height of one stacked block
  const n = Math.floor(h / seg);
  for (let i = 0; i < n; i++) {
    const by = y + i * seg;
    const lit = (Math.floor(t * 6) + i) % 4 === 0; // a glitch flicker climbing the tower
    ctx.fillStyle = pal.bugDark;
    ctx.fillRect(x, by, w, seg - 1);
    ctx.fillStyle = lit ? pal.bugLit : pal.bug;
    ctx.fillRect(x + 1, by + 1, w - 2, seg - 3);
  }
  // eyes near the top so it reads as a creature, not just a wall
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 3, y + 2, 2, 2);
  ctx.fillRect(x + w - 5, y + 2, 2, 2);
}

function drawFlyer(ctx: Ctx, o: Obstacle, t: number, pal: Theme): void {
  const { x, y, w } = o; // compact airborne creature; the logical box drives collision
  // the glitch recolors to each theme's bright accent so it stays legible on any bg
  const wing = pal.accent2;
  const bodyDark = pal.bugDark;
  const midX = x + w / 2;
  const bob = Math.round(Math.sin(t * 3 + o.id) * 2); // slow hover
  const flap = Math.round(Math.sin(t * 20 + o.id) * 2); // wing-beat
  // ground shadow — the key cue that it is airborne (shrinks as it bobs up)
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  const sw = 8 - bob;
  ctx.fillRect(Math.round(midX - sw / 2), C.GROUND_Y + 1, Math.max(2, Math.round(sw)), 2);
  const yv = y + bob; // visual top (collision still uses the logical, un-bobbed box)
  // wide flapping wings — the defining "flying" silhouette
  ctx.fillStyle = wing;
  ctx.fillRect(x - 6, yv + 4 + flap, 8, 3); // left wing
  ctx.fillRect(x + w - 2, yv + 4 - flap, 8, 3); // right wing
  // compact body
  ctx.fillStyle = bodyDark;
  ctx.fillRect(x + 6, yv + 2, w - 12, 11);
  ctx.fillStyle = wing;
  ctx.fillRect(x + 7, yv + 3, w - 14, 8);
  // glitch eyes
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(midX - 3, yv + 5, 2, 2);
  ctx.fillRect(midX + 1, yv + 5, 2, 2);
  // downward stinger telegraph (points down -> you can duck it)
  ctx.fillStyle = wing;
  const d = Math.floor(t * 10) % 2;
  ctx.fillRect(midX - 1, yv + 14 + d, 2, 2);
}

// A duck-only overhang: a block hung from the ceiling by a stem, hazard-striped underside.
function drawOverhang(ctx: Ctx, o: Obstacle, t: number, pal: Theme): void {
  const { x, y, w, h } = o;
  const midX = Math.round(x + w / 2);
  // stem up to the top of the sky, so it clearly reads as "hanging" (not floating)
  ctx.fillStyle = pal.bugDark;
  ctx.fillRect(midX - 1, 0, 2, y);
  // block body
  ctx.fillStyle = pal.bug;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pal.bugDark;
  ctx.fillRect(x, y, w, 2); // top cap shade
  // hazard stripes on the underside — the "duck!" tell
  ctx.fillStyle = pal.accent2;
  for (let sx = x + 1; sx < x + w - 2; sx += 4) ctx.fillRect(Math.round(sx), y + h - 2, 2, 1);
  // little downward teeth flickering on the bottom edge
  ctx.fillStyle = pal.bugLit;
  const d = Math.floor(t * 8) % 2;
  ctx.fillRect(midX - 3 + d, y + h, 1, 2);
  ctx.fillRect(midX + 2 - d, y + h, 1, 2);
}

// Punch gaps in the floor: fill the hole column with the sky color + a ledge lip on each side.
function drawHoles(ctx: Ctx, s: GameState, palAt: (x: number) => Theme): void {
  for (const h of s.holes) {
    const pal = palAt(h.x + h.w / 2);
    const hx = Math.round(h.x);
    const hw = Math.round(h.w);
    ctx.fillStyle = pal.bg; // erase ground + ground line across the gap
    ctx.fillRect(hx, C.GROUND_Y - 1, hw, C.VIRTUAL_H - C.GROUND_Y + 1);
    ctx.fillStyle = pal.groundLine; // lit ledge lips so the edges read
    ctx.fillRect(hx - 1, C.GROUND_Y, 1, 5);
    ctx.fillRect(hx + hw, C.GROUND_Y, 1, 5);
  }
}

function drawToken(ctx: Ctx, tk: Token, t: number): void {
  const yb = tk.y + Math.sin(t * 4 + tk.id) * 1.5;
  // glow
  ctx.fillStyle = C.COLORS.tokenGlow;
  ctx.beginPath();
  ctx.arc(tk.x, yb, C.TOKEN_R + 3, 0, Math.PI * 2);
  ctx.fill();
  // ring
  ctx.fillStyle = "rgba(70,210,122,0.25)";
  ctx.beginPath();
  ctx.arc(tk.x, yb, C.TOKEN_R, 0, Math.PI * 2);
  ctx.fill();
  // checkmark
  ctx.fillStyle = C.COLORS.token;
  const cm: Array<[number, number]> = [[-3, 0], [-2, 1], [-1, 2], [0, 1], [1, 0], [2, -1], [3, -2]];
  for (const [dx, dy] of cm) ctx.fillRect(Math.round(tk.x + dx), Math.round(yb + dy), 1, 1);
}

// pixel heart (centered on 0,0; ~7 wide)
const HEART: Array<[number, number]> = [
  [-2, -2], [-1, -2], [1, -2], [2, -2],
  [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
  [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
  [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
  [-1, 2], [0, 2], [1, 2],
  [0, 3],
];

/** High-lane power-ups: gem (points), shield, life. */
function drawPickup(ctx: Ctx, tk: Token, t: number): void {
  const yb = tk.y + Math.sin(t * 4 + tk.id) * 1.5;
  if (tk.kind === "gem") {
    ctx.fillStyle = C.COLORS.gemGlow;
    ctx.beginPath();
    ctx.arc(tk.x, yb, C.PICKUP_R + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.COLORS.gem; // diamond
    ctx.beginPath();
    ctx.moveTo(tk.x, yb - C.PICKUP_R);
    ctx.lineTo(tk.x + C.PICKUP_R * 0.8, yb);
    ctx.lineTo(tk.x, yb + C.PICKUP_R);
    ctx.lineTo(tk.x - C.PICKUP_R * 0.8, yb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; // facet glint
    ctx.fillRect(Math.round(tk.x - 1), Math.round(yb - 3), 1, 3);
  } else if (tk.kind === "shield") {
    const pr = C.PICKUP_R + Math.sin(t * 6 + tk.id) * 0.6;
    ctx.fillStyle = C.COLORS.shieldGlow;
    ctx.beginPath();
    ctx.arc(tk.x, yb, pr + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.COLORS.shield;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tk.x, yb, pr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.COLORS.shield; // emblem "+"
    ctx.fillRect(Math.round(tk.x), Math.round(yb - 2), 1, 5);
    ctx.fillRect(Math.round(tk.x - 2), Math.round(yb), 5, 1);
  } else if (tk.kind === "life") {
    ctx.fillStyle = "rgba(255,90,122,0.3)";
    ctx.beginPath();
    ctx.arc(tk.x, yb, C.PICKUP_R + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.COLORS.life;
    for (const [dx, dy] of HEART) ctx.fillRect(Math.round(tk.x + dx), Math.round(yb + dy - 1), 1, 1);
  } else {
    // opus: a pulsing terracotta-gold up-chevron (the "model upgrade" star)
    const pr = C.PICKUP_R + 1 + Math.sin(t * 7 + tk.id) * 0.8;
    ctx.fillStyle = C.COLORS.opusGlow;
    ctx.beginPath();
    ctx.arc(tk.x, yb, pr + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.COLORS.opus; // bold upward chevron ▲
    const chev: Array<[number, number]> = [
      [0, -4], [-1, -3], [1, -3], [-2, -2], [2, -2],
      [-3, -1], [-1, -1], [1, -1], [3, -1], [-4, 0], [4, 0],
    ];
    for (const [dx, dy] of chev) ctx.fillRect(Math.round(tk.x + dx), Math.round(yb + dy), 1, 1);
  }
}

// small HUD heart (~5 wide), top-left at (x,y)
const MINI_HEART: Array<[number, number]> = [
  [0, 0], [2, 0],
  [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1],
  [0, 2], [1, 2], [2, 2],
  [1, 3],
];
function drawMiniHeart(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = C.COLORS.life;
  for (const [dx, dy] of MINI_HEART) ctx.fillRect(x + dx, y + dy, 1, 1);
}

function drawParticles(ctx: Ctx, s: GameState): void {
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawHUDPixels(ctx: Ctx, s: GameState, pal: Theme): void {
  // lives (hearts) + shield pip; the score/HI/combo TEXT is drawn separately at native res
  for (let i = 0; i < s.lives; i++) drawMiniHeart(ctx, 7 + i * 8, 17);
  if (s.shielded) {
    ctx.strokeStyle = C.COLORS.shield;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8 + s.lives * 8 + 2, 19, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- usage / rate-limit meter (only while playing): fills as you grab tokens,
  // glows token-green in the bonus "hot" zone, flashes red at the 429 cap ---
  if (s.phase === "playing") {
    const bw = 52;
    const bx = Math.round((C.VIRTUAL_W - bw) / 2);
    const by = 20;
    ctx.fillStyle = "rgba(255,255,255,0.08)"; // track
    ctx.fillRect(bx, by, bw, 3);
    if (s.throttled > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(s.time * 22);
      ctx.fillStyle = withAlpha(C.COLORS.throttle, pulse);
      ctx.fillRect(bx, by, bw, 3); // full bar flashing "429"
    } else {
      const hot = s.usage > C.USAGE_HOT;
      ctx.fillStyle = hot ? C.COLORS.token : pal.accent1;
      ctx.fillRect(bx, by, Math.round(bw * s.usage), 3);
      if (hot) {
        // a bright cap pip riding the hot fill, to sell the bonus
        ctx.fillStyle = C.COLORS.tokenGlow;
        ctx.fillRect(bx + Math.round(bw * C.USAGE_HOT), by - 1, 1, 5);
      }
    }
  }
}

type PanelLine = { s: string; size: number; color: string; dy: number };

function panelLines(s: GameState, pal: Theme): PanelLine[] | null {
  if (s.phase === "ready") {
    return [
      { s: "CLAWD RUNNER", size: 18, color: pal.accent1, dy: -46 },
      { s: "debugging dash", size: 9, color: pal.accent2, dy: -30 },
      { s: "SPACE / TAP  to start", size: 10, color: C.COLORS.text, dy: -8 },
      { s: "↑ JUMP (×2 mid-air)    ↓ DUCK", size: 7, color: C.COLORS.dim, dy: 14 },
      { s: "M music    S sound    ESC pause", size: 7, color: C.COLORS.dim, dy: 26 },
      { s: "mobile:  tap jump · hold ▲ higher · swipe ↓ drop", size: 7, color: C.COLORS.dim, dy: 38 },
    ];
  }
  if (s.phase === "paused") {
    return [
      { s: "PAUSED", size: 18, color: pal.accent1, dy: -24 },
      { s: "SPACE / ESC to resume", size: 9, color: C.COLORS.text, dy: 0 },
      { s: "↑ jump (×2)   ↓ duck", size: 7, color: C.COLORS.dim, dy: 20 },
      { s: "M music   S sound", size: 7, color: C.COLORS.dim, dy: 32 },
    ];
  }
  if (s.phase === "dead") {
    // the title + subtitle depend on what killed the run
    const title =
      s.deathCause === "hallucination" ? "HALLUCINATION"
        : s.deathCause === "ratelimit" ? "429"
          : s.deathCause === "void" ? "NULL POINTER"
            : "SEGFAULT";
    const sub =
      s.deathCause === "hallucination" ? "unhandled exception"
        : s.deathCause === "ratelimit" ? "connection reset"
          : s.deathCause === "void" ? "fell out of scope"
            : "core dumped";
    return [
      { s: title, size: 18, color: C.COLORS.throttle, dy: -36 },
      { s: sub, size: 8, color: C.COLORS.dim, dy: -19 },
      { s: `score ${s.score}`, size: 11, color: C.COLORS.text, dy: 0 },
      { s: s.newHigh ? "★ NEW HIGH SCORE ★" : `high ${s.highScore}`, size: 9, color: s.newHigh ? C.COLORS.token : C.COLORS.dim, dy: 17 },
      { s: "SPACE / TAP / R to retry", size: 9, color: pal.accent1, dy: 37 },
    ];
  }
  return null;
}

/** Draw the pixel-art world to the low-res buffer. TEXT is drawn separately (renderText), at
 *  native resolution, so it stays sharp instead of being magnified from this small buffer. */
export function render(ctx: Ctx, s: GameState): void {
  const t = s.time;
  // during an act transition, the world is split at a scrolling seam: new palette to the
  // right (the area you're entering), old palette to the left. palAt() resolves per-x.
  const tr = s.transition;
  const newPal = palette(s);
  const oldPal = tr ? (C.THEMES[tr.from] ?? newPal) : newPal;
  const seamX = tr ? tr.seamX : -Infinity;
  const palAt = (x: number): Theme => (x > seamX ? newPal : oldPal);

  ctx.save();
  if (s.shake > 0) {
    const m = s.shake * 4;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  // background: full frame in the left palette, then redraw the right of the seam in the new one
  drawBackground(ctx, s, oldPal);
  if (tr) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(seamX, 0, C.VIRTUAL_W - seamX, C.VIRTUAL_H);
    ctx.clip();
    drawBackground(ctx, s, newPal);
    ctx.restore();
  }
  drawHoles(ctx, s, palAt);
  // the seam itself — one crisp line with a soft glow only on the trailing (already-entered)
  // side, so it reads unambiguously as a single moving gate (no symmetric band that looks doubled)
  if (tr) {
    const sx = Math.round(seamX);
    ctx.fillStyle = withAlpha(newPal.accent2, 0.16);
    ctx.fillRect(sx - 3, 0, 3, C.VIRTUAL_H); // subtle trailing glow, left only
    ctx.fillStyle = newPal.accent2;
    ctx.fillRect(sx - 1, 0, 2, C.VIRTUAL_H); // bright bar
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(sx - 1, 0, 1, C.VIRTUAL_H); // white leading edge
  }
  for (const o of s.obstacles) {
    const op = palAt(o.x + o.w / 2);
    if (o.type === "flyer") drawFlyer(ctx, o, t, op);
    else if (o.type === "overhang") drawOverhang(ctx, o, t, op);
    else if (o.type === "skitter") drawSkitter(ctx, o, t, op);
    else if (o.type === "stacker") drawStacker(ctx, o, t, op);
    else drawCrawler(ctx, o, t, op);
  }
  for (const tk of s.tokens) {
    if (tk.collected) continue;
    if (tk.kind === "token") drawToken(ctx, tk, t);
    else drawPickup(ctx, tk, t);
  }
  const p = s.player;
  // opus mode: a pulsing terracotta-gold aura around Clawd (invincible joyride)
  if (s.opus > 0) {
    const gx = p.x + C.PLAYER_W / 2;
    const gy = p.y + C.PLAYER_H / 2;
    const rr = 15 + Math.sin(t * 12) * 2;
    ctx.fillStyle = C.COLORS.opusGlow;
    ctx.beginPath();
    ctx.arc(gx, gy, rr + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.COLORS.opus;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gx, gy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (s.shielded) {
    const sbx = p.x + C.PLAYER_W / 2;
    const sby = p.y + C.PLAYER_H / 2;
    const rr = 15 + Math.sin(t * 6) * 1;
    ctx.fillStyle = C.COLORS.shieldGlow;
    ctx.beginPath();
    ctx.arc(sbx, sby, rr + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.COLORS.shield;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sbx, sby, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  const flicker = s.invuln > 0 && Math.floor(t * 18) % 2 === 0;
  if (!flicker) {
    drawClawd(ctx, p.x, p.y, {
      expression: s.expression,
      runPhase: p.runPhase,
      squash: p.squash,
      ducking: p.ducking,
      airborne: !p.onGround,
      blinking: p.blink < 0.12,
    });
  }
  drawParticles(ctx, s);
  ctx.restore();

  // HUD pixel bits + scanlines + the dim panel backdrop (drawn straight, no shake)
  drawHUDPixels(ctx, s, newPal);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < C.VIRTUAL_H; y += 2) ctx.fillRect(0, y, C.VIRTUAL_W, 1);

  // 429 lockout: pulsing red screen-edge vignette
  if (s.throttled > 0) {
    const a = 0.14 + 0.08 * Math.sin(t * 20);
    ctx.fillStyle = withAlpha(C.COLORS.throttle, a);
    ctx.fillRect(0, 0, C.VIRTUAL_W, 3);
    ctx.fillRect(0, C.VIRTUAL_H - 3, C.VIRTUAL_W, 3);
    ctx.fillRect(0, 0, 3, C.VIRTUAL_H);
    ctx.fillRect(C.VIRTUAL_W - 3, 0, 3, C.VIRTUAL_H);
  }

  if (panelLines(s, newPal)) {
    ctx.fillStyle = withAlpha(newPal.bg, 0.82);
    ctx.fillRect(0, 0, C.VIRTUAL_W, C.VIRTUAL_H);
  }
}

/** Draw HUD + panel TEXT on the display canvas at native resolution (crisp). (vx,vy,vsize) are in
 *  virtual-canvas units; scale/ox/oy map them onto the blitted pixel-art. */
export function renderText(
  ctx: Ctx, s: GameState, scale: number, ox: number, oy: number,
): void {
  const vtext = (
    str: string, vx: number, vy: number, vsize: number, color: string,
    align: CanvasTextAlign = "left",
  ) => {
    ctx.font = `${vsize * scale}px 'JetBrains Mono', ui-monospace, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(str, ox + vx * scale, oy + vy * scale);
  };
  const pal = palette(s);
  vtext(`${s.score}`.padStart(5, "0"), 6, 10, 10, C.COLORS.text, "left");
  vtext(`HI ${s.highScore}`, C.VIRTUAL_W - 6, 10, 8, C.COLORS.dim, "right");
  if (s.combo > 1 && s.phase === "playing") {
    vtext(`x${s.combo}`, C.VIRTUAL_W / 2, 12, 9, C.COLORS.token, "center");
  }
  // transient toast (act name / power-up label / 429 / milestone), fading out at the end
  if (s.toast && s.phase === "playing") {
    const alpha = Math.max(0, Math.min(1, s.toast.t / 0.4));
    ctx.globalAlpha = alpha;
    vtext(s.toast.text, C.VIRTUAL_W / 2, 40, 9, s.toast.color, "center");
    ctx.globalAlpha = 1;
  }
  const lines = panelLines(s, pal);
  if (lines) {
    const cx = C.VIRTUAL_W / 2;
    const cy = C.VIRTUAL_H / 2;
    for (const l of lines) vtext(l.s, cx, cy + l.dy, l.size, l.color, "center");
  }
}
