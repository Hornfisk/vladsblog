# Arcade (Clawd Runner) — Mobile UX + Parallax Depth — Design

Date: 2026-06-30
Scope: three independent features for the `/arcade` easter-egg game, shipped in order
with a check-in between each. No backend; everything client-side.

## Context

- Game is a fixed 384×216 (16:9) virtual canvas, integer-scaled and centered by `GameCanvas.blit()`.
- On wide phones in landscape this leaves empty **pillar margins** left & right of the play area.
- Phases: `ready | playing | paused | dead` (`engine.ts`). Phase lives in a mutable `stateRef`,
  not React state.
- `drawBackground()` already scrolls a dot-grid (0.4×) + skyline streaks (0.7×) + ground ticks (1×)
  off a single `s.bgScroll`.
- Existing touch input: whole-canvas tap = single jump, swipe ↓ = duck; plus a small circular
  bottom-right JUMP button that supports hold-for-higher (`onJumpBtnDown/Up/Cancel`).

---

## Feature ① — Jump-zone tap hints (mobile)

**Goal:** make it obvious where to tap on mobile without cluttering play; replace the small
circular button with large side tap zones.

- Remove the bottom-right circular JUMP button.
- Add **two full-height tap zones** pinned to the left & right screen edges, sized to the pillar
  margin width with a **minimum ~56px** (so near-16:9 phones still get a usable target; the zone
  may overlap the game edge slightly when margins are thin).
- Each zone is a `<button>` reusing the existing `onJumpBtnDown/Up/Cancel` handlers → press = jump,
  hold = higher jump. Center area remains canvas (tap = jump, swipe ↓ = duck).
- **Visual:** empty rounded-rect outline (faint `accent1` border, no/again-faint fill) + a small
  "tap" micro-label.
- **Fade-after-seen:** outline appears on load; fades out ~2s after first appearance OR on first
  tap. Persist `localStorage["clawd:jumpHintSeen"] = "1"`; returning visitors skip the visible hint.
  **Zones remain tappable after the outline fades** — only the visual hint disappears.
- Touch-only (gated by the existing `touch` prop). Desktop unchanged.

**Acceptance:** On a phone, first visit shows two faint side boxes that fade after ~2s / first tap;
tapping either side jumps; holding jumps higher; reload after first visit shows no boxes but sides
still jump.

---

## Feature ② — Install button (PWA add-to-home-screen)

**Goal:** a "nice touch" install affordance that works cross-platform, never shown during active play.

- New hook `useInstallPrompt()`:
  - Captures `beforeinstallprompt` (Android / desktop Chromium); stashes the event; exposes
    `canInstall` + `promptInstall()`.
  - Detects iOS Safari (no `beforeinstallprompt`, `navigator.standalone` available) → `mode: "ios"`.
  - Detects already-installed (`matchMedia("(display-mode: standalone)").matches` or iOS standalone)
    → hide the button entirely.
- **Phase awareness:** `GameCanvas` gains an `onPhaseChange?(phase)` callback, fired on transitions
  (same spirit as `subscribeAudio`). `Arcade` holds `phase` in React state.
- **Visibility:**
  - Mobile: show only when `phase !== "playing"` (i.e. ready / paused / dead). Rendered as a small
    pill added to the existing floating top-right controls cluster (alongside fullscreen / music /
    sfx); never over live gameplay.
  - Desktop: small "Install" button near the controls / back-link (Chromium only; hidden if not
    installable).
- **iOS interaction:** tapping opens a small dismissible overlay card with the v-logo:
  "Install vlads.blog — Tap Share ⎙ then 'Add to Home Screen'."
- **Android/desktop interaction:** tapping calls `promptInstall()`; on accept/dismiss, hide.

**Acceptance:** Android Chrome shows an Install pill on the start/over screens that triggers the
native prompt; iOS shows the Share instructions card; an already-installed PWA shows no button;
nothing appears while actively playing.

---

## Feature ③ — Parallax depth backgrounds

**Goal:** replace flat moving squares with layered depth that doesn't visibly repeat; lightweight,
no assets.

- Rewrite `drawBackground()` into three back-to-front layers driven by `s.bgScroll`:
  1. **Stars** — farthest, ~0.12× parallax, sparse single-pixel dots, faint.
  2. **City skyline** — mid, ~0.4× parallax, silhouette building rects with a few lit windows.
  3. **Ground ticks** — near, 1×, kept as-is.
- **Non-repeating:** each layer's elements are placed by a seeded PRNG across a long virtual span;
  per-layer wrap periods chosen so their combined LCM is large (no visible loop for minutes).
- **Lightweight:** procedural simple rects, only visible columns drawn each frame; deterministic
  seed so the field is stable across frames. No new state beyond what `bgScroll` already provides
  (may add a small seed constant).
- Parallax factors scale with game speed exactly as `bgScroll` already does.

**Acceptance:** Background shows stars (slow), skyline (medium), ground (fast) at distinct depths;
watching for ~1 min shows no obvious tile repeat; frame cost stays negligible.

---

## Out of scope (later)

- MIDI/Bitwig export workflow for the chiptune (separate, low-priority backlog item).
- Any change to desktop controls beyond adding the install button.
