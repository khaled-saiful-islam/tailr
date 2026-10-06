# Architecture

Tailr is a **modular monolith**: one FastAPI codebase split into feature modules, plus
background workers that run the same code, a scheduler, a PDF renderer and a React SPA.
It is one deployable unit today and can be split later along module lines if a part needs
to scale on its own.

## Services

| Container | Image | Role |
|---|---|---|
| `tailr-frontend` | nginx + built SPA | Serves the app, proxies `/api` to the backend (SSE unbuffered) |
| `tailr-backend` | `backend/` | HTTP API; runs migrations on start (`RUN_MIGRATIONS=1`) and seeds the admin |
| `tailr-worker` | `backend/` | taskiq workers: CV imports, job searches, matching, kits, CV edits, background tasks, email |
| `tailr-scheduler` | `backend/` | taskiq scheduler; must run as **exactly one** process |
| `tailr-renderer` | `renderer/` | Node + Playwright; HTML → PDF/PNG; network-isolated per job |
| `tailr-db` | pgvector/pgvector:pg16 | Postgres with the `vector` extension; creates `tailr_test` on first boot |
| `tailr-redis` | redis:7.4 | Task queue (Redis Streams), cache, rate limits, live-event pub/sub |
| `tailr-mailpit` | axllent/mailpit | Development mailbox for the morning-brief email |

Start order is enforced by health checks: db/redis → backend (migrated, healthy) → worker,
scheduler, frontend.

## Backend

### Layout

```
app/
  main.py      create_app(): middleware, error handlers, routers, lifespan
  worker.py    taskiq broker + scheduler (InMemoryBroker under APP_ENV=test)
  tasks.py     imports every module's tasks for the worker/scheduler
  models.py    imports every model for Alembic and tests
  core/        config · db · redis · errors · security · events · rate_limit · clock · logging · schemas
  api/         router.py (registry) · deps.py (db session, current user) · system.py (health, SSE)
  modules/<feature>/
      models.py      SQLAlchemy tables
      schemas.py     Pydantic request/response contracts (the public API)
      repository.py  queries; the only place that builds SQL
      service.py     business rules; raises AppError subclasses
      router.py      thin HTTP layer: validate → service → schema
      tasks.py       background jobs (optional)
```

### Rules that keep it maintainable

1. **Routers are thin.** No queries or business rules in `router.py`.
2. **Modules talk through services.** A module never imports another module's repository.
3. **Infrastructure sits behind interfaces** (AI client, storage, email, job sources) so tests
   use fakes and vendors can change.
4. **One error shape.** Services raise `AppError` subclasses (`NotFoundError`, `ConflictError` …);
   `core/errors.py` turns them into `{"error": {"code", "message", "details"}}`.
5. **One transaction per request.** `get_db` commits when the handler returns and rolls back
   on any exception. Background tasks use `session_scope()`.
6. **UTC everywhere.** User time zones apply only at the edges (brief scheduling, display).
7. **Configuration only through `get_settings()`.** Production refuses unsafe settings
   (`Settings.validate_for_production`).

### Authentication

- Email + password (Argon2id). Users may also have a `username`; sign-in accepts either.
- On success the API sets an **httpOnly, SameSite=Lax** cookie holding a random token. Only the
  token's SHA-256 is stored (`sessions` table), so a database leak doesn't expose live sessions.
- CSRF: writes (`POST/PUT/PATCH/DELETE`) whose `Origin` is not trusted are rejected (`bad_origin`).
- Sign-in is rate limited per IP and identifier (10 per 15 minutes, Redis).
- Changing the password signs out every other device.
- `GET /api/v1/auth/session` returns `{user: null}` for visitors, so the SPA can check
  sign-in state without provoking 401s.
- A default admin (`admin` / `admin`, role `admin`) is created on first start. Production
  refuses to boot while that password is unchanged.

### AI layer (`app/ai`)

- `AIClient` protocol with `complete`, `structured`, `embed`, `rerank`. Production uses
  `IlmuClient` (OpenAI-compatible HTTP); tests use `FakeAIClient` (per-purpose handlers,
  recorded calls).
