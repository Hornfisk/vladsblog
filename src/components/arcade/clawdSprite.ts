// Procedural pixel-art Clawd — the real Anthropic mascot (terracotta #D97757). Drawn with
// plain fillRects in the virtual (low-res) space so it stays crisp when the whole canvas is
// integer-scaled up. Designed inside a 22x18 box (PLAYER_W x PLAYER_H); feet sit at the box
// bottom. Shape mirrors the sticker: chunky rounded body, two side nubs, four legs around a
// center notch, two solid black square eyes — no claws, no mouth.
import { COLORS, PLAYER_W, PLAYER_H } from "./constants";
import type { Expression } from "./engine";

type Ctx = CanvasRenderingContext2D;

function r(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** One eye, drawn from its top-left (ex, ey) in a 3-wide cell. `left` flips asymmetric faces. */
function drawEye(
  ctx: Ctx, ex: number, ey: number, expr: Expression, blinking: boolean, left: boolean,
): void {
  const D = COLORS.eyePupil;
  const dot = (dx: number, dy: number) => r(ctx, ex + dx, ey + dy, 1, 1, D);

  if (expr === "dead") {
    // x X — left eye a light little "x" (corners only), right a bold "X" (corners + center)
    dot(0, 0); dot(2, 0); dot(0, 2); dot(2, 2);
    if (!left) dot(1, 1); // the uppercase one gets a center pixel so it reads heavier
    return;
  }
  if (blinking) {
    r(ctx, ex, ey + 1, 3, 1, D); // closed line
    return;
  }
  if (expr === "bored") {
    r(ctx, ex, ey + 1, 3, 1, D); // -  - flat, unimpressed
    return;
  }
  if (expr === "alert") {
    // >  < squint, points facing inward toward the danger
    if (left) { dot(0, 0); dot(0, 2); dot(1, 1); dot(2, 1); } // ">"
    else { dot(2, 0); dot(2, 2); dot(1, 1); dot(0, 1); } // "<"
    return;
  }
  if (expr === "focused") {
    r(ctx, ex, ey - 1, 3, 4, D); // wide-eyed mid-air
    return;
  }
  r(ctx, ex, ey, 3, 3, D); // idle — solid square
}

export interface ClawdOpts {
  expression: Expression;
  runPhase: number;
  squash: number; // -1 squashed .. +1 stretched
  ducking: boolean;
  airborne: boolean;
  blinking: boolean;
}

/** Draw Clawd with top-left of his bounding box at (bx, by). */
export function drawClawd(ctx: Ctx, bx: number, by: number, opts: ClawdOpts): void {
  const { expression, runPhase, squash, ducking, airborne, blinking } = opts;
  const cx = bx + PLAYER_W / 2;
  const feet = by + PLAYER_H;

  let sqx = 1 - squash * 0.16;
  let sqy = 1 + squash * 0.16;
  if (ducking) { sqx = 1.18; sqy = 0.58; }

  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(sqx, sqy);
  ctx.translate(-cx, -feet);

  const B = COLORS.clawdBody;
  const S = COLORS.clawdShade;
  const Dk = COLORS.clawdDark;

  // --- legs (run cycle): 4 legs around a center notch, alternating planted/lifted ---
  const phase = Math.floor(runPhase) % 2;
  const legXs = [bx + 3, bx + 7, bx + 13, bx + 17];
  legXs.forEach((lx, i) => {
    let bottom: number;
    if (airborne) bottom = by + 15; // tucked up while jumping
    else bottom = (phase + i) % 2 === 0 ? by + 18 : by + 16; // planted vs mid-stride
    r(ctx, lx, by + 13, 2, bottom - (by + 13), B);
    r(ctx, lx, bottom - 1, 2, 1, Dk); // contact shadow at the foot
  });

  // --- side nubs (little stub arms) ---
  r(ctx, bx - 1, by + 6, 2, 4, B);
  r(ctx, bx + 21, by + 6, 2, 4, B);

  // --- body (rounded-rectangle silhouette) ---
  r(ctx, bx + 4, by + 1, 14, 1, B); // rounded top
  r(ctx, bx + 2, by + 2, 18, 1, B);
  r(ctx, bx + 1, by + 3, 20, 11, B); // main mass y3..y14
  // shading band along the bottom + dim the leg join
  r(ctx, bx + 2, by + 12, 18, 2, S);
  // subtle top rim-light (stands in for the sticker's white outline)
  r(ctx, bx + 4, by + 1, 14, 1, COLORS.clawdEdge);

  // --- eyes (wide-set black squares, like the sticker) ---
  drawEye(ctx, bx + 3, by + 5, expression, blinking, true);
  drawEye(ctx, bx + 16, by + 5, expression, blinking, false);

  ctx.restore();
}
