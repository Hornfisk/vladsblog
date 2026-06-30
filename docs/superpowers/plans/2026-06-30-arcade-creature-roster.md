# Arcade Creature Roster & Readability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreadable `ERR!` text hazard with a flying glitch creature, expand the ground roster to three silhouette-distinct bugs, make the token combo reset on hit, and add an opt-in FPS readout.

**Architecture:** Pure engine (`engine.ts`) holds state + the spawn/collision/combo logic; `render.ts` holds per-creature pixel draws; `GameCanvas.tsx` wires the loop, input, and blit. Changes stay within these three files plus `constants.ts` tunables. Collision is unchanged AABB against each obstacle's `x/y/w/h`, so new creatures need only a size + a draw function.

**Tech Stack:** Vite + React + TypeScript, HTML5 Canvas 2D, no test runner.

## Global Constraints

- **No test harness exists.** Verify every task with `npx tsc -p tsconfig.app.json --noEmit` (the esbuild build does NOT type-check) + `npm run build` + manual playtest. Do not add a test framework.
- **No speed/difficulty change.** Do not touch `BASE_SPEED`, `MAX_SPEED`, `SPEED_PER_PX`, or the spawn-gap constants.
- **No audio change.** Do not touch `audio.ts`, `sfx.ts`, `music.ts`.
- **No text on the overhead hazard.** The flyer must read by silhouette + colour only.
- **Colour language:** red/terracotta family = ground = jump; pink/magenta (`#D946EF`) = overhead = duck. Preserve it.
- **ASCII-only string literals** in code (project convention).
- The game lives at the `/arcade` route; playtest by opening the dev server URL + `/arcade`.

---

### Task 1: Combo resets on any non-fatal hit

**Files:**
- Modify: `src/components/arcade/engine.ts` (the `hit()` function, ~lines 271-292)

**Interfaces:**
- Consumes: existing `GameState.combo`, `GameState.shielded`, `GameState.lives`.
- Produces: nothing new; behaviour change only.

- [ ] **Step 1: Add `combo = 0` to both non-fatal branches of `hit()`**

In `hit()`, the shield-break branch currently reads:

```ts
  if (s.shielded) {
    s.shielded = false;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.7;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.shield, 16, 170);
    return false;
  }
```

Change it to add the combo reset right after clearing the shield:

```ts
  if (s.shielded) {
    s.shielded = false;
    s.combo = 0;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.7;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.shield, 16, 170);
    return false;
  }
```

The life-loss branch currently reads:

```ts
  if (s.lives > 0) {
    s.lives -= 1;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.8;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.clawdBody, 16, 190);
    return false;
  }
```

Change it to:

```ts
  if (s.lives > 0) {
    s.lives -= 1;
    s.combo = 0;
    s.invuln = C.INVULN_TIME;
    s.shake = 0.8;
    s.events.push("hurt");
    burst(s, cx, cy, C.COLORS.clawdBody, 16, 190);
    return false;
  }
```

(The fatal branch `die(s)` ends the run, so no reset is needed there — a fresh run zeroes combo via `createGameState`.)

- [ ] **Step 2: Type-check**

Run: `cd ~/repos/vladsblog && npx tsc -p tsconfig.app.json --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 4: Playtest**

Run: `npm run dev`, open the printed URL + `/arcade`. Collect 3+ green tokens to raise the `x` indicator (top center), then run into an obstacle while holding a shield, and separately while holding a stored life.
Expected: the `x` multiplier disappears (resets to x1) the instant a shield breaks OR a life is spent; collecting a token afterward starts the climb again from x1.

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/engine.ts
git commit -m "feat(arcade): combo resets to x1 on any non-fatal hit

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Opt-in FPS readout + cache the 2D context

**Files:**
- Modify: `src/components/arcade/GameCanvas.tsx` (refs block ~44-54, keydown switch ~104-138, loop callback ~312-333, `blit()` ~340-372)

**Interfaces:**
- Consumes: existing `canvasRef`, the `useGameLoop` `dt` argument.
- Produces: a debug-only overlay; no state shared with the engine.

- [ ] **Step 1: Add refs for the cached context, the toggle, and the smoothed fps**

In the refs block near the other `useRef`s (after `offCtxRef`), add:

```ts
  const mctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const showFpsRef = useRef(false);
  const fpsRef = useRef(0);
