# Tailr — Plan

> **Jobs that fit. Applications made to measure.**
> Every morning Tailr finds fresh jobs that fit your profile, scores the fit, and — when you pick one — tailors a resume, cover letter and apply kit for that exact job. You apply yourself.

Status: **v1 in progress** · Owner: Khaled · Started 2026-10-04

---

## 0. Decisions (locked)

| # | Decision | Why |
|---|---|---|
| D1 | Brand-new, standalone repo `~/projects/tailr`; no code from any other project | Clean architecture you can hand over |
| D2 | Backend **FastAPI** (Python 3.12, async SQLAlchemy 2, Alembic, Pydantic v2) | Same stack the team knows; async fits I/O-heavy fetching and LLM calls |
| D3 | **Postgres 16 + pgvector**, **Redis 7** | One DB for data and vectors; Redis for queue, cache, rate limits, live events |
| D4 | Background work on **taskiq** (+ taskiq-redis), one scheduler process | Active, async-native, retries with backoff; `arq` is maintenance-only |
| D5 | Frontend **React 19 + Vite + TypeScript + Tailwind 4**, TanStack Query, React Router, Radix primitives, Motion | Professional, accessible, animated; typed API client generated from OpenAPI |
| D6 | **Node renderer** service (Fastify + Playwright) turns resume HTML into PDF | Pixel-exact PDFs; the same HTML is the in-app preview |
| D7 | AI on **ILMU** (OpenAI-compatible): `ilmu-v3.1` (reasoning/writing, strict JSON schema), `ilmu-mini-v3.3` (cheap extraction), `ilmu-vision-v1.3` (scanned CVs), `bge-m3` embeddings (1024-d), `bge-reranker` | All verified working on 2026-10-04; one key, one vendor, swappable behind interfaces |
| D8 | v1 job sources run on the server: **LinkedIn** (public guest endpoints) and **JobStreet** (search API + GraphQL details), plus **paste a link/description** | Both proven from AWS; Indeed/Glassdoor need the desktop helper (v2) |
| D9 | No auto-apply. Tailr prepares; the user applies | Quality over spam; no account risk; a selling point |
| D10 | **Truth-locked tailoring**: every generated line links to a profile fact; unsupported claims are flagged | Trust; competitors invent experience |
| D11 | Auth: email + password, opaque session cookie (httpOnly), sessions table | Revocable, simple, secure; Google sign-in slots in later via `auth_identities` |
| D12 | Docker for everything; one `Makefile` drives it (`make setup`, `make up`, `make test` …) | Anyone can run it with Docker only |

---

## 1. Product

### 1.1 Who it is for
Job seekers in Malaysia (then the region) who apply to several roles a week and lose hours rewriting the same CV. Primary persona: a mid-level professional (e.g. software / AI engineer) checking jobs every morning.

### 1.2 The daily loop
```
 Morning Brief (7:00) ──> pick jobs you like ──> "Tailor for me" ──> Apply Kit ready
        ^                                                                  │
        │                                         you apply on the site ◀──┘
        └──── tracker, streak, goals, follow-up nudges bring you back ◀────┘
```

### 1.3 v1 scope