- `structured()` sends a **strict JSON schema** generated from a Pydantic model
  (`ai/schema.py` inlines `$ref`s and marks every property required and nullable where
  optional), validates the answer, and does one repair round if it doesn't fit.
- Retries with exponential backoff on timeouts, 429 and 5xx; a semaphore limits concurrency.
- Every call is metered in `ai_runs` (purpose, model, tokens, latency, status).
- Before every call the client checks the user's AI switch (`ai_enabled`, set by an
  administrator; `ai_disabled`) and their daily allowance (a rolling 24 hours; their own
  `ai_daily_budget` or `AI_DAILY_BUDGET_TOKENS`; `ai_budget`). While a call runs, an
  estimate is held in Redis (`reserve` / `release`), so calls running in parallel can't
  overshoot the allowance together.
- Models: `ilmu-v3.1` (writing, extraction), `ilmu-mini-v3.3` (cheap tasks),
  `ilmu-vision-v1.3` (scans), `bge-m3` (embeddings, 1024-d), `bge-reranker`.

### File storage (`app/storage`)

`Storage` protocol; `LocalStorage` writes under `STORAGE_DIR` (a Docker volume) with keys
like `cv/2026/10/<uuid>.pdf` and refuses paths outside its root. Swap in object storage
later without touching features.

### Background work

taskiq with a Redis Streams broker and `SmartRetryMiddleware` (exponential backoff with
jitter). Tasks that matter persist their state in Postgres (import progress, brief status,
kit steps), so no result backend is needed. Scheduled jobs are declared on the task with a
cron label and picked up by the single scheduler.

Anything slow a person asks for (AI writing, a job-site preview, adding a job by link) goes
through one generic module, `modules/background`: the endpoint runs quick checks, saves a
`background_tasks` row and answers 202; the worker runs the handler for that kind and keeps
its result. `GET /api/v1/tasks` lists those tasks together with searches, CV reads, kits and
CV edits, so the app has one "working on it" list. See
[features/10-background-work.md](features/10-background-work.md).

### Live updates

Workers publish small events to Redis channel `events:user:<id>`: `brief.progress`,
`brief.ready`, `profile.import`, `kit.progress`, `kit.step`, `kit.ready`, `cv.ready`,
`task` and `notification`. `GET /api/v1/events` streams them to the browser as Server-Sent
Events. Events are hints: the UI refetches the real data (and polls gently while work is
running), so a missed event never loses state.

### Public pages

