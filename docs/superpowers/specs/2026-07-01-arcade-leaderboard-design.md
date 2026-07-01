# Clawd Runner — Global Leaderboard (design)

**Date:** 2026-07-01
**Status:** approved (design); pending implementation plan
**Scope:** add an anonymous, login-free global high-score board to the hidden
`/arcade` easter-egg game (Clawd Runner), hardened against abuse without
requiring accounts.

## Goal

Let anyone who plays Clawd Runner put a score on a shared global board, with a
3-letter arcade name, **without logging in** and **without opening a practical
abuse vector** (stored XSS, bot flooding, trivial score forgery, PII leakage,
runaway cost).

## Non-goals (v1)

- Accounts / identity / per-user history.
- Daily / weekly / seasonal boards (all-time global only).
- Server-authoritative gameplay (replay/simulation). Determined score forgery
  is an **accepted residual risk**, contained by the top-N cap + admin delete.
- Anti-cheat beyond formula re-derivation + duration bounding.

## Trust model (the one load-bearing idea)

The game runs entirely in the browser, so **nothing the client sends can be
trusted**. Therefore the client may *read* the board directly, but the **only
write path** is a Supabase Edge Function (`submit-score`) that holds the
`service_role` key. Row-Level Security lets the anon role only **read** the board
— through a view that omits `ip_hash` — and gives it **no**
`insert`/`update`/`delete` access, so the function is the sole writer. All
validation lives server-side; the game is never trusted to police itself.

## Architecture & data flow

```
game over
  └─ client: would the score place in the stored top 100? (cheap read)
       └─ yes → "NEW HIGH SCORE — enter initials" (AAA, A–Z)
            └─ fetch invisible Cloudflare Turnstile token (submit-time only)
                 └─ POST submit-score { initials, score, distance, tokens, durationMs, turnstileToken }
                      └─ Edge Function (service_role):
                           1. verify Turnstile with CF  (fail-open on error/timeout)
                           2. re-derive & bound-check the score
                           3. rate-limit by hashed IP
                           4. insert row
                           5. return { rank, top }
                 └─ death screen renders the board, your row highlighted
```

Turnstile runs **only at submit time** (on the death screen), never during play,
so it cannot affect gameplay latency. On any Turnstile failure/timeout the
function **fails open** to the plausibility + rate-limit checks rather than
blocking a real player.

## Components (each independently testable)

| Unit | Responsibility | Depends on |
|---|---|---|
| `supabase/migrations/<ts>_arcade_scores.sql` | table + RLS + indexes | Postgres |
| `supabase/functions/submit-score/index.ts` | verify + validate + insert | service_role, Turnstile secret |
| `src/components/arcade/leaderboard.ts` | read top-N, submit via function | supabase client |
| arcade engine `initials` phase | capture 3 initials after a top-N death | engine state |
| arcade render (board + initials) | draw board/entry in retro `renderText` | render.ts |
| `/admin` scores panel | list + delete rows (moderation) | existing auth |

## Data model — `public.arcade_scores`

```sql
create table public.arcade_scores (
  id          uuid primary key default gen_random_uuid(),
  initials    text not null check (initials ~ '^[A-Z]{3}$'),
  score       integer not null check (score >= 0 and score <= 5000000),
  distance    integer not null check (distance >= 0 and distance <= 100000000),
  tokens      integer not null check (tokens  >= 0 and tokens  <= 5000000),
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 3600000),
  ip_hash     text not null,          -- sha256(ip + server_salt); rate-limit only, never returned to clients
  created_at  timestamptz not null default now()
);

create index arcade_scores_score_idx on public.arcade_scores (score desc, created_at asc);
create index arcade_scores_ip_recent_idx on public.arcade_scores (ip_hash, created_at desc);

alter table public.arcade_scores enable row level security;

-- anon (and everyone) may READ the board; note the SELECT below is column-limited in the client query,
-- but ip_hash must never be exposed, so reads go through a view that omits it.
create view public.arcade_scores_public as
  select id, initials, score, created_at
  from public.arcade_scores
  order by score desc, created_at asc;

-- RLS: anon can read the base table's non-sensitive columns via the view; grant select on the view only.
revoke all on public.arcade_scores from anon, authenticated;
grant select on public.arcade_scores_public to anon, authenticated;

-- no insert/update/delete policy for anon → only service_role (edge function) writes.
-- admin moderation (delete) runs as an authenticated admin via a dedicated policy or the service role;
-- final choice deferred to the plan (see Moderation).
```

Notes:
- `ip_hash` is never selectable by clients (the public view omits it); it exists
  purely for per-IP rate-limiting and is a salted hash, so no raw IP/PII is stored.
- Board query = `select * from arcade_scores_public limit 100`.

## Edge Function — `submit-score`

Mirrors the existing `supabase/functions/send-contact-email` pattern (Deno,
service-role client, CORS). Steps, in order:

1. **Parse & shape-check** the JSON body; reject if `initials` isn't `^[A-Z]{3}$`
   or numeric fields are out of the CHECK ranges above.
2. **Turnstile verify** — POST the token + secret to
   `https://challenges.cloudflare.com/turnstile/v0/siteverify`. On `success:false`
   → reject. On network error/timeout → **fail open** (proceed to steps 3–4).
