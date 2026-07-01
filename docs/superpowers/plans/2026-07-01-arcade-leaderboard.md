# Clawd Runner Leaderboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an anonymous, login-free global high-score board to the hidden `/arcade` game, hardened against abuse without accounts.

**Architecture:** Client reads the board directly (anon key + RLS via a view). The only write path is a Supabase Edge Function (`submit-score`) holding the `service_role` key; RLS gives anon no write access. All validation (score re-derivation, duration bounds, rate-limit, invisible Turnstile) lives in the function. Score plausibility ships in **log-only** mode and flips to **enforce** via a single env var after calibration.

**Tech Stack:** Vite + React + TypeScript (client), Supabase Postgres + Edge Functions (Deno) backend, Cloudflare Turnstile (invisible), Vitest (unit tests), Deno/Supabase CLI (deploy only).

Design spec: `docs/superpowers/specs/2026-07-01-arcade-leaderboard-design.md`.

## Global Constraints

- **Game score formula (verbatim, load-bearing):** `score = Math.floor(distance * SCORE_PER_PX) + tokenTally` where `SCORE_PER_PX = 0.1`. The edge function must re-derive this exactly.
- **Game constants used in bounds (verbatim from `src/components/arcade/constants.ts`):** `MAX_SPEED = 372`, `OPUS_SPEED_MULT = 1.35`, max biome `speedMult = 1.1`, `TOKEN_POINTS = 25`, `COMBO_MAX = 9`.
- **Board sizes:** store/qualify against top **100**; display top **10** + the player's own row. All-time global only.
- **Names:** exactly 3 chars, `[A-Z]` only, rendered as canvas text (never HTML).
- **Privacy:** never store raw IP; only `sha256(ip + salt)`. Never expose `ip_hash` to clients.
- **Plausibility default:** `SCORE_PLAUSIBILITY_MODE = "log"` until calibrated; exact-formula check and rate-limit are always enforced.
- **Fail-open:** any Turnstile network error/timeout continues to the other checks, never blocks a real player.
- **Repo commit convention:** conventional-commit subjects; every commit message ends with the trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Author identity stays Hornfisk (already configured).
- **Supabase project ref:** `owwhvpjerkjdbmfexfii`. Anon key already in `src/integrations/supabase/client.ts` (public by design).
- **Cloudflare Turnstile test keys** (dev/CI, always-pass): site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`. Real keys are set at deploy (Task 5 / runbook).

## File Structure

**Create:**
- `supabase/migrations/20260701120000_arcade_scores.sql` — table, view, RLS, grants, indexes.
- `supabase/functions/submit-score/constants.ts` — duplicated game constants + tuning constants + mode.
- `supabase/functions/submit-score/validate.ts` — pure validation (runtime-agnostic; vitest-testable).
- `supabase/functions/submit-score/validate.test.ts` — Vitest tests for validate.
- `supabase/functions/submit-score/handler.ts` — `handleSubmit(input, deps)` core (runtime-agnostic).
- `supabase/functions/submit-score/handler.test.ts` — Vitest tests for the handler with fakes.
- `supabase/functions/submit-score/index.ts` — thin Deno bootstrap (`Deno.serve`, real supabase client, env, CORS).
- `scripts/verify-arcade-rls.mjs` — RLS verification (anon insert denied, view readable, ip_hash hidden).
- `src/components/arcade/leaderboard.ts` — client read + submit + Turnstile token.
- `src/components/arcade/leaderboard.qualify.ts` — pure top-100 qualification + rank helpers.
- `src/components/arcade/leaderboard.qualify.test.ts` — Vitest.
- `src/components/arcade/initials.ts` — pure initials state machine.
- `src/components/arcade/initials.test.ts` — Vitest.
- `src/components/admin/ScoresPanel.tsx` — moderation list + delete.
- `vitest.config.ts` — test config.

**Modify:**
- `src/components/arcade/constants.ts` — leaderboard sizes, Turnstile site key, `PHASE` note.
- `src/components/arcade/engine.ts` — `runMs` accumulator, `"initials"` phase, qualification hook.
- `src/components/arcade/render.ts` — draw board + initials entry.
- `src/components/arcade/GameCanvas.tsx` — fetch board, initials input, submit, Turnstile script.
- `src/pages/Admin.tsx` — mount the Scores panel.
- `package.json` — `vitest` dev dep + `test` script.

---

### Task 1: Database migration + RLS

**Files:**
- Create: `supabase/migrations/20260701120000_arcade_scores.sql`
- Create: `scripts/verify-arcade-rls.mjs`

**Interfaces:**
- Produces: table `public.arcade_scores`, readable view `public.arcade_scores_public(id, initials, score, created_at)`. Only `service_role` may insert.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260701120000_arcade_scores.sql
create table if not exists public.arcade_scores (
  id          uuid primary key default gen_random_uuid(),
  initials    text not null check (initials ~ '^[A-Z]{3}$'),
  score       integer not null check (score >= 0 and score <= 5000000),
  distance    integer not null check (distance >= 0 and distance <= 100000000),
  tokens      integer not null check (tokens  >= 0 and tokens  <= 5000000),
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 3600000),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists arcade_scores_score_idx on public.arcade_scores (score desc, created_at asc);
create index if not exists arcade_scores_ip_recent_idx on public.arcade_scores (ip_hash, created_at desc);

alter table public.arcade_scores enable row level security;
-- no policies for anon/authenticated => zero row access except service_role (which bypasses RLS).

-- Public board via a view that omits ip_hash. security_invoker=off (default) so the view's
-- owner reads the base table, bypassing RLS for these safe columns only.
create or replace view public.arcade_scores_public as
  select id, initials, score, created_at
  from public.arcade_scores
  order by score desc, created_at asc;

revoke all on public.arcade_scores from anon, authenticated;
grant select on public.arcade_scores_public to anon, authenticated;
```

