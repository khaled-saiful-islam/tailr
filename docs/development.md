# Development guide

## Running locally

| Goal | Command |
|---|---|
| Everything, production-like | `make up` → http://localhost:8400 |
| Hot reload while coding | `make dev` → http://localhost:8403 (Vite) |
| Stop | `make down` |
| Logs | `make logs` or `make logs s=worker` |

`make dev` (`docker-compose.dev.yml` on top of the main file) mounts `backend/` into the
backend, worker and scheduler: uvicorn and the taskiq worker reload when you save a Python
file (the worker's `--reload` needs `taskiq[reload]`, which is in the dev dependencies, and
the mounted `docker-entrypoint.sh` must stay executable). The UI runs on Vite with instant
updates and proxies `/api`, `/p/…` and `/cv/…` to the backend.

- :8403 is the live UI. :8400 keeps serving the last built UI, and public pages work on
  both: requests through Vite get Vite's shell, everything else the built one (see
  [architecture](architecture.md#public-pages)).
- A new migration under `make dev`: `make migrate` (the dev backend doesn't restart on its
  own for it).
- Back to production-like: `make up` rebuilds the images and restarts without the mounts.

## Everyday commands

| Command | What it does |
|---|---|
| `make demo` | Create or reset the demo account (`demo` / `Tailr-demo-2026`) with every feature filled in; no AI, no network |
| `make gen-api` | Regenerate `frontend/src/lib/api/schema.d.ts` from the backend's OpenAPI (uses the mounted source; no rebuild needed) |
| `make lint` | ruff, ruff format check and mypy; eslint, Prettier check and tsc |
| `make fmt` | Format backend (ruff) and frontend (Prettier on `src`) |
| `make e2e` | Browser smoke and accessibility tests (below) |
| `make screenshots` | Retake the README screenshots into `docs/screenshots/` from the demo account |
| `make migration m="…"` / `make migrate` | Create / apply a migration |
| `make shell`, `make psql`, `make redis-cli` | A shell in the backend, a Postgres prompt, a Redis prompt |

## Tests

```bash
make test-backend     # pytest against tailr_test (never your data)
make test-frontend    # Vitest
```

Or locally, faster, with the stack running:

```bash
cd backend && uv sync && .venv/bin/pytest
cd frontend && npm test
```

How the backend harness works (`backend/tests/conftest.py`):

- Migrates `tailr_test` from `base` to `head` once per run, so migrations are tested too.
- Wraps every test in a transaction that is rolled back.
- Uses Redis database 15, flushed before each test.
- `client` is an httpx client bound to a fresh app; `signed_in` is the same client after a sign-up.
- The broker is taskiq's `InMemoryBroker(await_inplace=True)`, so a background task finishes
  before the request that started it returns. `tests/background.py` has `done(response)`
  (asserts a 202 whose task finished, returns its result) and `failed(response)`.
- AI calls go to `FakeAIClient` (`fake_ai` / `ai` fixtures): register an answer per purpose
  with `.on("kits.interview_story", handler)`; an unregistered purpose fails like an outage.

**Run one backend test session at a time.** Every run shares the `tailr_test` database and
Redis database 15 (flushed before each test), so two runs at once block each other or flush
each other's rate-limit counters.

### Browser smoke tests (`make e2e`)

`e2e/` holds Playwright tests that run in the official Playwright image against the running
stack, as a desktop and as a phone. They need the demo account:

```bash
make up && make demo && make e2e
```

Each test checks that no page scrolls sideways; the main pages are also scanned with axe and
must have no serious or critical WCAG 2.2 AA problems. Failures leave a screenshot and a trace
in `e2e/results/` (open a trace with `npx playwright show-trace <file>` in `e2e/`).

## Database changes

1. Edit or add models in `app/modules/<feature>/models.py` and import new ones in `app/models.py`.
2. `make migration m="what changed"` and review the generated file in `backend/alembic/versions/`.
3. `make up` applies it (the backend migrates on start), or `make migrate`.

## Adding a feature module

1. `backend/app/modules/<feature>/` with `models.py`, `schemas.py`, `repository.py`,
   `service.py`, `router.py` (and `tasks.py` if it has background work).
2. Register the router in `app/api/router.py`, tasks in `app/tasks.py`, models in `app/models.py`.
3. Write tests in `backend/tests/integration/test_<feature>.py`.
4. `make gen-api` so the frontend sees the new endpoints.
5. `frontend/src/features/<feature>/` with `api.ts` (query hooks), pages and components.
   Add a route in `src/app/router.tsx` and, if it is a main section, a nav entry in `src/app/nav.ts`.
6. Document it in `docs/features/`.

## Conventions

**Python**: ruff (lint + format), mypy, type hints everywhere, async I/O, no `print`
(use `get_logger`). Errors are raised as `AppError` subclasses with a stable `code`.

**TypeScript**: strict mode, no `any`, Zod for form validation, TanStack Query for server
data, components never use raw colours (only tokens such as `bg-surface`, `text-ink-2`).
Prettier formats `src` (`make fmt`; `make lint` checks it). The generated API types are
excluded.

**UI rules**:

- Text never truncates or overlaps; it wraps (`overflow-wrap: anywhere` is global).
- Check every page at 1440, 1024, 768 and 390 px, light and dark.
- Visible focus (chalk-blue outline) on everything interactive.
- Colour only through tokens; check the shell in more than one palette (Classic and Fern
  cover the extremes) as well as light and dark.
- Motion answers user actions, one orchestrated moment per page; use the primitives in
  `src/components/motion/` and the `hover-lift` / `press` utilities. The reduced-motion
  preference is respected globally. Never remove an existing animation in a redesign.
- Copy follows [ux-language.md](ux-language.md): plain words, no internal names (brief,
  radar, kit, fit) on screen, sentence case, active verbs, buttons say what happens.
- Slow work (AI, job sites) never blocks a page: start a background task and follow it
  (`src/features/tasks/`), keep the page usable, and never start AI or a search just
  because a page opened; show the last result and when it ran, with a button to run again.
- Text the AI wrote is marked with the `chalk-mark` utility (a tinted note with a sparkle)
  and a label such as "Tailr's take", never an underline.

**Git**: conventional commits (`feat:`, `fix:`, `docs:` …). One milestone per series of commits.

## Ports

| Port | Service |
|---|---|
| 8400 | Web (nginx) |
| 8401 | API |
| 8402 | Postgres |
| 8403 | Vite dev server |
| 8404 | Redis |
| 8405 | Mailpit UI |