3. **Plausibility (score re-derivation + bounds):**
   - `score === Math.floor(distance * SCORE_PER_PX) + tokens` — exact match required.
   - `distance <= MAX_SPEED * MAX_BIOME_SPEED_MULT * OPUS_SPEED_MULT * (durationMs/1000) * 1.05`
     (loose theoretical ceiling; over-estimates so it never rejects legit runs).
   - `tokens <= (durationMs/1000) * MAX_TOKENS_PER_SEC` (generous per-second cap).
   - The needed constants (`SCORE_PER_PX`, `MAX_SPEED`, `OPUS_SPEED_MULT`,
     plus the two new tuning constants) are **duplicated** into the function with
     a comment to keep them in sync with `constants.ts`. (A shared JSON is a
     possible later refactor; not v1.)
4. **Rate-limit** — count rows with this `ip_hash` in the last hour; reject if
   `>= MAX_SUBMITS_PER_IP_PER_HOUR` (default 10).
5. **Insert** with the service-role client; compute `rank` (count of scores
   strictly greater) and fetch `top` (top-N via the public view). Return
   `{ ok: true, rank, top }`.

**Rollout guard:** the plausibility bounds (step 3) ship in **log-only mode**
first — violations are logged, not rejected — until real high-score data
confirms the constants don't reject legit play. Flip to enforce after calibration.
The exact-formula check and rate-limit are enforced from day one.

## Client changes (`src/components/arcade/`)

- **`leaderboard.ts`** (new, isolated like `highScore.ts`):
  - `fetchTop(): Promise<Entry[]>` — read `arcade_scores_public` (top 100).
  - `submitScore(payload): Promise<{ rank, top }>` — get Turnstile token, invoke
    the function; on any network failure, resolve gracefully (game keeps working
    offline — the board is best-effort, never blocks retry).
- **Engine:** add a `runMs` accumulator (sum of `dt` while `phase === "playing"`)
  and a new `"initials"` phase entered from `dead` **only if** the score would
  place in the stored top 100 (checked against a cached board snapshot).
  Non-qualifying deaths go straight to the normal `dead` screen.
- **Initials entry:** 3 slots, A–Z, keyboard (←/→ select, ↑/↓ cycle, Enter submit)
  and touch (tap a slot to cycle, a ✓ button to submit). Drawn in the existing
  native-res `renderText` retro style. Default initials remembered in localStorage.
- **XSS:** initials are `[A-Z]{3}` and rendered as text via `renderText` (canvas
  fillText), never HTML — stored XSS is structurally impossible.

## Display (defaults, approved)

- Store **top 100**; show **top 10** on the death screen, plus the player's own
  row highlighted if they placed outside the top 10.
- **All-time global** only.
- Also reachable from the ready/menu screen via a small "leaderboard" toggle.

```
        ┌─ GLOBAL TOP 10 ─────────┐
        │  1  VLD   248,300       │
        │  2  ZAP   201,150       │
        │  ...                    │
        │ 14  YOU→ CLW   88,400   │   ← shown if outside the top 10
        └─────────────────────────┘
         SPACE / TAP to retry
```

## Moderation

A "Scores" panel in the existing authenticated `/admin` route: list recent /
flagged entries and delete rows (profanity, obvious cheats). Reuses the current
`AuthContext`; no new public surface. The delete path runs with admin privileges
(policy vs. service-role function decided in the plan).

## Anti-abuse summary

| Vector | Mitigation | Residual |
|---|---|---|
| Stored XSS | `[A-Z]{3}` initials + text-only render | none |
| SQL injection | parameterized supabase-js / PostgREST | none |
| Casual score cheat | server re-derives formula + bounds distance by duration | low |
| Bot flooding | invisible Turnstile + per-IP-hash hourly cap | low |
| Determined forgery | top-N cap + admin delete | accepted |
| Cost / storage | top-100 prune, insert-only rows, tiny schema | low |
| PII | none stored; IP only as a salted hash for rate-limit | none |

## Testing

- **Edge Function (Deno tests):** valid submit inserts + returns rank;
  formula-mismatch rejected; impossible-distance rejected (when enforcing);
  over-rate rejected; Turnstile failure → fail-open path still validates.
  Turnstile + service key **mocked**; no real secrets in tests.
- **Client:** node simulation of top-N qualification + initials-entry state
  machine; graceful-degradation test (submit network failure never blocks retry).
- **Smoke:** headless-Chromium confirms the board + initials entry render with no
  console errors (non-focus-stealing, as used for prior arcade fixes).

## Secrets / config (user provides values; assistant wires plumbing)

- Cloudflare **Turnstile site-key** (public, ships in client) + **secret-key**
  (stored as a Supabase function secret; value also kept in `pass`).
- A server-side **rate-limit salt** for `ip_hash` (Supabase function secret).
- Confirmation to add `supabase/migrations/` (new to this repo) and to deploy the
  `submit-score` function to project `owwhvpjerkjdbmfexfii`.

## Rollout order

1. Migration (table + view + RLS + indexes).
2. Edge Function in **log-only** plausibility mode + Turnstile + rate-limit.
3. Client read-only board (display existing scores; no submit yet) — verify reads.
4. Client submit + initials entry.
5. Admin moderation panel.
6. Calibrate plausibility constants from real data, then flip to **enforce**.
