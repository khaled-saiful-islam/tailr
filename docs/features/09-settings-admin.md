# Settings, admin and the demo

**Status:** shipped in M9.

## Settings (`/settings`, from the account menu)

| Section | What it does |
|---|---|
| **You** | Your name. (Your CV and portfolio use the name in your profile.) |
| **Preferences** | Time zone (searchable, Kuala Lumpur first), which decides when the daily job update runs and how the streak counts days. **Appearance**: Light, Dark or Match my device, and a colour palette (Classic, Lagoon, Orchid or Fern; see below). **Email me my daily job update**. All saved as you change them. |
| **AI use** | Today's AI use against your daily allowance (a rolling 24 hours), the number of AI requests, and a clear note if an administrator has switched AI off for you. |
| **Security** | Change your password (signs out every other device). Where you're signed in: each device ("Chrome on macOS"), its address and when it was last active, with **Sign out everywhere else**. |
| **Your data** | **Download my data**: one JSON file with your account (including theme and palette), profile, imports, job preferences, job searches, jobs (matches), applications you prepared (kits, including interview plans and practice), CV, portfolio and its messages, pictures (by address), My applications, weekly goal, days you checked your jobs, notifications and AI use. Never passwords or session secrets. **Delete my account**: asks for your password, then removes everything, including stored pictures, imported CV files and preview images. Anonymous AI usage counts are kept for billing. |

A shared demo account (`is_demo`) can't change its password, sign others out or be
deleted, so the next visitor finds it as you did; the page says so.

## Appearance (themes and colour palettes)

The **Appearance** picker sits in the side rail above the account (labelled with the
current choice, e.g. "Device (dark), Classic"), behind the sun/moon in the phone's top bar,
and in Settings › Preferences. All three use the same control.

- Theme: **Light**, **Dark** or **Match my device**.
- Palette, each with a light and a dark version that tints the neutrals as well as the
  accents:

  | Palette | Character (light / dark) |
  |---|---|
  | **Classic** (`tape`, default) | Navy and measuring-tape yellow / deep night with a yellow glow |
  | **Lagoon** (`lagoon`) | Deep teal and aqua / dark sea with bright aqua |
  | **Orchid** (`orchid`) | Plum and lilac / near-black violet with soft lilac |
  | **Fern** (`fern`) | Forest green and fresh leaf / dark moss with leaf green |

- The choice is saved to your account (`theme`, `palette` on `PATCH /auth/me`), so it follows
  you to every device and is applied on sign-in. Before the first paint, `index.html` sets
  `data-theme` and `data-palette` from the last choice on this device, so there's no flash.
- Switching spreads the new look as a circle from where you clicked (View Transitions, where
  the browser supports it); otherwise it fades. Reduced motion skips both.
- Every text colour meets WCAG AA (4.5:1) on the page, card and raised-card colours in all
  eight palette and theme combinations.

## Admin (`/admin`, administrators only)

Visible in the side rail and the account menu for administrators; everyone else sees
"This page is for administrators", and every admin API answers 403 `admin_only`.

- **Overview**: people (active and new this week), disabled accounts, AI tokens and calls
  in the last 24 hours (with failures), the default daily allowance, AI tokens per day for
  14 days, what the AI did in the last 30 days (tailoring, fit reviews, reading job ads,
  CV edits, ...), and **job-site health** for the last 24 hours: searches, failures,
  searches that found nothing, the last success and the last error, marked Healthy, Worth
  a look or Failing.
- **People**: search by name, email or username; filter All, Disabled, AI off, Admins; each
  person's status, last sign-in, AI use in 24 hours against their allowance, and 30 days.
- **One person** (a sheet): their AI use by purpose and per day, their applications, kits,
  matches and signed-in devices, and the switches:
  - **Account active**: turning it off signs them out everywhere at once, and they can't sign in until it's back on.
  - **AI**: off stops every AI feature for them (tailoring, drafting, reviews, CV edits).
  - **Daily AI allowance**: their own token limit, or the default (`AI_DAILY_BUDGET_TOKENS`, 1.5M). 0 means no limit.
  - **Make admin** / **Remove admin**.

Administrators can't switch off, demote or turn off AI for their own account. The AI client
checks the switch and the allowance before every call (`ai_disabled`, `ai_budget`).

## The demo (`make demo`)

Builds a complete account from fixed data, with no AI and no job-site calls, so a fresh
install shows every feature: sign in as **`demo`** / **`Tailr-demo-2026`** (set
`SEED_DEMO_PASSWORD`; production refuses the default).

It holds a senior AI engineer's profile, job preferences, today's job search, 11 jobs over
the last few weeks (so Market Pulse is ready; saved ones stay past 14 days), two
truth-checked prepared applications (the Teratai Bank one with a full interview plan:
pitch, questions of every kind with cited stories, questions to ask, checklist), a shared
CV (`/cv/demo`), a published portfolio with case studies, pictures, testimonials and a
message (`/p/demo`), eight applications across every stage (a follow-up due, an
interview, an offer), a weekly goal, a five-day streak and notifications. Running it again
rebuilds it from scratch (`app/scripts/seed_demo.py`, `demo_*.py`).

## Quality checks for hand-over

- `make e2e`: Playwright in Docker against the running stack (`make up && make demo`
  first), on a desktop and a phone (22 tests):
  - visitors: sign-in, a public portfolio and a case study, a shared CV, a missing address
    (404);
  - the daily loop: Home (today's jobs, this week, what employers want); a job's match,
    then My applications (Needs you now) and an application's page; a prepared
    application with its breadcrumb, four steps and How it's written; profile, My CV,
    My website, job preferences and settings; job preferences never searching on their
    own;
  - admin: the panel, and that others are kept out.

  No page may scroll sideways, and axe finds no serious or critical WCAG 2.2 AA problems
  on sign-in, Home, My applications, an application's page, Your application,
  settings, admin and a public portfolio.
- Every app page was checked at 1440, 1024, 768 and 390 pixels, light and dark, for
  sideways scrolling and words split across lines.

## API

| Method | Path | What it does |
|---|---|---|
| GET / PATCH | `/api/v1/auth/me` | Your account; change name, time zone, theme, palette, email digest |
| POST | `/api/v1/auth/password` | Change your password |
| GET | `/api/v1/auth/sessions` | Where you're signed in |
| POST | `/api/v1/auth/sessions/sign-out-others` | Sign out every other device |
| GET | `/api/v1/account/usage` | Today's AI use and allowance |
| GET | `/api/v1/account/export` | Download everything (JSON) |
| DELETE | `/api/v1/account` | Delete your account (`password`) |
| GET | `/api/v1/admin/overview` | Usage, people and job-site health |
| GET | `/api/v1/admin/users` | People (`q`, `status`, `limit`, `offset`) |
| GET / PATCH | `/api/v1/admin/users/{id}` | One person; switch the account or AI, set the allowance or role |

## Code

- Backend: `app/modules/account/` (usage, export, delete), `app/modules/admin/`,
  `app/modules/auth/` (devices, sign out others, palette), `app/ai/client.py`
  (`allowance`, `enforce_daily_budget`, and `reserve`/`release`, which hold an estimate in
  Redis while a call runs so parallel calls can't overshoot the allowance),
  `app/scripts/seed_demo.py` and `demo_*.py` (`demo_interview.py` writes the interview plan).
- Frontend: `src/features/settings/` (`useAppearance.ts`, `components/AppearancePicker.tsx`,
  `AppearanceButton.tsx`), `src/app/appearance.ts`, `src/features/admin/`.
- End-to-end: `e2e/` (Playwright and axe).