```

- [ ] **Step 2: Add the `F` toggle to the keydown switch**

In `onKeyDown`, add a case before `default:` (alongside `KeyM` / `KeyS`):

```ts
        case "KeyF": // toggle the debug FPS readout
          if (!pressed.current.has(code)) showFpsRef.current = !showFpsRef.current;
          break;
```

No keyup handling is needed — the generic `pressed.current.delete(code)` in `onKeyUp` already clears the repeat-guard.

- [ ] **Step 3: Smooth the fps in the loop callback**

At the top of the `useGameLoop((dt) => { ... })` callback body, before `accRef.current += dt;`, add:

```ts
    if (dt > 0) fpsRef.current = fpsRef.current ? fpsRef.current * 0.9 + (1 / dt) * 0.1 : 1 / dt;
```

- [ ] **Step 4: Cache `getContext` and draw the readout in `blit()`**

In `blit()`, replace:

```ts
    const mctx = main.getContext("2d");
    if (!mctx) return;
```

with:

```ts
    let mctx = mctxRef.current;
    if (!mctx) {
      mctx = main.getContext("2d");
      mctxRef.current = mctx;
    }
    if (!mctx) return;
```

Then, at the very end of `blit()` (after the `renderText(...)` call), add the overlay. It draws in the same `dpr`-transformed CSS-pixel space `renderText` uses, so coordinates are in CSS px:

```ts
    if (showFpsRef.current) {
      mctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      mctx.textAlign = "left";
      mctx.textBaseline = "bottom";
      mctx.fillStyle = "rgba(155,135,245,0.9)";
      mctx.fillText(`${Math.round(fpsRef.current)} fps`, 4, ch - 4);
    }
```

- [ ] **Step 5: Type-check**

Run: `cd ~/repos/vladsblog && npx tsc -p tsconfig.app.json --noEmit`
Expected: no output, exit 0.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 7: Playtest**

Run: `npm run dev`, open `/arcade`. Confirm no readout is visible by default. Press `F`.
Expected: a small purple `NN fps` appears bottom-left and updates smoothly; pressing `F` again hides it. Gameplay is unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/components/arcade/GameCanvas.tsx
git commit -m "feat(arcade): opt-in FPS readout (F) + cache 2D context

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Replace the ERR! banner with a textless flying creature

**Files:**
- Modify: `src/components/arcade/constants.ts` (obstacle dims ~44-49, COLORS ~71-97)
- Modify: `src/components/arcade/engine.ts` (`ObstacleType` ~8, `spawn()` ~173-195)
- Modify: `src/components/arcade/render.ts` (replace `drawErr` ~117-132, the obstacle switch ~279-282)

**Interfaces:**
- Consumes: `Obstacle` (unchanged shape).
- Produces: `ObstacleType` now includes `"flyer"` (and still `"bug"`); constants `FLYER_W`, `FLYER_H`, `FLYER_GAP`; colours `flyer`, `flyerDark`.

- [ ] **Step 1: Swap ERR constants + colours for flyer in `constants.ts`**

Replace the `ERR_*` lines in the obstacles block:

```ts
export const ERR_W = 26;
export const ERR_H = 16;
export const ERR_GAP = 13; // open height beneath an overhead ERR! banner (duck to fit)
```

with:

```ts
export const FLYER_W = 24;
export const FLYER_H = 16;
export const FLYER_GAP = 13; // open height beneath the overhead flyer (duck to fit)
```

In `COLORS`, replace:

```ts
  err: "#D946EF",
  errDark: "#7a1d8a",
```

with:

```ts
  flyer: "#D946EF",
  flyerDark: "#7a1d8a",
