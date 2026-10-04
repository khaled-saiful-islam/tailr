# Job Radar

**Status:** shipped in M2.

> **Users see:** *Job preferences* (`/preferences`). "Radar" is the internal name. Saving with **Save and find jobs** starts a search straight away and opens the Jobs page.

The radar is what Tailr looks for every morning: which roles, where, at what level and pay,
what to skip, and when the brief arrives. A quick look (**Check now**) scans real job sites
for the current settings, so you see the effect of your choices before searching for real.
It runs only when you ask.

## What users see (`/radar`)

| Section | Settings |
|---|---|
| **Roles** | Up to six job titles. **Suggest from my profile** (AI) proposes titles with a one-line reason and the levels your experience fits. |
| **Where** | Anywhere in Malaysia, or chosen states (a state covers its cities: Selangor includes Petaling Jaya, Cyberjaya, Shah Alam…). On-site, hybrid and/or remote; remote jobs are always kept when remote is allowed. |
| **Level and job type** | Intern, entry, mid, senior, lead, manager (none means any). Full-time, contract, part-time, internship. |
| **Pay** | Lowest monthly salary in RM (slider) and whether to keep jobs that don't show pay. |
| **Must-haves and deal-breakers** | Words a job must mention, words to skip, companies to skip. |
| **Freshness and fit** | Last 24 hours, 3 days or a week; the minimum Fit % for the brief (used from M4). |
| **Job sites** | LinkedIn and JobStreet on/off; Indeed and Glassdoor shown as needing Tailr Desktop (coming soon). |
| **Morning brief** | Time (5:00 am to 11:30 am), days of the week, email copy, pause. Shows the next brief time. |

**Radar preview** (beside the settings, on top on phones): the radar scope with one contact
per matching job, the count ("16 fresh jobs match right now, from 54 found in the last 3
days"), results per site, *why* the others were left out (in plain words), and the newest
matches linking to the job pages. The page never searches on its own: it shows the last
check and when it ran ("Checked 3 hours ago", from any visit or device), says "You've
changed your preferences since then" when they differ, and searches again only on
**Check now** / **Check again**. A check runs in the background, so you can keep editing.

First visit: the radar is pre-filled from the profile (latest title without "Senior",
city mapped to its state, level from the title). **Start my radar** saves it and completes
onboarding. After that, changes autosave with version checks (like the profile).

## How the preview works

```
settings ─▶ searches (one per role, max 4; a single chosen state narrows the search)
         ─▶ LinkedIn + JobStreet in parallel (2 requests at a time per site, cached 1 hour)
         ─▶ AI relevance screen per role (ilmu-v3.1, cached 7 days per role+title)
         ─▶ filters (freshness, place, work mode, type, level, pay, words, companies)
         ─▶ duplicates across sites merged (company + title, richer listing kept)
         ─▶ counts, reasons, newest six
```

- **Why an AI screen?** Job sites match keywords loosely: "AI Engineer" also returns
  "Support Engineer, L1". Embeddings and the reranker couldn't separate these reliably on short
  titles (tested 2026-10-04); `ilmu-v3.1` did, including Malay titles, in under a second.
- Each role is screened on its own, so **adding a role can only add jobs**.
- If the AI is unavailable, a keyword rule keeps the preview working.
- Missing data never drops a job: a card without a salary passes the pay check unless you
  turned that off; the brief re-checks with full job details.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/radar` | Settings (or profile-based defaults), version, next brief time, searches |
| `PUT` | `/api/v1/radar` | Save `{settings, version}`; 409 on a stale version; 422 `no_roles` |
| `GET` | `/api/v1/radar/options` | Malaysian places and job sites (with availability) |
| `POST` | `/api/v1/radar/suggest` | AI role suggestions and levels from the profile (202, a [background task](10-background-work.md)) |
| `POST` | `/api/v1/radar/preview` | Run the searches now for the given settings (202, a background task) |

Limits: 40 previews and 20 suggestion runs per user per hour.

## Data

`radars`: `settings` (validated `RadarSettings` JSON), `version`, `next_brief_at` (UTC,
indexed, null when paused; the scheduler in M4 picks due radars with one query).

## Tests

- `tests/unit/radar/`: places and aliases, level and work-mode inference, every filter
  reason, duplicates, settings validation, brief scheduling across time zones, search
  building, profile defaults, keyword fallback.
- `tests/integration/test_radar.py`: defaults, save/versioning/onboarding/pause, options,
  suggestions, preview end to end with fake sites (counts, reasons, cache reuse, adding a role
  only adds), a failing site, missing roles.