- [ ] **Step 2: Apply the migration to the project**

Run: `cd ~/repos/vladsblog && supabase db push`
(If `supabase link` is not set: `supabase link --project-ref owwhvpjerkjdbmfexfii` first. Alternatively paste the SQL into the Supabase dashboard SQL editor.)
Expected: migration applies with no error; table + view exist.

- [ ] **Step 3: Write the RLS verification script (the failing test)**

```js
// scripts/verify-arcade-rls.mjs — run with real keys via env
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = createClient(URL, ANON), svc = createClient(URL, SVC);
let fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) fail++; };

// anon INSERT must be denied
{ const { error } = await anon.from("arcade_scores").insert({ initials: "AAA", score: 1, distance: 10, tokens: 0, duration_ms: 1000, ip_hash: "x" });
  ok("anon insert denied", !!error); }
// anon SELECT of base table must be denied
{ const { error } = await anon.from("arcade_scores").select("id").limit(1);
  ok("anon base-table select denied", !!error); }
// anon SELECT of the view must work and must NOT expose ip_hash
{ const { data, error } = await anon.from("arcade_scores_public").select("*").limit(1);
  ok("anon view select allowed", !error);
  ok("view omits ip_hash", !error && (data.length === 0 || !("ip_hash" in data[0]))); }
// service_role INSERT must work
{ const { error } = await svc.from("arcade_scores").insert({ initials: "AAA", score: 1, distance: 10, tokens: 0, duration_ms: 1000, ip_hash: "test" });
  ok("service_role insert allowed", !error); }
// cleanup
await svc.from("arcade_scores").delete().eq("ip_hash", "test");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 4: Run the verification**

Run: `SUPABASE_URL=https://owwhvpjerkjdbmfexfii.supabase.co SUPABASE_ANON_KEY=<anon> SUPABASE_SERVICE_ROLE_KEY=$(pass infra/vladsblog-supabase-service-role) node scripts/verify-arcade-rls.mjs`
Expected: all 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260701120000_arcade_scores.sql scripts/verify-arcade-rls.mjs
git commit -m "feat(arcade): scores table + RLS (anon read-only via view, service-role write)"
```

---

### Task 2: Test harness (Vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add Vitest**

Run: `cd ~/repos/vladsblog && npm i -D vitest`
Then add to `package.json` "scripts": `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["**/*.test.ts"] } });
```

- [ ] **Step 3: Sanity test**

```ts
// src/components/arcade/_smoke.test.ts
import { expect, test } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 4: Run**

Run: `npm test`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git rm src/components/arcade/_smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

### Task 3: Edge-function validation logic (pure)

**Files:**
- Create: `supabase/functions/submit-score/constants.ts`
- Create: `supabase/functions/submit-score/validate.ts`
- Create: `supabase/functions/submit-score/validate.test.ts`

**Interfaces:**
- Produces:
  - `type Submission = { initials: string; score: number; distance: number; tokens: number; durationMs: number }`
  - `type Verdict = { ok: boolean; reason?: string; suspect: boolean }`
  - `function validateSubmission(s: unknown, mode: "log" | "enforce"): Verdict`

- [ ] **Step 1: Constants**

```ts
// supabase/functions/submit-score/constants.ts
// Duplicated from src/components/arcade/constants.ts — KEEP IN SYNC.
export const SCORE_PER_PX = 0.1;
export const MAX_SPEED = 372;
export const OPUS_SPEED_MULT = 1.35;
export const MAX_BIOME_SPEED_MULT = 1.1;
// Tuning (calibrate before flipping to enforce):
export const DISTANCE_MARGIN = 1.05;      // slack over the theoretical speed ceiling
export const MAX_TOKENS_PER_SEC = 1500;   // generous cap; real max ~1.1k/s
export const MAX_SUBMITS_PER_IP_PER_HOUR = 10;
```

- [ ] **Step 2: Write the failing tests**

```ts
// supabase/functions/submit-score/validate.test.ts
import { expect, test } from "vitest";
import { validateSubmission } from "./validate";

const base = { initials: "ABC", score: 100, distance: 1000, tokens: 0, durationMs: 20000 }; // floor(1000*0.1)=100

test("accepts a well-formed, plausible submission", () => {
  expect(validateSubmission(base, "enforce")).toEqual({ ok: true, suspect: false });
});
test("rejects bad initials shape", () => {
  expect(validateSubmission({ ...base, initials: "ab" }, "enforce").ok).toBe(false);
});
test("rejects score that doesn't match the formula", () => {
  const v = validateSubmission({ ...base, score: 999999 }, "enforce");
  expect(v.ok).toBe(false); expect(v.reason).toContain("formula");
});
test("formula mismatch is always rejected even in log mode", () => {
  expect(validateSubmission({ ...base, score: 999999 }, "log").ok).toBe(false);
});
test("impossible distance-for-duration is suspect; rejected only in enforce", () => {
  const bad = { initials: "ABC", distance: 10_000_000, tokens: 0, durationMs: 1000, score: Math.floor(10_000_000 * 0.1) };
  expect(validateSubmission(bad, "enforce")).toMatchObject({ ok: false, suspect: true });
  expect(validateSubmission(bad, "log")).toMatchObject({ ok: true, suspect: true });
});
test("impossible token rate is suspect; rejected only in enforce", () => {
  const bad = { initials: "ABC", distance: 1000, tokens: 5_000_000, durationMs: 1000, score: Math.floor(1000 * 0.1) + 5_000_000 };
  expect(validateSubmission(bad, "enforce")).toMatchObject({ ok: false, suspect: true });
  expect(validateSubmission(bad, "log")).toMatchObject({ ok: true, suspect: true });
});
test("rejects out-of-range numbers regardless of mode", () => {
  expect(validateSubmission({ ...base, durationMs: -5 }, "log").ok).toBe(false);
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test -- validate`
Expected: FAIL ("validateSubmission is not a function").

