<div align="center">

<img src="frontend/public/favicon.svg" width="72" alt="Tailr logo" />

# Tailr

**Jobs that fit. Applications made to measure.**

Every morning Tailr finds fresh jobs that fit your profile and measures the fit.
Pick one, and Tailr tailors your resume, cover letter and apply kit for that exact job. You apply yourself.

</div>

---

## Contents

- [What Tailr does](#what-tailr-does)
- [Quick start](#quick-start)
- [Everyday commands](#everyday-commands)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [Configuration](#configuration)
- [Testing and quality](#testing-and-quality)
- [Documentation](#documentation)
- [Status and roadmap](#status-and-roadmap)

## What Tailr does

| | |
|---|---|
| **Profile Builder** | Upload a CV (PDF, Word, image) or start fresh. AI fills every section; you review and refine. |
| **Job Radar** | Tell Tailr the roles, places, salary and deal-breakers you care about, and when you want your brief. |
| **Morning Brief** | Fresh jobs from LinkedIn and JobStreet each morning, each with a **Fit %** you can open to see why. |
| **Apply Kit** | One tap: a tailored resume (every line traced to your real experience), cover letter, screening answers and interview notes, in English or Bahasa Malaysia. |
| **Tracker** | Saved, applied, interviewing, offer: one board, with follow-up nudges. |

Tailr never applies on your behalf. It prepares; you decide.

## Quick start

You need **Docker** (with Compose) and **make**. Nothing else.

```bash
git clone <repo-url> tailr && cd tailr
make setup          # creates .env, builds images, starts everything
```

Then open **http://localhost:8400** and sign in with the default admin:

| Username | Password |
|---|---|
| `admin` | `admin` |

Or create your own account from the sign-up page.

> The AI features use [ILMU](https://ilmu.ai) models. Put your key in `.env` as `LLM_API_KEY`, then `make restart`.

| Service | URL |
|---|---|
| App | http://localhost:8400 |
| API docs (OpenAPI) | http://localhost:8401/api/docs |
| Dev mailbox (Mailpit) | http://localhost:8405 |

## Everyday commands

```bash
make help           # every command with a one-line description
make up             # start (rebuilds what changed); migrations run automatically
make down           # stop; your data is kept
make dev            # hot reload: Python reloads on save, Vite UI on :8403
make logs s=backend # follow one service's logs (omit s= for all)
make test           # backend + frontend tests (separate test database)
make lint           # ruff, mypy, eslint, tsc
make migration m="add jobs"   # create a migration from model changes
make gen-api        # regenerate the frontend's typed API client
make psql           # database prompt
make reset          # wipe all data and start fresh (asks first)
```

## Architecture

```
                ┌────────────┐   /api    ┌─────────────┐
 browser ─────▶ │  frontend  │ ────────▶ │   backend   │  FastAPI (REST + live events)
                │ nginx + SPA│           └─────────────┘
                └────────────┘                 │ enqueue
                                               ▼
 ┌───────────┐  cron   ┌─────────┐  tasks ┌─────────┐        ┌──────────┐
 │ scheduler │ ──────▶ │  redis  │ ◀────▶ │ worker  │ ─────▶ │ renderer │ HTML → PDF
 └───────────┘         └─────────┘ events └─────────┘        └──────────┘
                                               │
                                     ┌─────────────────────┐   ┌─────────┐
                                     │ postgres + pgvector │   │ mailpit │
                                     └─────────────────────┘   └─────────┘
```

| Layer | Technology |
|---|---|
| API | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Data | PostgreSQL 16 + pgvector, Redis 7 |
| Background work | taskiq (worker + scheduler) |
| AI | ILMU, OpenAI-compatible: `ilmu-v3.1`, `ilmu-mini-v3.3`, `ilmu-vision-v1.3`, `bge-m3` embeddings, `bge-reranker` |
| Web | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router, Radix, Motion |
| Documents | Node 22 + Fastify + Playwright (PDF renderer) |

Read **[docs/architecture.md](docs/architecture.md)** for the full picture and the reasoning behind each choice.

## Project layout

```
tailr/
├── backend/            FastAPI app, workers, migrations, tests
│   └── app/
│       ├── core/       config, db, redis, errors, security, events, logging
│       ├── api/        router registry, shared dependencies, health + live events
│       ├── modules/    one folder per feature: models · schemas · repository · service · router · tasks
│       └── ai/ storage/   infrastructure behind interfaces
├── frontend/           React app
│   └── src/
│       ├── app/        router, providers, layout shell, theme
│       ├── components/ design system (Button, Field, FitTape …)
│       ├── features/   one folder per feature (auth, today, …)
│       └── lib/        typed API client, formatting, helpers
├── renderer/           PDF service (internal only)
├── infra/              Postgres init (extensions, test database)
├── docs/               architecture, development, features, decisions
├── docker-compose.yml  the whole stack
└── Makefile            every command you need
```

## Configuration

All settings live in `.env` (created from [`.env.example`](.env.example) by `make setup`). The ones you are most likely to change:

| Variable | Default | What it does |
|---|---|---|
| `LLM_API_KEY` | — | ILMU API key for every AI feature |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | `admin` / `admin` | The admin created on first start. **Production refuses to start with the default password.** |
| `SECRET_KEY` | random | Generated by `make setup` |
| `SOURCES_ENABLED` | `linkedin,jobstreet` | Job sources to use; remove one to switch it off |
| `WEB_PORT` … `MAIL_UI_PORT` | `8400`–`8405` | Ports on your machine |

## Testing and quality

```bash
make test    # pytest (backend) + Vitest (frontend)
make lint    # ruff + mypy (backend), eslint + tsc (frontend)
```

- Backend tests run against their **own database** (`tailr_test`), migrated from scratch each run; each test is rolled back, so tests never touch your data or each other.
- Job sources are tested against **real recorded responses** in `backend/tests/fixtures/`.
- AI calls are replaced by a deterministic fake in tests.

## Documentation

| Document | For |
|---|---|
| [PLAN.md](PLAN.md) | Product scope, decisions and build order |
| [docs/architecture.md](docs/architecture.md) | How the system fits together and why |
| [docs/development.md](docs/development.md) | Day-to-day development, conventions, adding a feature |
| [docs/features/](docs/features) | One page per feature |
| [docs/adr/](docs/adr) | Architecture decision records |

## Status and roadmap

Tailr is built in milestones; each one is usable on its own.

| Milestone | Status |
|---|---|
| M0 Foundation: stack, accounts, sign in / sign up, design system | ✅ Done |
| M1 Profile Builder | Next |
| M2 Job Radar | Planned |
| M3 Job sources and catalog | Planned |
| M4 Matching and Morning Brief | Planned |
| M5 Apply Kit | Planned |
| M6 Tracker and Momentum | Planned |
| M7 Polish and hand-over | Planned |

Later: a desktop helper for Indeed and Glassdoor, a Chrome extension, voice mock interviews.
