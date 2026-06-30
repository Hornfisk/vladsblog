// Clawd Runner — renders game state to the low-res virtual canvas. Pure draw calls,
// no state mutation. The caller blits this canvas, integer-scaled, to the screen.
import * as C from "./constants";
import type { GameState, Obstacle, Token } from "./engine";
import { drawClawd } from "./clawdSprite";

type Ctx = CanvasRenderingContext2D;

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
function drawBackground(ctx: Ctx, s: GameState): void {
  ctx.fillStyle = C.COLORS.bg;
  ctx.fillRect(0, 0, C.VIRTUAL_W, C.VIRTUAL_H);

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
      ctx.fillStyle = jy < 0.3 ? "rgba(203,213,255,0.30)" : "rgba(190,196,224,0.16)";
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // --- layer 2: city skyline (mid, ~0.4×) — flat silhouettes + a few lit windows ---
  const cityOff = s.bgScroll * 0.4;
  const slotW = 34;
  const slots = Math.ceil(C.VIRTUAL_W / slotW) + 2;
  for (let i = -1; i < slots; i++) {
    const slot = Math.floor(cityOff / slotW) + i;
    const bw = 16 + Math.floor(hash(slot * 2.1 + 0.5) * 16); // 16..32 wide
    const bh = 16 + Math.floor(hash(slot * 4.7 + 1.3) * 42); // 16..58 tall
    const bx = Math.round(slot * slotW - cityOff + (slotW - bw) * hash(slot * 6.1));
    const by = C.GROUND_Y - bh;
    ctx.fillStyle = "#1b1e2c"; // silhouette barely above the bg — atmospheric, low contrast
    ctx.fillRect(bx, by, bw, bh);
    // lit windows: sparse, dim, mostly purple with the odd magenta
    for (let wy = by + 3; wy < C.GROUND_Y - 2; wy += 6) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 5) {
        const hw = hash(slot * 17.3 + wx * 2.7 + wy * 0.31);
        if (hw > 0.12) continue; // ~12% of windows lit
        ctx.fillStyle = hw < 0.025 ? "rgba(217,70,239,0.28)" : "rgba(155,135,245,0.30)";
        ctx.fillRect(wx, wy, 1, 2);
      }
    }
  }

  // ground
  ctx.fillStyle = C.COLORS.ground;
  ctx.fillRect(0, C.GROUND_Y, C.VIRTUAL_W, C.VIRTUAL_H - C.GROUND_Y);
  ctx.fillStyle = C.COLORS.groundLine;
  ctx.fillRect(0, C.GROUND_Y, C.VIRTUAL_W, 1);
  // scrolling ground ticks
  ctx.fillStyle = "rgba(155,135,245,0.25)";
  const goff = s.bgScroll % 16;
  for (let gx = -goff; gx < C.VIRTUAL_W; gx += 16) {
    ctx.fillRect(Math.round(gx), C.GROUND_Y + 4, 6, 1);
  }
}

function drawCrawler(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w, h } = o;
  const wob = Math.sin(t * 14 + o.id) * 0.5;
  // legs
  ctx.fillStyle = C.COLORS.bugDark;
  for (let i = 0; i < 3; i++) {
    const ly = y + 5 + i * 3;
    ctx.fillRect(x - 2, Math.round(ly + wob), 3, 1);
    ctx.fillRect(x + w - 1, Math.round(ly - wob), 3, 1);
  }
  // body
  ctx.fillStyle = C.COLORS.bug;
  ctx.fillRect(x + 2, y + 3, w - 4, h - 4);
  ctx.fillRect(x + 1, y + 5, w - 2, h - 8);
  // shell split + spots
  ctx.fillStyle = C.COLORS.bugDark;
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

function drawSkitter(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w, h } = o;
  const wob = Math.sin(t * 24 + o.id) * 0.6; // fast scuttle
  // six little legs
  ctx.fillStyle = C.COLORS.bugDark;
  for (let i = 0; i < 3; i++) {
    const lx = x + 2 + i * 4;
    ctx.fillRect(Math.round(lx), Math.round(y + h - 1 + wob), 1, 2);
    ctx.fillRect(Math.round(lx + 1), Math.round(y + h - 1 - wob), 1, 2);
  }
  // squat body
  ctx.fillStyle = C.COLORS.bug;
  ctx.fillRect(x + 1, y + 2, w - 2, h - 3);
  ctx.fillRect(x + 2, y + 1, w - 4, h - 1);
  // eyes
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 2, y + 3, 1, 1);
  ctx.fillRect(x + w - 3, y + 3, 1, 1);
}

function drawStacker(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w, h } = o;
  const seg = 6; // height of one stacked block
  const n = Math.floor(h / seg);
  for (let i = 0; i < n; i++) {
    const by = y + i * seg;
    const lit = (Math.floor(t * 6) + i) % 4 === 0; // a glitch flicker climbing the tower
    ctx.fillStyle = C.COLORS.bugDark;
    ctx.fillRect(x, by, w, seg - 1);
    ctx.fillStyle = lit ? C.COLORS.bugLit : C.COLORS.bug;
    ctx.fillRect(x + 1, by + 1, w - 2, seg - 3);
  }
  // eyes near the top so it reads as a creature, not just a wall
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 3, y + 2, 2, 2);
  ctx.fillRect(x + w - 5, y + 2, 2, 2);
}

