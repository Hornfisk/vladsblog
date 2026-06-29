// Procedural pixel-art Clawd — the Claude Code crab. Drawn with plain fillRects in the
// virtual (low-res) space so it stays crisp when the whole canvas is integer-scaled up.
// Designed inside a 22x18 box (PLAYER_W x PLAYER_H); feet sit at the box bottom.
import { COLORS, PLAYER_W, PLAYER_H } from "./constants";
import type { Expression } from "./engine";

type Ctx = CanvasRenderingContext2D;

function r(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawEye(ctx: Ctx, x: number, y: number, expr: Expression, blinking: boolean): void {
  if (expr === "dead") {
    // X_X
    r(ctx, x, y, 1, 1, COLORS.eyePupil);
    r(ctx, x + 1, y + 1, 1, 1, COLORS.eyePupil);
    r(ctx, x + 2, y + 2, 1, 1, COLORS.eyePupil);
    r(ctx, x + 2, y, 1, 1, COLORS.eyePupil);
    r(ctx, x + 1, y + 1, 1, 1, COLORS.eyePupil);
    r(ctx, x, y + 2, 1, 1, COLORS.eyePupil);
    return;
  }
  if (blinking) {
    r(ctx, x, y + 2, 4, 1, COLORS.eyePupil); // closed line
    return;
  }
  const wide = expr === "alert";
  const ew = wide ? 5 : 4;
  const eh = wide ? 5 : 4;
  r(ctx, x - (wide ? 1 : 0), y - (wide ? 1 : 0), ew, eh, COLORS.eyeWhite);
  // pupil position by mood: focused looks up, alert small+centered, idle forward
  const px = expr === "focused" ? x + 1 : x + 1;
  const py = expr === "focused" ? y : expr === "alert" ? y + 1 : y + 1;
  const ps = expr === "alert" ? 1 : 2;
  r(ctx, px, py, ps, ps, COLORS.eyePupil);
}

export interface ClawdOpts {
  expression: Expression;
  runPhase: number;
  squash: number; // -1 squashed .. +1 stretched
  ducking: boolean;
  blinking: boolean;
}

/** Draw Clawd with top-left of his bounding box at (bx, by). */
export function drawClawd(ctx: Ctx, bx: number, by: number, opts: ClawdOpts): void {
  const { expression, runPhase, squash, ducking, blinking } = opts;
  const cx = bx + PLAYER_W / 2;
  const feet = by + PLAYER_H;

  let sqx = 1 - squash * 0.16;
  let sqy = 1 + squash * 0.16;
  if (ducking) { sqx = 1.16; sqy = 0.6; }

  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(sqx, sqy);
  ctx.translate(-cx, -feet);

  const B = COLORS.clawdBody;
  const S = COLORS.clawdShade;
  const D = COLORS.clawdDark;

  // legs (run cycle) — 3 per side, alternating
  const phase = Math.floor(runPhase) % 2;
  const legY = by + 14;
  const legSets = phase === 0 ? [0, 2, 0, 2, 0, 2] : [2, 0, 2, 0, 2, 0];
  const legXs = [bx + 3, bx + 6, bx + 9, bx + 12, bx + 15, bx + 18];
  legXs.forEach((lx, i) => r(ctx, lx, legY + legSets[i] * 0.5, 1, 3 - legSets[i] * 0.4, D));

  // claws (bob with stride)
  const bob = Math.sin(runPhase * Math.PI) * 1;
  // left claw
  r(ctx, bx - 1, by + 7 + bob, 4, 5, B);
  r(ctx, bx - 1, by + 7 + bob, 4, 1, S);
  r(ctx, bx - 1, by + 9 + bob, 2, 1, D); // pincer slit
  // right claw (bigger)
  r(ctx, bx + 19, by + 6 - bob, 5, 6, B);
  r(ctx, bx + 19, by + 6 - bob, 5, 1, S);
  r(ctx, bx + 22, by + 8 - bob, 2, 1, D); // pincer slit

  // shell
  r(ctx, bx + 6, by + 3, 10, 1, B);
  r(ctx, bx + 4, by + 4, 14, 1, B);
  r(ctx, bx + 2, by + 5, 18, 8, B);
  r(ctx, bx + 2, by + 12, 18, 1, S);
  r(ctx, bx + 3, by + 13, 16, 1, S);
  r(ctx, bx + 5, by + 14, 12, 1, D);
  // shell speckles (subtle texture)
  r(ctx, bx + 7, by + 7, 1, 1, S);
  r(ctx, bx + 13, by + 9, 1, 1, S);
  r(ctx, bx + 10, by + 6, 1, 1, S);

  // eyes
  drawEye(ctx, bx + 6, by + 6, expression, blinking);
  drawEye(ctx, bx + 13, by + 6, expression, blinking);

  // tiny mouth
  if (expression === "dead") r(ctx, bx + 9, by + 11, 4, 1, COLORS.clawdDark);
  else r(ctx, bx + 10, by + 11, 2, 1, COLORS.clawdDark);

  ctx.restore();
}