| Area | v1 features |
|---|---|
| **Profile Builder** | Drop a CV (PDF / DOCX / image / pasted text / LinkedIn "Save to PDF") → AI fills every section with a live "assembling" animation. Or build from scratch. Sections: basics, summary, experience (with bullet "facts"), education, projects, skills (grouped, levelled), certifications, languages, links. **Profile Strength** score with a checklist. **Bullet Coach**: rewrites a bullet stronger and asks for the missing metric — never invents numbers. Live master-resume preview. |
| **Job Radar** (settings) | AI proposes target roles and search queries from the profile (editable chips). Locations, work mode (on-site / hybrid / remote), employment type, minimum salary (RM), seniority, freshness window, deal-breakers (companies / keywords to skip), must-haves. Sources on/off. Brief time + days. Fit threshold. **Live radar preview**: as you tweak, see how many fresh jobs it would catch right now. |
| **Morning Brief** | Daily drop at the user's chosen time: greeting, today's count, **Top Pick** hero, ranked cards with **Fit %** (tape-measure ring), freshness / repost / agency flags, "also on JobStreet" duplicate merge. Quick triage (save / skip, keyboard shortcuts). "Run now" button. Email digest. |
| **Explainable Fit** | Per job: score breakdown (skills, role, experience, location & mode, salary), "why you fit" and "gaps", each gap with a one-tap action (add the skill to profile if you have it / see learning hint). |
| **Tailor → Apply Kit** | One tap builds: tailored resume (truth-locked, diff vs master), cover letter (tone: confident / warm / concise), **keyword coverage** before → after, **fact check** report, screening-question answers (why this company, why you, expected salary guidance in RM, notice period), recruiter message, interview cheat-sheet (likely questions + STAR stories from your facts). Edit inline; live preview; download PDF. Language: English or **Bahasa Malaysia**. Malaysian norms: no IC number, photo off by default. |
| **Tracker** | Kanban: Saved → Preparing → Applied → Interview → Offer / Rejected. Drag and drop, notes, dates. Day-7 **follow-up nudge** with a drafted email. |
| **Momentum** | Weekly goal (e.g. apply to 5), streak of brief-check days, funnel stats, **Market Pulse** (top skills and salary ranges across your matches this week). |
| **Account** | Theme (light / dark / system), timezone, email digest on/off, export my data, delete account. |

### 1.4 Not in v1 (roadmap)
Desktop helper (Indeed, Glassdoor) · Chrome extension ("Tailor this job" on any page, autofill) · voice mock interviews (ILMU TTS/ASR) · referral finder · Gmail sync of application status · Google sign-in · DOCX export · multiple resume templates gallery · mobile PWA push · team/coach accounts · billing.

---

## 2. Experience & brand

- **Name & voice**: Tailr — tailoring metaphor used lightly: *Fit*, *measure*, *stitch*. Copy is short, warm, confident. "Measuring your fit…", "Stitching your resume…".
- **Type**: *Instrument Serif* (display headlines), *Geist* (UI), *Geist Mono* (numbers, Fit %).
- **Colour**: ink & paper neutrals; accent **Thread** (vermilion); **Measure** (tape yellow) for highlights; Fit scale: ≥85 emerald, 70–84 teal, 50–69 amber, <50 slate. Light and dark themes from the same tokens.
- **Motifs**: stitched dashed borders on focus/selected cards, tape-measure ticks on the Fit ring, a thread line that draws itself while AI works.
- **Motion everywhere** (Motion library), respecting `prefers-reduced-motion`.
- **Rules**: text never truncated or overlapping (wrap instead); every page checked at 1440 / 1024 / 768 / 390 px; WCAG 2.2 AA (contrast, focus, keyboard).

Pages: Sign in / Sign up · Onboarding (import → review → radar → first brief) · **Today** (Morning Brief) · Jobs (all matches, filters) · Job detail · Apply Kit · Tracker · Profile · Radar · Settings.

---

## 3. Architecture

### 3.1 Services (docker compose)

```
                ┌────────────┐   /api    ┌─────────────┐
 browser ─────▶ │  frontend  │ ────────▶ │   backend   │──┐  FastAPI (HTTP + SSE)
                │ nginx+SPA  │           └─────────────┘  │
                └────────────┘                 │  enqueue  │
                                               ▼           │
 ┌───────────┐  cron   ┌─────────┐  tasks ┌─────────┐     │      ┌──────────┐
 │ scheduler │ ──────▶ │  redis  │ ◀────▶ │ worker  │─────┼────▶ │ renderer │ HTML→PDF
 └───────────┘         └─────────┘ events └─────────┘     │      │ Node+PW  │
                                               │           │      └──────────┘
                                               ▼           ▼
                                        ┌──────────────────────┐   ┌──────────┐
                                        │ postgres + pgvector  │   │  mailpit │ (dev email)
                                        └──────────────────────┘   └──────────┘
                     worker ──▶ ILMU API (LLM, embeddings, rerank)
                     worker ──▶ LinkedIn / JobStreet (rate-limited, cached)
```