function drawFlyer(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w } = o; // compact airborne creature; the logical box drives collision
  const midX = x + w / 2;
  const bob = Math.round(Math.sin(t * 3 + o.id) * 2); // slow hover
  const flap = Math.round(Math.sin(t * 20 + o.id) * 2); // wing-beat
  // ground shadow — the key cue that it is airborne (shrinks as it bobs up)
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  const sw = 8 - bob;
  ctx.fillRect(Math.round(midX - sw / 2), C.GROUND_Y + 1, Math.max(2, Math.round(sw)), 2);
  const yv = y + bob; // visual top (collision still uses the logical, un-bobbed box)
  // wide flapping wings — the defining "flying" silhouette
  ctx.fillStyle = C.COLORS.flyer;
  ctx.fillRect(x - 6, yv + 4 + flap, 8, 3); // left wing
  ctx.fillRect(x + w - 2, yv + 4 - flap, 8, 3); // right wing
  // compact body
  ctx.fillStyle = C.COLORS.flyerDark;
  ctx.fillRect(x + 6, yv + 2, w - 12, 11);
  ctx.fillStyle = C.COLORS.flyer;
  ctx.fillRect(x + 7, yv + 3, w - 14, 8);
  // glitch eyes
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(midX - 3, yv + 5, 2, 2);
  ctx.fillRect(midX + 1, yv + 5, 2, 2);
  // downward stinger telegraph (points down -> you can duck it)
  ctx.fillStyle = C.COLORS.flyer;
  const d = Math.floor(t * 10) % 2;
  ctx.fillRect(midX - 1, yv + 14 + d, 2, 2);
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
  } else {
    ctx.fillStyle = "rgba(255,90,122,0.3)";
    ctx.beginPath();
    ctx.arc(tk.x, yb, C.PICKUP_R + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.COLORS.life;
    for (const [dx, dy] of HEART) ctx.fillRect(Math.round(tk.x + dx), Math.round(yb + dy - 1), 1, 1);
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

function drawHUDPixels(ctx: Ctx, s: GameState): void {
  // lives (hearts) + shield pip; the score/HI/combo TEXT is drawn separately at native res
  for (let i = 0; i < s.lives; i++) drawMiniHeart(ctx, 7 + i * 8, 17);
  if (s.shielded) {
    ctx.strokeStyle = C.COLORS.shield;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8 + s.lives * 8 + 2, 19, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

type PanelLine = { s: string; size: number; color: string; dy: number };

function panelLines(s: GameState): PanelLine[] | null {
  if (s.phase === "ready") {
    return [
      { s: "CLAWD RUNNER", size: 18, color: C.COLORS.accent1, dy: -46 },
      { s: "debugging dash", size: 9, color: C.COLORS.accent2, dy: -30 },
      { s: "SPACE / TAP  to start", size: 10, color: C.COLORS.text, dy: -8 },
      { s: "↑ JUMP (×2 mid-air)    ↓ DUCK", size: 7, color: C.COLORS.dim, dy: 14 },
      { s: "M music    S sound    ESC pause", size: 7, color: C.COLORS.dim, dy: 26 },
      { s: "mobile:  tap jump · hold ▲ higher · swipe ↓ drop", size: 7, color: C.COLORS.dim, dy: 38 },
    ];
  }
  if (s.phase === "paused") {
    return [
      { s: "PAUSED", size: 18, color: C.COLORS.accent1, dy: -24 },
      { s: "SPACE / ESC to resume", size: 9, color: C.COLORS.text, dy: 0 },
      { s: "↑ jump (×2)   ↓ duck", size: 7, color: C.COLORS.dim, dy: 20 },
      { s: "M music   S sound", size: 7, color: C.COLORS.dim, dy: 32 },
    ];
  }
  if (s.phase === "dead") {
    return [
      { s: "SEGFAULT", size: 18, color: C.COLORS.accent2, dy: -30 },
      { s: `score ${s.score}`, size: 11, color: C.COLORS.text, dy: -6 },
      { s: s.newHigh ? "★ NEW HIGH SCORE ★" : `high ${s.highScore}`, size: 9, color: s.newHigh ? C.COLORS.token : C.COLORS.dim, dy: 12 },
      { s: "SPACE / TAP / R to retry", size: 9, color: C.COLORS.accent1, dy: 34 },
    ];
  }
  return null;
}

/** Draw the pixel-art world to the low-res buffer. TEXT is drawn separately (renderText), at
 *  native resolution, so it stays sharp instead of being magnified from this small buffer. */
export function render(ctx: Ctx, s: GameState): void {
  const t = s.time;
  ctx.save();
  if (s.shake > 0) {
    const m = s.shake * 4;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawBackground(ctx, s);
  for (const o of s.obstacles) {
    if (o.type === "flyer") drawFlyer(ctx, o, t);
    else if (o.type === "skitter") drawSkitter(ctx, o, t);
    else if (o.type === "stacker") drawStacker(ctx, o, t);
    else drawCrawler(ctx, o, t);
  }
  for (const tk of s.tokens) {
    if (tk.collected) continue;
    if (tk.kind === "token") drawToken(ctx, tk, t);
    else drawPickup(ctx, tk, t);
  }
  const p = s.player;
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
  drawHUDPixels(ctx, s);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < C.VIRTUAL_H; y += 2) ctx.fillRect(0, y, C.VIRTUAL_W, 1);
  if (panelLines(s)) {
    ctx.fillStyle = "rgba(21,24,33,0.82)";
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
  vtext(`${s.score}`.padStart(5, "0"), 6, 10, 10, C.COLORS.text, "left");
  vtext(`HI ${s.highScore}`, C.VIRTUAL_W - 6, 10, 8, C.COLORS.dim, "right");
  if (s.combo > 1 && s.phase === "playing") {
    vtext(`x${s.combo}`, C.VIRTUAL_W / 2, 12, 9, C.COLORS.token, "center");
  }
  const lines = panelLines(s);
  if (lines) {
    const cx = C.VIRTUAL_W / 2;
    const cy = C.VIRTUAL_H / 2;
    for (const l of lines) vtext(l.s, cx, cy + l.dy, l.size, l.color, "center");
  }
}
