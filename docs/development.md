# Development guide

## Running locally

| Goal | Command |
|---|---|
| Everything, production-like | `make up` → http://localhost:8400 |
| Hot reload while coding | `make dev` → http://localhost:8403 (Vite) |
| Stop | `make down` |
| Logs | `make logs` or `make logs s=worker` |

`make dev` mounts `backend/` into the containers: uvicorn and the taskiq worker reload when
you save a Python file. The UI runs on Vite with instant updates and proxies `/api` to the
backend.

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

**UI rules**:

- Text never truncates or overlaps; it wraps (`overflow-wrap: anywhere` is global).
- Check every page at 1440, 1024, 768 and 390 px, light and dark.
- Visible focus (chalk-blue outline) on everything interactive.
- Motion answers user actions; the reduced-motion preference is respected globally.
- Copy: sentence case, active verbs, buttons say what happens ("Create account").

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