- [ ] **Step 4: Implement**

```ts
// supabase/functions/submit-score/validate.ts
import { SCORE_PER_PX, MAX_SPEED, OPUS_SPEED_MULT, MAX_BIOME_SPEED_MULT, DISTANCE_MARGIN, MAX_TOKENS_PER_SEC } from "./constants.ts";

export type Submission = { initials: string; score: number; distance: number; tokens: number; durationMs: number };
export type Verdict = { ok: boolean; reason?: string; suspect: boolean };

function shapeError(s: any): string | null {
  if (typeof s !== "object" || s === null) return "not-an-object";
  if (typeof s.initials !== "string" || !/^[A-Z]{3}$/.test(s.initials)) return "initials";
  for (const k of ["score", "distance", "tokens", "durationMs"]) {
    if (typeof s[k] !== "number" || !Number.isFinite(s[k]) || s[k] < 0) return `field:${k}`;
  }
  if (s.score > 5_000_000 || s.distance > 100_000_000 || s.tokens > 5_000_000 || s.durationMs > 3_600_000) return "range";
  return null;
}

export function validateSubmission(raw: unknown, mode: "log" | "enforce"): Verdict {
  const shape = shapeError(raw);
  if (shape) return { ok: false, reason: `shape:${shape}`, suspect: true };
  const s = raw as Submission;

  // Hard reject in BOTH modes: the score must equal the game's own formula.
  if (s.score !== Math.floor(s.distance * SCORE_PER_PX) + s.tokens) {
    return { ok: false, reason: "formula-mismatch", suspect: true };
  }

  // Soft (plausibility) checks: suspect in log mode, reject in enforce mode.
  const sec = s.durationMs / 1000;
  const maxDistance = MAX_SPEED * MAX_BIOME_SPEED_MULT * OPUS_SPEED_MULT * sec * DISTANCE_MARGIN;
  const maxTokens = sec * MAX_TOKENS_PER_SEC;
  let suspectReason: string | null = null;
  if (s.distance > maxDistance) suspectReason = "distance-too-high-for-duration";
  else if (s.tokens > maxTokens) suspectReason = "token-rate-too-high";

  if (suspectReason) {
    if (mode === "enforce") return { ok: false, reason: suspectReason, suspect: true };
    return { ok: true, suspect: true };   // log mode: allow but flag
  }
  return { ok: true, suspect: false };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- validate`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/submit-score/constants.ts supabase/functions/submit-score/validate.ts supabase/functions/submit-score/validate.test.ts
git commit -m "feat(arcade): submit-score validation (formula + duration/token bounds, log/enforce)"
```

---

### Task 4: Edge-function handler core (injectable deps)

**Files:**
- Create: `supabase/functions/submit-score/handler.ts`
- Create: `supabase/functions/submit-score/handler.test.ts`

**Interfaces:**
- Consumes: `validateSubmission`, `MAX_SUBMITS_PER_IP_PER_HOUR`.
- Produces:
  - `type Deps = { verifyTurnstile(token: string): Promise<boolean>; recentCount(ipHash: string): Promise<number>; insert(row): Promise<void>; topN(): Promise<Entry[]>; rankOf(score: number): Promise<number>; hashIp(ip: string): string; mode: "log" | "enforce" }`
  - `async function handleSubmit(body: unknown, turnstileToken: string, ip: string, deps: Deps): Promise<{ status: number; json: object }>`

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/submit-score/handler.test.ts
import { expect, test } from "vitest";
import { handleSubmit, type Deps } from "./handler";

const good = { initials: "ABC", score: 100, distance: 1000, tokens: 0, durationMs: 20000 };
function deps(over: Partial<Deps> = {}): Deps {
  return {
    verifyTurnstile: async () => true,
    recentCount: async () => 0,
    insert: async () => {},
    topN: async () => [{ initials: "ABC", score: 100 }],
    rankOf: async () => 1,
    hashIp: () => "hash",
    mode: "enforce",
    ...over,
  };
}

test("happy path inserts and returns rank + top", async () => {
  let inserted = false;
  const r = await handleSubmit(good, "tok", "1.2.3.4", deps({ insert: async () => { inserted = true; } }));
  expect(r.status).toBe(200); expect(inserted).toBe(true);
  expect(r.json).toMatchObject({ ok: true, rank: 1 });
});
test("formula mismatch → 422, no insert", async () => {
  let inserted = false;
  const r = await handleSubmit({ ...good, score: 999999 }, "tok", "ip", deps({ insert: async () => { inserted = true; } }));
  expect(r.status).toBe(422); expect(inserted).toBe(false);
});
test("rate limit exceeded → 429, no insert", async () => {
  let inserted = false;
  const r = await handleSubmit(good, "tok", "ip", deps({ recentCount: async () => 10, insert: async () => { inserted = true; } }));
  expect(r.status).toBe(429); expect(inserted).toBe(false);
});
test("turnstile failure fails OPEN (still inserts when otherwise valid)", async () => {
  let inserted = false;
  const r = await handleSubmit(good, "tok", "ip", deps({ verifyTurnstile: async () => { throw new Error("cf down"); }, insert: async () => { inserted = true; } }));
  expect(r.status).toBe(200); expect(inserted).toBe(true);
});
test("turnstile explicit fail (bot) → 403, no insert", async () => {
  let inserted = false;
  const r = await handleSubmit(good, "tok", "ip", deps({ verifyTurnstile: async () => false, insert: async () => { inserted = true; } }));
  expect(r.status).toBe(403); expect(inserted).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- handler`
