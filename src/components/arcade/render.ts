// Clawd Runner — renders game state to the low-res virtual canvas. Pure draw calls,
// no state mutation. The caller blits this canvas, integer-scaled, to the screen.
import * as C from "./constants";
import type { GameState, Obstacle, Token } from "./engine";
import { drawClawd } from "./clawdSprite";

type Ctx = CanvasRenderingContext2D;

function text(
  ctx: Ctx, str: string, x: number, y: number, size: number, color: string,
  align: CanvasTextAlign = "left",
): void {
  ctx.font = `${size}px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawBackground(ctx: Ctx, s: GameState): void {
  ctx.fillStyle = C.COLORS.bg;
  ctx.fillRect(0, 0, C.VIRTUAL_W, C.VIRTUAL_H);

  // parallax dot grid (matches the site's backdrop)
  const step = 28;
  const off = (s.bgScroll * 0.4) % step;
  ctx.fillStyle = C.COLORS.grid;
  for (let gx = -off; gx < C.VIRTUAL_W; gx += step) {
    for (let gy = 0; gy < C.GROUND_Y; gy += step) {
      ctx.fillRect(Math.round(gx), gy, 1, 1);
    }
  }

  // faint parallax skyline streaks
  ctx.fillStyle = "rgba(217,70,239,0.05)";
  const s2 = (s.bgScroll * 0.7) % 120;
  for (let i = -1; i < 4; i++) {
    const bx = i * 120 - s2;
    ctx.fillRect(Math.round(bx), C.GROUND_Y - 40, 60, 40);
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

function drawBug(ctx: Ctx, o: Obstacle, t: number): void {
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

function drawErr(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w, h } = o;
  const flick = Math.sin(t * 30 + o.id) > -0.6 ? 1 : 0.55;
  ctx.globalAlpha = flick;
  ctx.fillStyle = C.COLORS.errDark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = C.COLORS.err;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  text(ctx, "ERR!", x + w / 2, y + h / 2, 8, "#1a1420", "center");
  // danger drips pointing down (duck!)
  ctx.fillStyle = C.COLORS.err;
  const d = Math.floor(t * 8) % 2;
  ctx.fillRect(x + 4, y + h + 1 + d, 1, 2);
  ctx.fillRect(x + w - 5, y + h + 1 + (1 - d), 1, 2);
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

function drawParticles(ctx: Ctx, s: GameState): void {
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx: Ctx, s: GameState): void {
  text(ctx, `${s.score}`.padStart(5, "0"), 6, 10, 10, C.COLORS.text, "left");
  text(ctx, `HI ${s.highScore}`.padEnd(0), C.VIRTUAL_W - 6, 10, 8, C.COLORS.dim, "right");
  if (s.combo > 1 && s.phase === "playing") {
    text(ctx, `x${s.combo}`, C.VIRTUAL_W / 2, 12, 9, C.COLORS.token, "center");
  }
}

function panel(ctx: Ctx, lines: Array<{ s: string; size: number; color: string; dy: number }>): void {
  ctx.fillStyle = "rgba(21,24,33,0.78)";
  ctx.fillRect(0, 0, C.VIRTUAL_W, C.VIRTUAL_H);
  const cx = C.VIRTUAL_W / 2;
  const cy = C.VIRTUAL_H / 2;
  for (const l of lines) text(ctx, l.s, cx, cy + l.dy, l.size, l.color, "center");
}

export function render(ctx: Ctx, s: GameState): void {
  ctx.save();
  if (s.shake > 0) {
    const m = s.shake * 4;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  drawBackground(ctx, s);

  const t = s.time;
  for (const o of s.obstacles) {
    if (o.type === "bug") drawBug(ctx, o, t);
    else drawErr(ctx, o, t);
  }
  for (const tk of s.tokens) if (!tk.collected) drawToken(ctx, tk, t);

  // Clawd
  const p = s.player;
  drawClawd(ctx, p.x, p.y, {
    expression: s.expression,
    runPhase: p.runPhase,
    squash: p.squash,
    ducking: p.ducking,
    airborne: !p.onGround,
    blinking: p.blink < 0.12,
  });

  drawParticles(ctx, s);
  drawHUD(ctx, s);

  // scanlines
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < C.VIRTUAL_H; y += 2) ctx.fillRect(0, y, C.VIRTUAL_W, 1);

  // overlays
  if (s.phase === "ready") {
    panel(ctx, [
      { s: "CLAWD RUNNER", size: 18, color: C.COLORS.accent1, dy: -28 },
      { s: "debugging dash", size: 9, color: C.COLORS.accent2, dy: -10 },
      { s: "SPACE / TAP to start", size: 10, color: C.COLORS.text, dy: 18 },
      { s: "↑ / swipe up = JUMP    ↓ / swipe down = DUCK", size: 7, color: C.COLORS.dim, dy: 38 },
    ]);
  } else if (s.phase === "paused") {
    panel(ctx, [
      { s: "PAUSED", size: 18, color: C.COLORS.accent1, dy: -20 },
      { s: "SPACE / ESC to resume", size: 9, color: C.COLORS.text, dy: 6 },
      { s: "↑ jump    ↓ duck", size: 7, color: C.COLORS.dim, dy: 24 },
    ]);
  } else if (s.phase === "dead") {
    panel(ctx, [
      { s: "SEGFAULT", size: 18, color: C.COLORS.accent2, dy: -30 },
      { s: `score ${s.score}`, size: 11, color: C.COLORS.text, dy: -6 },
      { s: s.newHigh ? "★ NEW HIGH SCORE ★" : `high ${s.highScore}`, size: 9, color: s.newHigh ? C.COLORS.token : C.COLORS.dim, dy: 12 },
      { s: "SPACE / TAP / R to retry", size: 9, color: C.COLORS.accent1, dy: 34 },
    ]);
  }

  ctx.restore();
}
