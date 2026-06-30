# Clawd Runner — Creature Roster & Readability Pass

**Date:** 2026-06-30
**Status:** Approved (design)
**Area:** `src/components/arcade/`

## Motivation

Two player-facing problems with the current arcade game:

1. **The overhead `ERR!` hazard relies on 8px text** that, at high scroll speed, is an
   unreadable pink smear. You can't tell what it is fast enough to react.
2. **Creature variety is thin** — there is exactly one ground creature (`drawBug`) plus the
   `ERR!` banner. The world reads as samey.

A third, smaller issue surfaced while discussing the above:

3. **The green-token combo multiplier is inert.** It scales each token's base 25 points up to
   x9, but it *never resets during a run*, so it climbs to x9 within the first ~9 coins and
   parks there. No risk, no reason to chain carefully.

And one open question to *measure*, not assume:

4. **Perceived low FPS.** The render loop is uncapped `requestAnimationFrame` (renders at
   display refresh) with a fixed 120Hz physics substep — there is no software FPS cap. The
   likely cause of perceived choppiness is pixel-art steppiness at speed (whole-pixel integer
   jumps), not dropped frames. We add an opt-in FPS readout so this can be confirmed on the
   user's own screen rather than guessed.

## Goals

- Replace the text-based `ERR!` banner with a **flying glitch creature** that reads by
  silhouette + colour, no text.
- Expand ground creatures to **3 distinct species**, differentiated by silhouette so the
  player reads the required reaction at a glance.
- Give the **combo multiplier teeth**: any non-fatal hit resets it.
- Add a **toggleable FPS/frame-time readout** (off by default) to measure the real frame rate.

## Non-Goals (explicitly out of scope)

- **No speed / difficulty change.** Difficulty is confirmed fine; removing text is the fix for
  legibility. `BASE_SPEED`, `MAX_SPEED`, `SPEED_PER_PX` stay as-is.
- **No music / volume change.**
- **No token redesign** beyond the combo-reset (no charge meters / temporary powers).
- **No new player verbs.** Still jump (ground) / duck (overhead).

## Design

### Colour language (preserved)

- **Red / terracotta family** (`bug`, `bugDark`) = ground hazard → **jump**.
- **Pink / magenta family** (`#D946EF`, currently `err`/`errDark`) = overhead hazard → **duck**.

The user already reads the overhead hazard as "the pink one," so the flyer keeps the pink
palette to preserve that learned association.

### 1. Ground creatures — jump to dodge (3 species)

Three concrete obstacle types, each with fixed `w`/`h` in `constants.ts`. Collision is the
existing AABB against `o.x/o.y/o.w/o.h`, so **no physics rework** — only spawn placement and a
per-species draw function.

| Species   | Size / silhouette              | Intended reaction                                        |
|-----------|--------------------------------|----------------------------------------------------------|
| `skitter` | tiny, low, busy legs           | easy hop                                                  |
| `crawler` | current beetle, mid-size       | standard jump                                             |
| `stacker` | tall + narrow (segmented tower)| tall enough a *tapped* (early-cut) jump won't clear it — must hold for a full jump |

Light motion tells only (skitter scuttle, crawler leg-wobble, stacker faint segment flicker).
No new mechanics.

**Stacker height tuning:** player single-jump apex ≈ 73px rise; an early-released (cut) jump
peaks much lower. `STACKER_H` is chosen so a held jump clears it but a tapped one is too short.
Target ≈ 32–36px, **final value tuned live during build**.

### 2. Overhead hazard — duck (replaces `ERR!`)

A single **flying glitch** creature (`flyer`): a winged buzz-fly / glitch-bat in the pink
family, hovering in the **same duck-band the `ERR!` banner used** — bottom edge ≈ `FLYER_GAP`
(13px, reusing the current `ERR_GAP` value) above the ground, so the crouched player
(`PLAYER_DUCK_H` 11px) clears it.