Expected: FAIL ("handleSubmit is not a function").

- [ ] **Step 3: Implement**

```ts
// supabase/functions/submit-score/handler.ts
import { validateSubmission, type Submission } from "./validate.ts";
import { MAX_SUBMITS_PER_IP_PER_HOUR } from "./constants.ts";

export type Entry = { initials: string; score: number };
export type Deps = {
  verifyTurnstile(token: string): Promise<boolean>;
  recentCount(ipHash: string): Promise<number>;
  insert(row: Submission & { ip_hash: string }): Promise<void>;
  topN(): Promise<Entry[]>;
  rankOf(score: number): Promise<number>;
  hashIp(ip: string): string;
  mode: "log" | "enforce";
};

export async function handleSubmit(body: unknown, turnstileToken: string, ip: string, deps: Deps): Promise<{ status: number; json: object }> {
  const verdict = validateSubmission(body, deps.mode);
  if (!verdict.ok) return { status: 422, json: { ok: false, reason: verdict.reason } };
  const s = body as Submission;

  // Turnstile: explicit bot => 403; network error => fail open.
  let human = true;
  try { human = await deps.verifyTurnstile(turnstileToken); }
  catch { human = true; /* fail open */ }
  if (!human) return { status: 403, json: { ok: false, reason: "turnstile" } };

  const ipHash = deps.hashIp(ip);
  if (await deps.recentCount(ipHash) >= MAX_SUBMITS_PER_IP_PER_HOUR) {
    return { status: 429, json: { ok: false, reason: "rate-limit" } };
  }

  // Structured log for calibration (visible in Supabase function logs).
  console.log(JSON.stringify({ evt: "submit", suspect: verdict.suspect, mode: deps.mode,
    score: s.score, distance: s.distance, tokens: s.tokens, durationMs: s.durationMs }));

  await deps.insert({ ...s, ip_hash: ipHash });
  const [rank, top] = await Promise.all([deps.rankOf(s.score), deps.topN()]);
  return { status: 200, json: { ok: true, rank, top } };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- handler`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/submit-score/handler.ts supabase/functions/submit-score/handler.test.ts
git commit -m "feat(arcade): submit-score handler core (turnstile fail-open, rate-limit, insert)"
```

---

### Task 5: Edge-function Deno bootstrap + deploy

**Files:**
- Create: `supabase/functions/submit-score/index.ts`

**Interfaces:**
- Consumes: `handleSubmit`, `Deps`. Reads env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET`, `RATE_LIMIT_SALT`, `SCORE_PLAUSIBILITY_MODE`.

- [ ] **Step 1: Implement the bootstrap** (thin; verified by deploy + live smoke, no unit test)

```ts
// supabase/functions/submit-score/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleSubmit, type Deps } from "./handler.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const env = (k: string) => Deno.env.get(k) ?? "";
const svc = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: cors });
  const { turnstileToken, ...body } = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "0.0.0.0";
  const salt = env("RATE_LIMIT_SALT");

  const deps: Deps = {
    mode: env("SCORE_PLAUSIBILITY_MODE") === "enforce" ? "enforce" : "log",
    hashIp: (ip) => ip, // replaced below by async pre-hash
    verifyTurnstile: async (token) => {
      const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: env("TURNSTILE_SECRET"), response: token ?? "" }),
      });
      const j = await r.json();
      return j.success === true;
    },
    recentCount: async (ipHash) => {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await svc.from("arcade_scores").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", since);
      return count ?? 0;
    },
    insert: async (row) => { const { error } = await svc.from("arcade_scores").insert(row); if (error) throw error; },
    topN: async () => (await svc.from("arcade_scores_public").select("initials,score").limit(100)).data ?? [],
    rankOf: async (score) => { const { count } = await svc.from("arcade_scores").select("id", { count: "exact", head: true }).gt("score", score); return (count ?? 0) + 1; },
  };
  const ipHash = await sha256Hex(ip + salt);
  deps.hashIp = () => ipHash;

  const { status, json } = await handleSubmit(body, turnstileToken, ip, deps);
  return new Response(JSON.stringify(json), { status, headers: { ...cors, "content-type": "application/json" } });
});
```

- [ ] **Step 2: Set function secrets** (test values first; real Turnstile keys later)

Run:
```bash
supabase secrets set --project-ref owwhvpjerkjdbmfexfii \
  TURNSTILE_SECRET=1x0000000000000000000000000000000AA \
  RATE_LIMIT_SALT="$(openssl rand -hex 16)" \
  SCORE_PLAUSIBILITY_MODE=log
```
(SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are provided to functions automatically.)