`/p/<address>` (portfolio) and `/cv/<address>` (shared CV) are served by the backend so link
previews (which don't run JavaScript) get real tags. `public_profile/shell.py` fetches the
built public shell (`public.html`, a second, light Vite entry), caches it for a minute, and
writes the title, Open Graph and Twitter tags, canonical URL, robots, JSON-LD and the page
data (as JSON) into it, plus a plain-HTML version in `#root`.

Which shell: `WEB_SHELL_URL` (the frontend container's built file) for every request,
except in `make dev`, where requests that came through the Vite dev server carry
`X-Tailr-Dev-Shell: 1` (added by Vite's proxy) and use `DEV_SHELL_URL` (Vite's own,
hot-reloading shell). Production never sets `DEV_SHELL_URL`, so the header does nothing
there; and pages opened through nginx keep working while `make dev` runs.

## Frontend

- **Feature folders** (`src/features/<feature>`) own their pages, components and API hooks.
  The app frame is `src/app/` (router, providers, layouts, nav, theme and appearance).
- **Typed API**: `make gen-api` turns the backend's OpenAPI document into
  `src/lib/api/schema.d.ts`; `openapi-fetch` uses it, so a renamed field breaks the build.
- **Server state** lives in TanStack Query; there is no global client store.
- **Background work** is followed through `src/features/tasks/` (`useBackgroundTask`,
  `useLatestTask`, `useResumableTask`, the tray and alerts); see
  [background work](features/10-background-work.md).
- Pages are lazy-loaded per route. A tab left open across an update asks for the old
  build's files, which are gone: Vite's `vite:preloadError` reloads the page once
  (`src/lib/staleBuild.ts`, with a 30-second guard against loops), and every route has an
  error page (`RouteError`) instead of the router's developer screen.
- Old addresses redirect (`/radar`, `/tracker`,
  `/kits/:id`, `/profile/portfolio`, and `/applications?open=<id>` to `/applications/<id>`).
- The shell (`layouts/AppShell.tsx`): a side rail on wide screens (nav, **Working on it**,
  the bell, Appearance, the account) and, on phones, a top bar with a five-tab bar at the
  bottom. The nav lights **Jobs** on `/jobs/*` and `/apply/*`, **Applications** on
  `/applications/*` (`nav.ts`).

### Design tokens and appearance

- Components use semantic tokens only (`src/styles/index.css`): `canvas`, `rail`,
  `surface`/`surface-2`/`surface-3`, `ink`/`ink-2`/`ink-3`, `line`/`line-strong`,
  `primary`, `tape` (the measuring-tape accent) with `tape-deep`/`tape-ink`/`tape-soft`,
  `chalk`/`chalk-soft` (links and focus), `pin` (errors), the `fit-*` colours for match
  levels, `overlay`, `shade`, `shadow-sheet`, `shadow-lift`, `glow-1`/`glow-2` and
  `grid-dot`. No hex values in components.
- Two attributes on `<html>` choose the values: `data-theme` (`light` or `dark`) and
  `data-palette` (`tape`, `lagoon`, `orchid`, `fern`). A small script in `index.html` sets
  both before the first paint from the last choice on this device; the account's choice is
  applied on sign-in (`src/app/appearance.ts`, `features/settings/useAppearance.ts`).
  Palettes override accents and tint neutrals; fit colours and shadows come from the theme.
- Every page has a faint glow of the palette at the top (`glow-1`, `glow-2`). In dark mode
  cards get a soft light along their top edge and the canvas a fine grain, so dark pages
  have depth rather than flat colour.
- Contrast: every text token meets WCAG AA on canvas and surfaces in all eight
  combinations.

### Motion

- `MotionConfig reducedMotion="user"` wraps the app; everything respects reduced motion.
- Route changes fade and rise (about 260 ms) in the shell; the nav's active marker and the
  phone tab pill slide between items (`layoutId`).
- Shared primitives in `src/components/motion/`: `Reveal` (fade and rise into view, once),
  `Stagger`/`StaggerItem` (lists arriving one by one), `CountUp` (numbers counting up).
- CSS utilities: `hover-lift` (cards rise slightly on hover), `press` (a quick give under
  the finger; filled buttons use it), `animate-pop` (menus and popovers open from their
  trigger).
- Pages pick one orchestrated moment rather than animating everything.

## Data

Postgres is the source of truth. pgvector stores 1024-dimensional `bge-m3` embeddings for
jobs (HNSW index, cosine) and profiles. Redis holds only rebuildable data: the task queue,
search and relevance caches, rate-limit counters and live-event channels.

## The daily pipeline

`docs/features/04-morning-brief.md` describes it end to end. The shape matters for scale:
the **job catalog is shared** (a job is fetched, read by the AI and embedded once, whatever the
number of users), searches are cached for an hour, and per-user work is limited to the cheap
quick score plus fifteen AI reviews.

## Security checklist

| Area | Measure |
|---|---|
| Passwords | Argon2id, rehash on login when parameters change |
| Sessions | Random token, hashed at rest, httpOnly cookie, 30-day expiry, purged nightly |
| CSRF | Origin check on writes, SameSite=Lax |
| Brute force | Per-IP + identifier rate limit on sign-in; 5 password checks per account per 15 minutes |
| Client address | nginx sets `X-Forwarded-For` to the address it saw, never one the visitor sent (rate limits key on it) |
| Fetching links | `core/safe_http.py`: http(s) on standard ports only, every resolved address public, redirects re-checked, size capped; localhost and private IP literals refused before any request |
| Public pages | Strict Content Security Policy; owner's email never in the page; contact form with honeypot, signed time stamp and per-sender limits |
| AI cost | Per-user switch and daily allowance, with in-flight reservations |
| Secrets | `.env` only; production refuses default secret/admin password |
| Headers | nosniff, frame-deny, referrer policy, permissions policy (nginx) |
| Renderer | Internal only; all network requests blocked while rendering |
| Personal data | Logs carry request ids, not CV content |
