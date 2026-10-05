<div align="center">

<img src="frontend/public/favicon.svg" width="72" alt="Tailr logo" />

# Tailr

**Find jobs that match your CV. Apply with a CV and cover letter written for each one.**

Add your CV and tell Tailr what job you want. Every morning it searches LinkedIn and JobStreet
and lists every job on your Jobs page, best match first. For a job you like, it prepares your
application from your real experience. You apply yourself, and track it in one place.

<img src="docs/screenshots/application.jpg" alt="Tailr: an application prepared for one job, with four steps to apply and a choice of language and tone" width="900" />

</div>

---

## Contents

- [What Tailr does](#what-tailr-does)
- [Screenshots](#screenshots)
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
| **1. My profile** | Upload a CV (PDF, Word, a photo) or start fresh. AI fills in your experience, skills and achievements; you check and edit them. |
| **2. Job preferences** | The roles, places, pay and work mode you want, and companies or words to leave out. |
| **3. Jobs** | Tailr searches LinkedIn and JobStreet (straight away, and again every morning) and lists every job on your Jobs page with a **% match**, best first. Open one to see how well you match and what's missing. You can also add any job by link. Jobs stay for 14 days after Tailr finds them; ones you save stay until you remove them. |
| **4. Prepare my application** | For one job: a CV and cover letter written only from your real experience (every line checked against your profile), answers to screening questions and interview prep, in English or Bahasa Malaysia, ready as PDFs. Choose the language and tone and Tailr writes it again. Interview prep grows into a full plan: a one-minute pitch, the questions this interviewer will ask with your best story for each, honest answers for skills you lack, questions to ask them, and practice with feedback on your own answers. |
| **5. My applications** | Saved, preparing, applied, interview, offer: one board you drag along, with a reminder to follow up a week after applying (and a drafted email), and a reminder before each interview. "Needs you now" lists what's due; each application has its own page showing only what matters at its stage. |
| **Home** | What's new today, your best matches, your weekly goal, and what employers in your field are asking for. |
| **My CV** | Your CV in five designs: improve it with AI, download a PDF or share a link. |
| **My website** | A personal website made from your profile, with project pages and a contact form, in five designs. |
| **Account settings** | Name, time zone, light or dark and a colour palette (also one click from the side menu), emails, password, signed-in devices, AI use today, download your data, delete your account. |
| **Working on it** | Searches, CV reading and every AI action run in the background: keep using Tailr, follow them next to the bell, and get a notification when they're done. |
| **Admin** | People and their AI use, an AI switch and daily allowance per person, disable or re-enable accounts, job-site health. |

The words used across the app are in [docs/ux-language.md](docs/ux-language.md). Internally
the daily search is a *brief*, job preferences are the *radar*, and a prepared application is a
*kit*; the code and API keep those names.

Tailr never applies on your behalf. It prepares; you decide.

## Screenshots

Every screen works on a phone and in light or dark. These use the demo account (`make demo`).

<table>
<tr><td width="50%" valign="top"><img src="docs/screenshots/home.jpg" alt="Home" /><br /><b>Home</b>: what's new today, your best matches, this week's goal and what employers in your field ask for.</td><td width="50%" valign="top"><img src="docs/screenshots/jobs.jpg" alt="Jobs" /><br /><b>Jobs</b>: every job Tailr found on LinkedIn and JobStreet, best match first. Jobs stay 14 days; saved ones stay until you remove them.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/job.jpg" alt="A job" /><br /><b>A job</b>: how well you match and why (Tailr's take), what the ad asks for, and the next step.</td><td width="50%" valign="top"><img src="docs/screenshots/preferences.jpg" alt="Job preferences" /><br /><b>Job preferences</b>: the roles, places, pay and deal-breakers Tailr searches for, with a quick look at what they find, only when you ask.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/application.jpg" alt="Your application" /><br /><b>Your application</b>: a CV and cover letter written only from your real experience, four steps to apply, and a choice of language and tone.</td><td width="50%" valign="top"><img src="docs/screenshots/interview.jpg" alt="Interview prep" /><br /><b>Interview prep</b>: a one-minute pitch, the questions this interviewer will ask with your best story for each, practice mode and feedback on your answers.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/applications.jpg" alt="My applications" /><br /><b>My applications</b>: what needs you now, then every application from saved to offer, each card with its next step. Drag to move.</td><td width="50%" valign="top"><img src="docs/screenshots/application-page.jpg" alt="One application" /><br /><b>One application</b>: only what matters at its stage: preparing, sending, following up, the interview, the offer.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/profile.jpg" alt="My profile" /><br /><b>My profile</b>: your experience, skills and achievements, read from your CV and improved with AI suggestions you choose to use.</td><td width="50%" valign="top"><img src="docs/screenshots/cv.jpg" alt="My CV" /><br /><b>My CV</b>: five designs, AI edits checked against your profile, a PDF and a link to share.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/website.jpg" alt="My website editor" /><br /><b>My website editor</b>: your story, expertise, case studies and key numbers, drafted from your profile.</td><td width="50%" valign="top"><img src="docs/screenshots/portfolio.jpg" alt="Your website" /><br /><b>Your website</b>: a personal site in five designs, with project pages and a contact form.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/appearance.jpg" alt="Appearance" /><br /><b>Appearance</b>: light, dark or match your device, in four colour palettes, saved to your account.</td><td width="50%" valign="top"><img src="docs/screenshots/dark-jobs.jpg" alt="Dark" /><br /><b>Dark</b>: the Classic palette in dark.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/screenshots/dark-orchid-applications.jpg" alt="Orchid" /><br /><b>Orchid</b>: My applications in the Orchid palette.</td><td width="50%" valign="top"><img src="docs/screenshots/dark-lagoon-home.jpg" alt="Lagoon" /><br /><b>Lagoon</b>: Home in the Lagoon palette.</td></tr>
</table>

On a phone:

<table>
<tr><td width="33%" valign="top"><img src="docs/screenshots/phone-home.jpg" alt="Home" /><br /><b>Home</b>: the tab bar keeps every section one tap away.</td><td width="33%" valign="top"><img src="docs/screenshots/phone-job.jpg" alt="A job" /><br /><b>A job</b>: the match, the ad and the next step.</td><td width="33%" valign="top"><img src="docs/screenshots/phone-applications.jpg" alt="My applications" /><br /><b>My applications</b>: what needs you now, then every application.</td></tr>
</table>

## Quick start

You need **Docker** (with Compose) and **make**. Nothing else.

```bash
git clone <repo-url> tailr && cd tailr
make setup          # creates .env, builds images, starts everything
```

Then open **http://localhost:8400**. To see every feature with data straight away, load the
demo account (no AI key or internet needed):

```bash
make demo
```

| Account | Username | Password |
|---|---|---|
| Demo (a full profile, jobs, prepared applications, CV, website, applications board) | `demo` | `Tailr-demo-2026` |
| Administrator (people, AI use, job-site health) | `admin` | `admin` |

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
make demo           # (re)build the demo account from fixed data
make e2e            # browser smoke tests + accessibility checks (after make demo)
make screenshots    # retake the README screenshots in docs/screenshots (after make demo)
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

Anything slow (job searches, reading a CV, preparing an application, every AI action) runs on the worker as a
background task: the page stays usable, a "Working on it" tray follows it, live events refresh the screen, and the
result is kept, so leaving the page loses nothing. Every line the AI writes about you is checked against your
profile before you see it.

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
├── e2e/                Playwright browser and accessibility tests (make e2e)
├── renderer/           PDF service (internal only)
├── infra/              Postgres init (extensions, test database)
├── docs/               architecture, development, features, decisions, screenshots
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
| `PUBLIC_WEB_URL` | `http://localhost:8400` | The address people open Tailr at. Shared CV and website links, link previews and emails use it |
| `AI_DAILY_BUDGET_TOKENS` | `1500000` | Default AI allowance per person per day (admins can change it per person; 0 = no limit) |
| `SEED_DEMO_PASSWORD` | `Tailr-demo-2026` | The demo account's password (`make demo`); production refuses the default |
| `EMAIL_ENABLED` / `SMTP_FROM` | `true` / `Tailr <brief@tailr.local>` | Emails (the daily jobs email, reminders); in development Mailpit catches them all |
| `SOURCES_ENABLED` | `linkedin,jobstreet` | Job sources to use; remove one to switch it off |
| `WEB_PORT` … `MAIL_UI_PORT` | `8400`–`8405` | Ports on your machine |

**Sharing your website or CV with other people.** `localhost` only works on your own computer. Put Tailr on an
address others can reach (a server, or a tunnel to port 8400), set `PUBLIC_WEB_URL` to it, then `make restart`, so
share links and link previews point there.

## Testing and quality

```bash
make test    # pytest (backend) + Vitest (frontend)
make lint    # ruff + mypy (backend), eslint + tsc (frontend)
make e2e     # Playwright on a desktop and a phone, with axe accessibility checks (after make up && make demo)
```

- Backend tests run against their **own database** (`tailr_test`), migrated from scratch each run; each test is rolled back, so tests never touch your data or each other.
- Job sources are tested against **real recorded responses** in `backend/tests/fixtures/`.
- AI calls are replaced by a deterministic fake in tests.
- Browser tests cover sign-in, the public website and CV, Home, a job, an application, My applications, every
  profile page, settings and admin, with no sideways scrolling and no serious WCAG 2.2 AA problems.
- Run one backend test session at a time: runs share the test database and a Redis database.

## Documentation

| Document | For |
|---|---|
| [PLAN.md](PLAN.md) | Product scope, decisions and build order |
| [docs/architecture.md](docs/architecture.md) | How the system fits together and why |
| [docs/development.md](docs/development.md) | Day-to-day development, conventions, adding a feature |
| [docs/features/](docs/features) | One page per feature: [accounts](docs/features/01-accounts.md), [profile builder](docs/features/02-profile-builder.md), [job preferences](docs/features/03-job-radar.md), [jobs and the daily search](docs/features/04-morning-brief.md), [preparing an application](docs/features/05-apply-kit.md), [my CV](docs/features/06-cv-studio.md), [my website](docs/features/07-portfolio.md), [my applications and this week](docs/features/08-tracker-momentum.md), [settings, admin and demo](docs/features/09-settings-admin.md), [working in the background](docs/features/10-background-work.md) |
| [docs/ux-language.md](docs/ux-language.md) | The words the app uses, and the ones it avoids |
| [docs/job-sources.md](docs/job-sources.md) | How Tailr reads LinkedIn and JobStreet, politely |
| [docs/screenshots/](docs/screenshots) | The screenshots above; `make screenshots` retakes them after UI changes |
| [docs/adr/](docs/adr) | Architecture decision records |

## Status and roadmap

Tailr is built in milestones; each one is usable on its own.

| Milestone | Status |
|---|---|
| M0 Foundation: stack, accounts, sign in / sign up, design system | ✅ Done |
| M1 Profile Builder: CV import (PDF, Word, scans), live review, autosaving builder, strength score, Bullet Coach | ✅ Done |
| M2 Job Radar: AI role suggestions, places, pay, deal-breakers, brief schedule, live preview scanning LinkedIn and JobStreet | ✅ Done |
| M3 Job catalog: full descriptions, AI reading of every ad, embeddings, shared by all users | ✅ Done |
| M4 Fit score, AI fit reviews, Morning Brief (scheduled + on demand), email, Jobs and job detail | ✅ Done |
| M5 Apply Kit: truth-checked resume, cover letter, answers and interview prep (English or Bahasa Malaysia), live preview and PDFs, add any job by link or text, notifications | ✅ Done |
| M6 CV Studio: five CV designs, AI edits with truth checks and undo, PDF, share page with link preview; portfolio foundation (publishing, four designs, pictures, highlights, link previews, visits) | ✅ Done |
| M7 Portfolio site: about, expertise, achievements, case-study pages, timeline, testimonials, contact form to an inbox, one or several pages, AI drafting with a truth judge, a fifth design (Stamp) | ✅ Done |
| M8 Tracker and Momentum: drag-and-drop board, follow-up nudges with truthful drafts, next-step reminders, weekly goal, streak, funnel, Market Pulse | ✅ Done |
| M9 Settings, admin (people, AI use and allowances, disabling accounts, job-site health), demo account, browser smoke and accessibility tests | ✅ Done |
| Background work: job searches, CV reading and every AI action run in the background with a "Working on it" tray, finish alerts and results kept across visits; the job-preferences check runs only when asked | ✅ Done |
| Redesign: four colour palettes in light and dark, page and button motion, My applications with a page per application, a full interview plan with practice feedback, clearer application page, jobs kept 14 days | ✅ Done |

Later: a desktop helper for Indeed and Glassdoor, a Chrome extension, voice mock interviews.

## License

[MIT](LICENSE) © Khaled Saiful Islam