- [ ] **Step 3: Deploy**

Run: `supabase functions deploy submit-score --project-ref owwhvpjerkjdbmfexfii`
Expected: deploy succeeds.

- [ ] **Step 4: Live smoke** (valid submit inserts; cleanup after)

Run:
```bash
curl -s -X POST "https://owwhvpjerkjdbmfexfii.supabase.co/functions/v1/submit-score" \
  -H "Authorization: Bearer <anon-key>" -H "content-type: application/json" \
  -d '{"initials":"TST","score":100,"distance":1000,"tokens":0,"durationMs":20000,"turnstileToken":"XXXX.DUMMY.TOKEN"}'
```
Expected: `{"ok":true,"rank":...,"top":[...]}`. Then delete the TST row via the service key (or the Admin panel later).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/submit-score/index.ts
git commit -m "feat(arcade): submit-score edge function (deno bootstrap + deploy)"
```

---

### Task 6: Client read + qualification

**Files:**
- Create: `src/components/arcade/leaderboard.qualify.ts`
- Create: `src/components/arcade/leaderboard.qualify.test.ts`
- Create: `src/components/arcade/leaderboard.ts` (read side only in this task)
- Modify: `src/components/arcade/constants.ts`

**Interfaces:**
- Produces:
  - `type Score = { initials: string; score: number }`
  - `function qualifies(score: number, board: Score[], topN: number): boolean`
  - `function rankIn(score: number, board: Score[]): number` (1-based, position if inserted)
  - `async function fetchTop(): Promise<Score[]>`
  - constants `LEADERBOARD_TOP_N = 100`, `LEADERBOARD_DISPLAY = 10`, `TURNSTILE_SITE_KEY`.

- [ ] **Step 1: Constants**

Add to `src/components/arcade/constants.ts`:
```ts
export const LEADERBOARD_TOP_N = 100;   // stored/qualifying board size
export const LEADERBOARD_DISPLAY = 10;  // rows shown on screen
export const TURNSTILE_SITE_KEY = "1x00000000000000000000AA"; // CF test key; swap for real at deploy
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/components/arcade/leaderboard.qualify.test.ts
import { expect, test } from "vitest";
import { qualifies, rankIn } from "./leaderboard.qualify";
const board = Array.from({ length: 100 }, (_, i) => ({ initials: "AAA", score: 1000 - i })); // 1000..901

test("qualifies when board not full", () => { expect(qualifies(1, board.slice(0, 5), 100)).toBe(true); });
test("qualifies when beating the lowest of a full board", () => { expect(qualifies(950, board, 100)).toBe(true); });
test("does not qualify when below a full board's floor", () => { expect(qualifies(900, board, 100)).toBe(false); });
test("rankIn is 1 for a new best", () => { expect(rankIn(2000, board)).toBe(1); });
test("rankIn counts strictly-greater then +1", () => { expect(rankIn(950, board)).toBe(51); }); // 50 scores >950 (1000..951)
```

- [ ] **Step 3: Run to verify fail**

Run: `npm test -- qualify`
Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// src/components/arcade/leaderboard.qualify.ts
export type Score = { initials: string; score: number };
export function qualifies(score: number, board: Score[], topN: number): boolean {
  if (score <= 0) return false;
  if (board.length < topN) return true;
  const floor = board[board.length - 1].score;
  return score > floor;
}
export function rankIn(score: number, board: Score[]): number {
  return board.filter((e) => e.score > score).length + 1;
}
```

```ts
// src/components/arcade/leaderboard.ts
import { supabase } from "@/integrations/supabase/client";
import { LEADERBOARD_TOP_N, type } from "./constants"; // (import only what exists)
import type { Score } from "./leaderboard.qualify";

export async function fetchTop(): Promise<Score[]> {
  const { data, error } = await supabase
    .from("arcade_scores_public").select("initials,score").limit(LEADERBOARD_TOP_N);
  if (error || !data) return [];
  return data as Score[];
}
```
(Note: remove the stray `type` import — import only `LEADERBOARD_TOP_N`.)

- [ ] **Step 5: Run to verify pass + typecheck**

