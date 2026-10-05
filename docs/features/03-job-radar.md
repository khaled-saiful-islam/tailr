# Job preferences (the radar)

**Status:** shipped in M2.

> **Users see:** *Job preferences* (`/preferences`). "Radar" is the internal name. Saving with **Save and find jobs** starts a search straight away and opens the Jobs page.

The radar is what Tailr looks for every morning: which roles, where, at what level and pay,
what to skip, and when the daily search runs. A quick look (**Check now**) scans the real job
sites for the current settings, so you see the effect of your choices before searching for
real. It runs only when you ask.

## What users see (`/preferences`)

| Section | Settings |
|---|---|
| **What job?** | Up to six job titles, and words a job must mention (optional). **Suggest from my CV** (AI, in the background: "Suggesting…") proposes titles, each with a one-line reason, and the levels your experience fits; they stay on the page until you **Hide suggestions**, even if you leave and come back within the hour. |
| **Where?** | Anywhere in Malaysia, or chosen states (a state covers its cities: Selangor includes Petaling Jaya, Cyberjaya, Shah Alam…). On-site, hybrid and/or remote; remote jobs are always kept when remote is allowed. |
| **Pay and job type** | Lowest monthly salary in RM (slider) and **Include jobs that don't show a salary**. Level: intern, entry, mid, senior, lead, manager (none means any). Job type: full-time, contract, part-time, internship. |
| **Leave out** | Words to skip and companies to skip. |
| **Minimum match** | The match % above which jobs are your good matches (30–95%); the rest still show, lower on the Jobs page. |
| **Job sites** | LinkedIn and JobStreet on/off; Indeed and Glassdoor shown as needing Tailr Desktop (coming soon). |
| **Daily job update** | Time (5:00 am to 11:30 am), days of the week, **Only jobs posted in the** last 24 hours / 3 days / week, **Email me the update**, **Pause the daily update**. Shows the next update time. |

**Save and find jobs** saves the preferences, starts a search straight away and opens the
Jobs page, where the search shows as a banner while it runs.

**A quick look** (beside the settings, on top on phones): the radar scope with one contact
per matching job, the count ("16 recent jobs match your preferences, out of 54 posted in the
last 3 days"), results per site, *why* the others were left out (in plain words), and the
newest jobs found, linking to the job sites. It's only a preview: nothing is added to the
Jobs page. The page never searches on its own:

- It shows the last check and when it ran ("Checked 3 hours ago"), from any visit or device.
- When your preferences changed since that check: "You've changed your preferences since
  then. **Check again**".
- It searches only on **Check now** (first time) or **Check again**. A check runs in the
  background (about half a minute) and the rest of the page stays editable; the previous
  answer stays on screen while a new one runs.

First visit: the preferences are filled in from the profile (latest title without "Senior",
city mapped to its state, level from the title), with a note "We filled this in from your
CV". **Save and find jobs** saves them and completes onboarding. After that, changes autosave
with version checks (like the profile).

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