| Container | Role | Port (host) |
|---|---|---|
| `tailr-frontend` | nginx serving the built SPA, proxies `/api` | **8400** |
| `tailr-backend` | FastAPI app, OpenAPI at `/api/docs` | 8401 |
| `tailr-db` | Postgres 16 + pgvector | 8402 |
| `tailr-redis` | queue, cache, rate limits, pub/sub | 8404 |
| `tailr-worker` | taskiq workers (imports, fetching, matching, kits) | — |
| `tailr-scheduler` | taskiq scheduler (exactly one) | — |
| `tailr-renderer` | Node + Playwright PDF service (internal) | — |
| `tailr-mailpit` | catches dev email, web UI | 8405 |
| Vite dev server (`make dev`) | hot reload | 8403 |

### 3.2 Backend layout — modular monolith

```
backend/app/
  main.py              app factory, middleware, routers
  worker.py            taskiq broker + scheduler entry
  core/                config, logging, db, redis, security, errors, clock, ids, pagination, events (SSE pub/sub)
  ai/                  LLM client (chat, structured JSON), embeddings, reranker, prompt registry, usage log, fakes for tests
  storage/             file storage interface (local disk now, S3 later)
  modules/
    auth/              users, sessions, password hashing
    profile/           profile + sections + facts, strength score, bullet coach
    cv_import/         file → text (pdf/docx/image via vision) → AI → profile draft
    radar/             preferences, search queries, schedule, live preview
    sources/           JobSource contract, registry, linkedin, jobstreet, manual; cache + rate limit
    jobs/              job catalog, upsert/dedupe, enrichment (LLM), embeddings
    matching/          candidate retrieval (pgvector) → rerank → Fit score → explanations
    brief/             daily brief build + dispatch, email digest
    kits/              Apply Kit pipeline: select facts → tailor → cover letter → fact check → keywords → extras → PDF
    documents/         resume/cover-letter HTML templates (Jinja2), renderer client
    tracker/           applications, stages, events, follow-up nudges
    momentum/          goals, streaks, funnel, market pulse
    notifications/     email (SMTP) + in-app notifications
```

Every module has the same shape: `models.py` (tables) · `schemas.py` (API contracts) · `repository.py` (queries) · `service.py` (business rules) · `router.py` (HTTP) · `tasks.py` (background jobs). Rules:
- Routers are thin: validate → call service → return schema.
- Services never import another module's repository; they call that module's service.
- AI, storage, email, sources are behind interfaces; tests swap in fakes.
- All times stored UTC; user timezone applied at the edge.

### 3.3 Frontend layout — feature folders

```
frontend/src/
  app/            router, providers (query, theme, auth), app shell + nav
  components/ui/  design system (Button, Card, Input, Dialog, Sheet, Tabs, Badge, Chip, Slider, Switch, Tooltip, Toast, Skeleton, FitRing, Stitch, ThreadLoader …)
  features/       auth · onboarding · profile · radar · brief · jobs · kits · tracker · momentum · settings
  lib/api/        generated OpenAPI types + typed fetch client
  lib/            utils, format (dates, RM), hooks (useEvents for SSE)
  styles/         tokens.css (light/dark), base
```

### 3.4 Job sources

```python
class JobSource(Protocol):
    key: str                         # "linkedin" | "jobstreet" | "manual"
    async def search(self, q: SearchQuery) -> list[JobCard]
    async def details(self, ref: JobRef) -> JobDetail
```
- **Registry** with per-source kill switch (env), Redis token-bucket rate limit, shared search cache (1 h, keyed by source+query+location+freshness) so many users with similar searches cost one request.
- **Health**: every run is logged in `source_runs`; zero results or parse failures raise an alert flag visible in the admin health endpoint.
- Desktop helper (v2) will register as a *client-side* source using the same contract over an API.

### 3.5 Matching pipeline (per user, per brief)
1. Build search queries from Radar → fetch cards (cache) → upsert jobs (fingerprint dedupe across sources) → fetch details for new jobs (capped).
2. Enrich each new job once (LLM, cached): required / nice skills, seniority, years, mode, salary, 2-line summary, flags (agency, repost). Embed job text (`bge-m3`).
3. Hard filters: deal-breakers, location/mode, freshness, already seen.
4. Retrieve top ~60 by vector similarity to the profile embedding → rerank with `bge-reranker` → top ~25.
5. **Fit score** (0–100) = skills 40 · role 20 · experience 15 · location & mode 10 · salary 5 · semantic 10. Deterministic and explainable.
6. LLM writes "why you fit" + "gaps" for the top ~15. Save brief + matches; push live event; send email.