Run: `npm test -- qualify && npx tsc --noEmit`
Expected: tests PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/arcade/leaderboard.ts src/components/arcade/leaderboard.qualify.ts src/components/arcade/leaderboard.qualify.test.ts src/components/arcade/constants.ts
git commit -m "feat(arcade): leaderboard read + qualification helpers"
```

---

### Task 7: Render the board (read-only display)

**Files:**
- Modify: `src/components/arcade/render.ts` (add `drawLeaderboard` used on ready + dead screens)
- Modify: `src/components/arcade/GameCanvas.tsx` (fetch board on mount + after death; pass to render)

**Interfaces:**
- Consumes: `fetchTop`, `Score`, `LEADERBOARD_DISPLAY`.
- Produces: board visible on the death/ready screen. State snapshot cached on the game state as `s.board: Score[]` and `s.myRank: number | null`.

- [ ] **Step 1: Add `board`/`myRank` to game state**

In `engine.ts` `GameState` add `board: Score[]` (import type) and `myRank: number | null`; initialise `board: []`, `myRank: null` in `createGameState()`. (Preserve `board` across `startGame` the same way `highScore` is preserved.)

- [ ] **Step 2: Render function**

In `render.ts`, add (called from `renderText`, native-res, near the dead/ready panel):
```ts
export function leaderboardLines(s: GameState, pal: Theme): { s: string; size: number; color: string; dy: number }[] {
  const rows = s.board.slice(0, C.LEADERBOARD_DISPLAY);
  const out = rows.map((e, i) => ({
    s: `${String(i + 1).padStart(2)}  ${e.initials}  ${e.score.toLocaleString()}`,
    size: 9, color: C.COLORS.dim, dy: -40 + i * 12,
  }));
  if (s.myRank && s.myRank > C.LEADERBOARD_DISPLAY) {
    out.push({ s: `${s.myRank}  YOU  ${s.score.toLocaleString()}`, size: 9, color: pal.accent1, dy: -40 + C.LEADERBOARD_DISPLAY * 12 + 6 });
  }
  return out;
}
```
Wire these lines into the existing dead/ready text block in `renderText`.

- [ ] **Step 3: Fetch on mount + after death in `GameCanvas.tsx`**

```ts
useEffect(() => { fetchTop().then((b) => { stateRef.current!.board = b; }); }, []);
```
And in the loop's phase-transition block, when phase becomes `"dead"`, refresh: `fetchTop().then((b) => { stateRef.current!.board = b; });`

- [ ] **Step 4: Verify (headless smoke)**

Run: `npm run build && npm run preview &` then
`chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 --screenshot=/tmp/board.png http://localhost:4173/arcade` and open `/tmp/board.png`; confirm the ready screen shows a board area with no console errors. Stop preview (`pkill -f "[v]ite preview"`).
Expected: renders; if the table is empty the board area is simply empty (no crash).

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/render.ts src/components/arcade/GameCanvas.tsx src/components/arcade/engine.ts
git commit -m "feat(arcade): display the global leaderboard (read-only)"
```

---

### Task 8: Initials-entry state machine (pure)

**Files:**
- Create: `src/components/arcade/initials.ts`
- Create: `src/components/arcade/initials.test.ts`

**Interfaces:**
- Produces:
  - `type Initials = { letters: [number, number, number]; slot: number }` (each 0–25 = A–Z)
  - `function makeInitials(seed?: string): Initials`
  - `function cycle(i: Initials, delta: number): Initials` (change current slot letter, wraps)
  - `function move(i: Initials, delta: number): Initials` (change selected slot, clamps 0–2)
  - `function toText(i: Initials): string` (e.g. "CLW")

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/arcade/initials.test.ts
import { expect, test } from "vitest";
import { makeInitials, cycle, move, toText } from "./initials";

test("default is AAA slot 0", () => { const i = makeInitials(); expect(toText(i)).toBe("AAA"); expect(i.slot).toBe(0); });
test("seed prefills from a stored value", () => { expect(toText(makeInitials("CLW"))).toBe("CLW"); });
test("cycle +1 advances the current letter", () => { expect(toText(cycle(makeInitials(), 1))).toBe("BAA"); });
test("cycle wraps Z→A", () => { const i = { letters: [25,0,0] as [number,number,number], slot: 0 }; expect(toText(cycle(i, 1))).toBe("AAA"); });
test("move clamps within 0..2", () => { expect(move(makeInitials(), -1).slot).toBe(0); expect(move(move(move(makeInitials(),1),1),1).slot).toBe(2); });
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- initials`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/components/arcade/initials.ts
export type Initials = { letters: [number, number, number]; slot: number };
const A = 65;
export function makeInitials(seed?: string): Initials {
  const s = (seed ?? "AAA").toUpperCase().padEnd(3, "A").slice(0, 3);
  const at = (c: string) => { const n = c.charCodeAt(0) - A; return n >= 0 && n <= 25 ? n : 0; };
  return { letters: [at(s[0]), at(s[1]), at(s[2])], slot: 0 };
}
export function cycle(i: Initials, delta: number): Initials {
  const letters = [...i.letters] as [number, number, number];
  letters[i.slot] = (letters[i.slot] + delta + 26) % 26;
  return { ...i, letters };
}
export function move(i: Initials, delta: number): Initials {
  return { ...i, slot: Math.max(0, Math.min(2, i.slot + delta)) };
}
export function toText(i: Initials): string {
  return i.letters.map((n) => String.fromCharCode(A + n)).join("");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- initials`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/initials.ts src/components/arcade/initials.test.ts
git commit -m "feat(arcade): initials-entry state machine"
```

---

### Task 9: Engine — runMs + initials phase + qualification hook

**Files:**
- Modify: `src/components/arcade/engine.ts`
- Create: `src/components/arcade/engine.leaderboard.test.ts`

**Interfaces:**
- Consumes: `qualifies`, `LEADERBOARD_TOP_N`.
- Produces: `Phase` now includes `"initials"`; `GameState.runMs: number`; on death, if `qualifies(score, board, LEADERBOARD_TOP_N)` the phase becomes `"initials"` instead of `"dead"`. Exposes `enterInitialsOrDead(s)` (pure, testable) used by the death path.

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/arcade/engine.leaderboard.test.ts
import { expect, test } from "vitest";
import { createGameState, enterInitialsOrDead } from "./engine";

test("qualifying score routes to the initials phase", () => {
  const s = createGameState(); s.score = 5000; s.board = []; enterInitialsOrDead(s);
  expect(s.phase).toBe("initials");
});
test("non-qualifying score routes to dead", () => {
  const s = createGameState(); s.score = 1; s.board = Array.from({ length: 100 }, () => ({ initials: "AAA", score: 999 }));
  enterInitialsOrDead(s); expect(s.phase).toBe("dead");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- engine.leaderboard`
Expected: FAIL ("enterInitialsOrDead is not a function").

- [ ] **Step 3: Implement**

- Add `"initials"` to `export type Phase`.
- Add `runMs: number` to `GameState`; init `runMs: 0`; in the play branch of `step()` add `s.runMs += dt * 1000`.
- Replace the death transition (where `s.phase = "dead"` is set on a fatal hit) with `enterInitialsOrDead(s)`:
```ts
export function enterInitialsOrDead(s: GameState): void {
  s.phase = qualifies(s.score, s.board, C.LEADERBOARD_TOP_N) ? "initials" : "dead";
}
```
- Ensure `render.ts`/`GameCanvas` treat `"initials"` like a non-playing phase for the physics gate (it is `!== "playing"`, so the existing early return covers it).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- engine.leaderboard && npx tsc --noEmit`
Expected: PASS + tsc clean (fix any `Phase` exhaustiveness switches by adding an `"initials"` case).

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/engine.ts src/components/arcade/engine.leaderboard.test.ts
git commit -m "feat(arcade): runMs + initials phase gated on top-100 qualification"
```

---

### Task 10: Client submit + Turnstile token

**Files:**
- Modify: `src/components/arcade/leaderboard.ts` (add `submitScore` + Turnstile token fetch)
- Create: `src/components/arcade/leaderboard.submit.test.ts`

**Interfaces:**
- Consumes: `TURNSTILE_SITE_KEY`, supabase functions URL.
- Produces:
  - `async function submitScore(p: { initials: string; score: number; distance: number; tokens: number; durationMs: number }, getToken: () => Promise<string>): Promise<{ rank: number; top: Score[] } | null>` (returns null on any failure — never throws, never blocks retry)

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/arcade/leaderboard.submit.test.ts
import { expect, test, vi } from "vitest";
import { buildSubmitBody } from "./leaderboard";

test("buildSubmitBody carries the run fields + token", () => {
  const b = buildSubmitBody({ initials: "ABC", score: 100, distance: 1000, tokens: 0, durationMs: 20000 }, "tok");
  expect(b).toEqual({ initials: "ABC", score: 100, distance: 1000, tokens: 0, durationMs: 20000, turnstileToken: "tok" });
});
```
(The network `submitScore` itself is verified in the Task 11 headless smoke; `buildSubmitBody` isolates the pure part.)

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- leaderboard.submit`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// add to src/components/arcade/leaderboard.ts
import { TURNSTILE_SITE_KEY } from "./constants";
const FN_URL = "https://owwhvpjerkjdbmfexfii.supabase.co/functions/v1/submit-score";

export type SubmitPayload = { initials: string; score: number; distance: number; tokens: number; durationMs: number };
export function buildSubmitBody(p: SubmitPayload, token: string) { return { ...p, turnstileToken: token }; }

export async function submitScore(p: SubmitPayload, getToken: () => Promise<string>): Promise<{ rank: number; top: Score[] } | null> {
  try {
    const token = await getToken().catch(() => ""); // fail-open: empty token, server decides
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${(await import("@/integrations/supabase/client")).SUPABASE_ANON_KEY ?? ""}` },
      body: JSON.stringify(buildSubmitBody(p, token)),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return { rank: j.rank, top: j.top ?? [] };
  } catch { return null; }
}
```
(If `SUPABASE_ANON_KEY` isn't exported from the client module, export it there or inline the anon key constant — it is public.)

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- leaderboard.submit && npx tsc --noEmit`
Expected: PASS + tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/leaderboard.ts src/components/arcade/leaderboard.submit.test.ts
git commit -m "feat(arcade): client score submission (fail-open, never blocks retry)"
```

---

### Task 11: Wire initials UI + submit in GameCanvas + Turnstile script

**Files:**
- Modify: `src/components/arcade/GameCanvas.tsx`
- Modify: `src/components/arcade/render.ts` (draw the initials entry screen)
- Modify: `index.html` (load the invisible Turnstile script)

**Interfaces:**
- Consumes: `makeInitials/cycle/move/toText`, `submitScore`, `fetchTop`.

- [ ] **Step 1: Load Turnstile (invisible)**

In `index.html` `<head>`: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`.
**SRI note:** do NOT add an `integrity=` hash — Cloudflare mutates this script in place, so a pinned hash breaks Turnstile on their next update (this is their documented guidance). The trust anchor is the fixed `challenges.cloudflare.com` origin over TLS. If you want defense-in-depth, add a CSP `script-src` allowlisting only that origin rather than an SRI hash.
Add a token helper in `GameCanvas.tsx`:
```ts
function getTurnstileToken(): Promise<string> {
  return new Promise((resolve) => {
    const ts = (window as any).turnstile;
    if (!ts) return resolve("");
    ts.render("#cf-ts", { sitekey: C.TURNSTILE_SITE_KEY, size: "invisible", callback: resolve, "error-callback": () => resolve("") });
    ts.execute("#cf-ts");
  });
}
```
Add a hidden `<div id="cf-ts" />` in the component's JSX.