```

- [ ] **Step 2: Rename the obstacle type + spawn the flyer in `engine.ts`**

Change the type alias:

```ts
export type ObstacleType = "bug" | "flyer";
```

In `spawn()`, replace the `errish` block:

```ts
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
```

with:

```ts
  const flying = Math.random() < 0.5;
  if (flying) {
    // overhead flying glitch — duck under it
    s.obstacles.push({
      id: s.nextId++,
      type: "flyer",
      x: C.VIRTUAL_W + 8,
      y: C.GROUND_Y - C.FLYER_GAP - C.FLYER_H,
      w: C.FLYER_W,
      h: C.FLYER_H,
    });
  } else {
```

- [ ] **Step 3: Replace `drawErr` with `drawFlyer` (no text) in `render.ts`**

Delete the entire `drawErr` function and add in its place:

```ts
function drawFlyer(ctx: Ctx, o: Obstacle, t: number): void {
  const { x, y, w, h } = o;
  const cy = y + h / 2;
  const flap = Math.round(Math.sin(t * 22 + o.id) * 2); // fast wing-beat
  // wings (pink), flapping above/below the body on each side
  ctx.fillStyle = C.COLORS.flyer;
  ctx.fillRect(x - 4, cy - 2 + flap, 6, 3);
  ctx.fillRect(x + w - 2, cy - 2 - flap, 6, 3);
  // body — dark pink core with a lighter inset
  ctx.fillStyle = C.COLORS.flyerDark;
  ctx.fillRect(x + 4, y + 3, w - 8, h - 5);
  ctx.fillStyle = C.COLORS.flyer;
  ctx.fillRect(x + 5, y + 4, w - 10, h - 8);
  // glitch eyes
  ctx.fillStyle = C.COLORS.eyeWhite;
  ctx.fillRect(x + 6, y + 5, 2, 2);
  ctx.fillRect(x + w - 8, y + 5, 2, 2);
  // downward stinger telegraph (points down -> duck)
  ctx.fillStyle = C.COLORS.flyer;
  const d = Math.floor(t * 10) % 2;
  ctx.fillRect(x + w / 2 - 1, y + h + d, 2, 2);
}
```

Then update the obstacle switch in `render()`:

```ts
  for (const o of s.obstacles) {
    if (o.type === "bug") drawBug(ctx, o, t);
    else drawErr(ctx, o, t);
  }
```

becomes:

```ts
  for (const o of s.obstacles) {
    if (o.type === "flyer") drawFlyer(ctx, o, t);
    else drawBug(ctx, o, t);
  }
```

- [ ] **Step 4: Type-check**

Run: `cd ~/repos/vladsblog && npx tsc -p tsconfig.app.json --noEmit`
Expected: no output, exit 0. (If tsc flags a lingering `ERR_`/`err`/`drawErr` reference, fix that reference — nothing else should use them.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 6: Playtest**

Run: `npm run dev`, open `/arcade`, play until overhead hazards appear.
Expected: the overhead hazard is now a pink winged creature with NO text; it sits in the duck band and a duck clears it cleanly; it reads as a flyer at full speed.

- [ ] **Step 7: Commit**

```bash
git add src/components/arcade/constants.ts src/components/arcade/engine.ts src/components/arcade/render.ts
git commit -m "feat(arcade): flying glitch creature replaces the ERR! text banner

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Three ground species — skitter / crawler / stacker

**Files:**
- Modify: `src/components/arcade/constants.ts` (replace `BUG_*`, add species dims + a lit-red accent)
- Modify: `src/components/arcade/engine.ts` (`ObstacleType`, `spawn()` ground branch)
- Modify: `src/components/arcade/render.ts` (rename `drawBug` -> `drawCrawler`, add `drawSkitter` + `drawStacker`, extend the switch)

**Interfaces:**
- Consumes: `Obstacle`, `ObstacleType` (extended here).
- Produces: `ObstacleType` = `"skitter" | "crawler" | "stacker" | "flyer"`; constants `SKITTER_W/H`, `CRAWLER_W/H`, `STACKER_W/H`; colour `bugLit`.

- [ ] **Step 1: Replace `BUG_*` with per-species dims + a lit accent in `constants.ts`**

Replace:

```ts
export const BUG_W = 18;
export const BUG_H = 15;
```

with:

```ts
export const SKITTER_W = 12; // small low scuttler — easy hop
export const SKITTER_H = 9;
export const CRAWLER_W = 18; // the standard beetle
export const CRAWLER_H = 15;
export const STACKER_W = 14; // tall stack-overflow tower — needs a full (held) jump
export const STACKER_H = 34;
```

In `COLORS`, add a lit-red accent next to the bug colours (after `bugDark`):

```ts
  bugLit: "#ff7d92", // brighter red for the stacker's glitch flicker
```

- [ ] **Step 2: Extend the type + ground spawn in `engine.ts`**

Change the type alias:

```ts
export type ObstacleType = "skitter" | "crawler" | "stacker" | "flyer";
```

In `spawn()`, replace the ground `else` branch:

```ts
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
```

with a weighted species pick (skitter & crawler common, stacker rarer):

```ts
  } else {
    // ground creature — jump over it; species picked by weight
    const r = Math.random();
    let type: ObstacleType, w: number, hh: number;
    if (r < 0.45) {
      type = "skitter"; w = C.SKITTER_W; hh = C.SKITTER_H;
    } else if (r < 0.85) {
      type = "crawler"; w = C.CRAWLER_W; hh = C.CRAWLER_H;
    } else {
      type = "stacker"; w = C.STACKER_W; hh = C.STACKER_H;
    }
    s.obstacles.push({
      id: s.nextId++,
      type,
      x: C.VIRTUAL_W + 8,
      y: C.GROUND_Y - hh,
      w,
      h: hh,
    });
  }
```

- [ ] **Step 3: Rename `drawBug` -> `drawCrawler` and add the two new draws in `render.ts`**

Rename the existing `function drawBug(` to `function drawCrawler(` (its body is unchanged — it already draws from `o.w/o.h`). Then add these two functions next to it:

```ts
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
```

Extend the obstacle switch in `render()`:

```ts
  for (const o of s.obstacles) {
    if (o.type === "flyer") drawFlyer(ctx, o, t);
    else drawBug(ctx, o, t);
  }
```

becomes:

```ts
  for (const o of s.obstacles) {
    if (o.type === "flyer") drawFlyer(ctx, o, t);
    else if (o.type === "skitter") drawSkitter(ctx, o, t);
    else if (o.type === "stacker") drawStacker(ctx, o, t);
    else drawCrawler(ctx, o, t);
  }
```

- [ ] **Step 4: Type-check**

Run: `cd ~/repos/vladsblog && npx tsc -p tsconfig.app.json --noEmit`
Expected: no output, exit 0. (If tsc flags a lingering `BUG_`/`drawBug` reference, fix it.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 6: Playtest + tune**

Run: `npm run dev`, open `/arcade`, play several runs.
Expected: all three ground species appear; skitter is a tiny easy hop, crawler is the standard beetle, stacker is a tall tower. Verify the stacker forces a committed jump: a quick tapped/cut jump should clip it, a held jump clears it. If the stacker is trivially cleared by a tap, raise `STACKER_H` (e.g. 38) and re-check; if it is impossible even with a full held jump, lower it. Adjust the `0.45 / 0.85` spawn weights if any species feels too frequent/rare.

- [ ] **Step 7: Commit**

```bash
git add src/components/arcade/constants.ts src/components/arcade/engine.ts src/components/arcade/render.ts
git commit -m "feat(arcade): three ground species (skitter/crawler/stacker)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Type-check, build, and lint together**

Run: `cd ~/repos/vladsblog && npx tsc -p tsconfig.app.json --noEmit && npm run build && npm run lint`
Expected: tsc clean, build succeeds; lint runs (it was repaired in `54b15e9`). If lint reports pre-existing issues unrelated to these four files, note them but do not fix them in this branch.

- [ ] **Step 2: Full playtest pass**

Run: `npm run dev`, open `/arcade`. In one or two runs confirm the whole feature set together:
- skitter, crawler, stacker all spawn and are jumpable; stacker needs a held jump.
- flyer spawns overhead, ducks cleanly, shows NO text.
- combo `x` indicator climbs with tokens and drops to x1 on a shield break / life loss.
- `F` toggles a stable fps readout; default off.
Expected: all true; nothing regressed (jump/duck/double-jump/pause/restart still work).

- [ ] **Step 3: Surface the FPS finding to the user**

Report the fps number observed during play (especially at high speed). This is the evidence that decides whether perceived choppiness is a real low frame rate or pixel-art steppiness — do NOT attempt a perf "fix" before this number is known.