### 3.6 Apply Kit pipeline
Live progress over SSE, each step persisted:
`read job → choose evidence (fact ids) → tailor resume (bullets cite facts) → cover letter → fact check (citations + numbers must exist in facts + LLM judge) → keyword coverage before/after → screening answers, recruiter message, interview cheat-sheet → render PDF`.

### 3.7 Data model (v1)
`users`, `sessions` · `profiles`, `profile_experiences`, `profile_facts` (bullets), `profile_educations`, `profile_projects`, `profile_skills`, `profile_certifications`, `profile_languages`, `profile_links` · `cv_imports`, `files` · `radars`, `radar_queries` · `jobs`, `job_postings` (per-source links), `job_enrichments` · `briefs`, `matches` · `kits`, `kit_steps` · `applications`, `application_events` · `goals` · `notifications` · `source_runs`, `ai_runs` (tokens, latency, cost).
Full schema in `docs/data-model.md`.

### 3.8 API
REST under `/api/v1`, JSON, consistent envelope for errors (`{error: {code, message, details}}`), cursor pagination, OpenAPI → generated TypeScript types (`make gen-api`). Live updates: `GET /api/v1/events` (SSE) per user — import progress, brief ready, kit steps.

### 3.9 Security & privacy
Argon2id passwords · httpOnly SameSite=Lax session cookie, Secure in prod · Origin check on writes · rate limits on auth and AI endpoints · uploads: type sniffing, size cap, stored outside web root · CVs are personal data (PDPA): export + delete account, no IC numbers in generated documents · secrets only in `.env` · structured logs without personal data.

### 3.10 Quality bar
ruff + mypy (backend), eslint + tsc (frontend) · pytest with a **separate test database** (never the dev DB) · fakes for LLM and HTTP with real recorded fixtures · Vitest for UI logic · Playwright smoke test of the main loop · target ≥ 80% backend coverage.

---

## 4. Build order (v1)

- [x] **M0 Foundation** — repo, Docker, Makefile, config, logging, DB + Alembic, Redis, taskiq, SSE, auth, frontend shell + design system + auth pages, test infra, CI-ready scripts
- [x] **M1 Profile Builder** — profile model + API, CV import (pdf/docx/image/text) with AI parsing, strength score, bullet coach, builder UI with live preview, onboarding import flow
- [x] **M2 Job Radar** — preferences + AI-suggested roles/queries, live radar preview, Radar UI
- [x] **M3 Sources & catalog** — ~~source contract, LinkedIn, JobStreet; cache, rate limit~~ (done in M2), job catalog + dedupe, details, enrichment, embeddings (paste-a-job moves to M5)
- [x] **M4 Matching & Morning Brief** — Fit score, explanations, brief builder, scheduler dispatch, run-now, email digest, Today / Jobs / Job detail UI
- [ ] **M5 Apply Kit** — tailoring pipeline, fact check, keywords, extras, renderer PDF, kit editor UI, Bahasa Malaysia option
- [ ] **M6 Tracker & Momentum** — kanban, follow-up nudges, goals, streak, funnel, market pulse
- [ ] **M7 Polish & hand-over** — demo seed (`make demo`), docs, README, coverage, Playwright smoke, UI audit at 4 widths, accessibility pass

Each milestone: tests green → docs updated → local commit (no push until approved).

## 5. Risks

| Risk | Mitigation |
|---|---|
| A source changes or blocks | Contract + fixtures + health checks + kill switch; "paste a link" always works |
| Terms of service | Low volume, shared cache, no logins on server, legal review before public launch |
| AI invents experience | Truth-locked generation + fact check + user review before download |
| LLM latency / cost | Mini model for extraction, embeddings + rerank before LLM, per-user daily AI budget, `ai_runs` metering |
| Personal data | PDPA basics from day one: consent copy, export, delete, encrypted transport, minimal logs |