- [ ] **Step 2: Initials input + submit**

- Hold `initialsRef = useRef(makeInitials(localStorage getItem "clawd.initials"))`.
- When `phase === "initials"`: keyboard ←/→ = `move`, ↑/↓ = `cycle`, Enter = submit; touch: tap a slot to `cycle`, a ✓ button to submit.
- On submit: persist initials to localStorage; call
  ```ts
  const r = await submitScore({ initials: toText(i), score: s.score, distance: Math.floor(s.distance), tokens: s.tokenTally, durationMs: Math.floor(s.runMs) }, getTurnstileToken);
  if (r) { s.board = r.top; s.myRank = r.rank; }
  s.phase = "dead";
  ```
  (On `null`, still go to `"dead"` — submission is best-effort.)

- [ ] **Step 3: Render the initials screen**

In `render.ts`, when `phase === "initials"`, draw "NEW HIGH SCORE" + the three big letters with the active slot underlined, and a "▲▼ change · ◄► move · ENTER ok" hint, in the retro `renderText` style.

- [ ] **Step 4: Verify (headless smoke + manual note)**

Run: `npm run build` then the headless screenshot flow from Task 7 against `/arcade`; confirm no console errors and the app mounts. (Full initials→submit round-trip is validated manually on the deployed site, since it needs Turnstile + the live function.)
Expected: build clean, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/GameCanvas.tsx src/components/arcade/render.ts index.html
git commit -m "feat(arcade): initials entry UI + score submit with invisible turnstile"
```

---

### Task 12: Admin moderation panel

**Files:**
- Create: `src/components/admin/ScoresPanel.tsx`
- Modify: `src/pages/Admin.tsx` (mount the panel)

**Interfaces:**
- Consumes: existing `supabase` client + admin auth. Deletes go through an authenticated admin path.

- [ ] **Step 1: Admin delete policy**

Add to the migration set a policy allowing deletes for authenticated admins (matches how other admin tables are gated in this repo — mirror the existing pattern in `supabase/` / dashboard). If the repo gates admin by a specific role/claim, reuse it; otherwise deletes run via a small `delete-score` service-role function. Pick the pattern already used by `PostsList`/`InlineEdit` and follow it exactly.

- [ ] **Step 2: Panel component**

```tsx
// src/components/admin/ScoresPanel.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
type Row = { id: string; initials: string; score: number; created_at: string };
export function ScoresPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => { const { data } = await supabase.from("arcade_scores_public").select("id,initials,score,created_at").limit(100); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { await supabase.from("arcade_scores").delete().eq("id", id); load(); };
  return (
    <div>
      <h2 className="text-lg font-semibold">Arcade scores</h2>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 font-mono text-sm">
            <span>{r.initials}</span><span>{r.score.toLocaleString()}</span>
            <button className="text-red-500" onClick={() => del(r.id)}>delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Mount in Admin**

Import and render `<ScoresPanel />` in `src/pages/Admin.tsx` (a new tab/section).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: clean. Manually: log into `/admin`, confirm the list loads and a delete removes a test row.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ScoresPanel.tsx src/pages/Admin.tsx
git commit -m "feat(admin): arcade scores moderation panel"
```

---

### Task 13: Hardening runbook — calibrate + flip to enforce

**Files:**
- Create: `docs/superpowers/plans/arcade-leaderboard-hardening-runbook.md`

This task is what makes post-deploy hardening fast: everything is already built for `enforce`; only a secret flips.

- [ ] **Step 1: Write the runbook**

Content:
1. **Collect data (log mode):** after real players have posted scores, pull the function logs:
   `supabase functions logs submit-score --project-ref owwhvpjerkjdbmfexfii | grep '"evt":"submit"'`
   Aggregate `score/distance/tokens/durationMs`; note the max real `distance/sec` and `tokens/sec`.
2. **Set constants:** in `supabase/functions/submit-score/constants.ts`, set `DISTANCE_MARGIN` and `MAX_TOKENS_PER_SEC` to ~1.2× the observed real maxima. Redeploy the function.
3. **Swap to real Turnstile keys:** set `TURNSTILE_SITE_KEY` (client constant) to the real site-key and
   `supabase secrets set TURNSTILE_SECRET=<real-secret> --project-ref owwhvpjerkjdbmfexfii`.
4. **Flip to enforce (the single switch):**
   `supabase secrets set SCORE_PLAUSIBILITY_MODE=enforce --project-ref owwhvpjerkjdbmfexfii`
   then `supabase functions deploy submit-score --project-ref owwhvpjerkjdbmfexfii` (refreshes env).
5. **Verify enforce:** POST a deliberately impossible payload (huge distance, 1s duration) → expect `422`. POST a valid one → `200`.
6. **Rollback:** `supabase secrets set SCORE_PLAUSIBILITY_MODE=log ...` + redeploy if legit scores get rejected.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/arcade-leaderboard-hardening-runbook.md
git commit -m "docs(arcade): leaderboard hardening runbook (log→enforce flip)"
```

---

## Self-review checklist (completed by author)

- **Spec coverage:** migration+RLS (T1), edge function log-mode+turnstile+rate-limit (T3–T5), client read board (T6–T7), submit+initials (T8–T11), admin moderation (T12), calibrate→enforce (T13). All spec sections mapped.
- **Placeholder scan:** constants are concrete (`SCORE_PER_PX=0.1`, `MAX_SPEED=372`, etc.); one intentional deferral (T12 Step 1: reuse the repo's existing admin-auth pattern for the delete path) is a "follow the established pattern" instruction, not a blank.
- **Type consistency:** `Score`, `Submission`, `Verdict`, `Deps`, `Initials` names/signatures are consistent across tasks; `validateSubmission(mode)`, `handleSubmit(body, token, ip, deps)`, `submitScore(p, getToken)`, `enterInitialsOrDead(s)`, `qualifies/rankIn` all match their consumers.