- **No text.** Reads as "winged thing up high → duck" by shape + a small downward flap/wing
  telegraph.
- Replaces `drawErr` entirely (the `"ERR!"` `fillText` call is deleted).

### 3. Combo gets teeth

In `engine.ts` `hit()`, both non-fatal branches (shield break, life loss) set `s.combo = 0`
(next token → x1). Fatal hits end the run, so combo is irrelevant there.

- Clean run: coins climb to 225 each.
- Get clipped: back to 25, rebuild the chain.

Single behavioural change; the HUD already shows `x{combo}` only when `combo > 1`, so a reset
to 0 simply hides the indicator until the next pickup.

### 4. FPS readout (measurement)

- A `showFps` toggle (ref/state in `GameCanvas`), flipped by the **F** key (currently unused;
  no conflict with Space/↑/W/↓/Esc/R/M/S). **Off by default.**
- Frame times tracked in the `useGameLoop` callback; report a smoothed fps + frame-time ms
  (exponential moving average so the number is stable).
- Drawn at **native display resolution** in `blit()` (corner), so it's crisp and never enters
  the pure engine state.
- Trivial cleanup folded in: **cache `main.getContext("2d")`** in a ref instead of calling it
  every frame.

## Data model changes

`engine.ts`:

```ts
// was: type ObstacleType = "bug" | "err";
export type ObstacleType = "skitter" | "crawler" | "stacker" | "flyer";
```

`Obstacle` interface is otherwise unchanged (it already carries `x,y,w,h`). Spawn logic:

1. Roll ground vs. air (~50/50, matching the current `err`/`bug` split).
2. Ground → pick a species by weight (crawler & skitter common, stacker rarer).
3. Air → `flyer`.

Token / power-up floating logic is untouched.

## Constants added (`constants.ts`)

- Per-species dims: `SKITTER_W/H`, `CRAWLER_W/H` (= current `BUG_W/H`), `STACKER_W/H`,
  `FLYER_W/H`, `FLYER_GAP` (= current `ERR_GAP`).
- Spawn weights for the three ground species.
- Colours: `flyer` / `flyerDark` (reuse the existing pink `err` / `errDark` values; the old
  `err*` names can be renamed or aliased).

## Files touched

| File              | Change                                                                        |
|-------------------|-------------------------------------------------------------------------------|
| `constants.ts`    | per-species dims, flyer colours, spawn weights                                |
| `engine.ts`       | `ObstacleType` union, spawn species selection, `combo = 0` on non-fatal hit   |
| `render.ts`       | `drawSkitter` / `drawCrawler` / `drawStacker` / `drawFlyer`; delete `ERR!` text; per-type switch |
| `GameCanvas.tsx`  | F-key FPS toggle, frame-time tracking, cache `getContext("2d")`               |

`clawdSprite.ts`, `audio.ts`, `sfx.ts`, `music.ts`, `useGameLoop.ts` untouched.

## Verification

This repo has **no test runner** (eslint historically broken; rely on `tsc` + build). Approach:

1. `npx tsc -p tsconfig.app.json --noEmit` — type-check (esbuild build does NOT type-check).
2. `npm run build` — production build succeeds.
3. `npm run dev` — manual playtest:
   - All three ground species spawn and are jumpable; stacker forces a held jump.
   - Flyer spawns overhead, is duckable, shows **no text**.
   - Taking a hit (life loss / shield break) drops the combo to x1.
   - **F** toggles a stable FPS readout; default is off.

The combo-reset is the one piece of pure logic that *could* carry a unit test; given there is
no harness, it is verified via playtest rather than standing up a test framework (out of scope
for this pass).

## Open tuning parameters (resolved live during build)

- `STACKER_H` (and its collision feel vs. cut jumps).
- Exact ground-species spawn weights.
- Flyer flap/telegraph amplitude.
- FPS smoothing factor.
