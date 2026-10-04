# Morning Brief and Fit

**Status:** shipped in M3 + M4.

Every morning (at the user's chosen time and days) Tailr searches, reads every new job ad,
measures each against the profile, and delivers the jobs that clear the user's bar, each
with a **Fit %** and a plain explanation. Users can also **Run my brief now**.

## What users see

### Today (`/`, once the radar is on)

- Greeting and a one-line summary: "13 new jobs fit you. Your best fit is 76%."
- **Top pick**: the best job given room: Fit tape, the AI's one-line take (chalk-marked:
  written by the AI), why you fit, the gaps worth addressing with a tip each, and Save /
  Not for me / See the full fit.
- **More that fit**: every other match as a row (tape, title, company, place, mode, pay, age,
  the AI's one line), with quick save and dismiss. New jobs have a yellow dot.
- **Today's catch**: found today, new to you, read in full, fit your bar.
- While a brief is being built: live stages (searching, reading each ad, measuring your fit,
  writing your reviews) with counts, pushed over server-sent events. It takes about a minute.
- Before the first brief: when it arrives, and **Run my first brief**.
- Nothing new: "You're all caught up", with ways to widen the radar.
- If nothing clears the bar: the three closest jobs, clearly labelled.

### Jobs (`/jobs`)

Every measured job, newest first, with tabs: All, New, Saved, Not for me (with counts).

### Job detail (`/jobs/:id`)

- The job, company, place, mode, pay, age, applicants, and **View on LinkedIn/JobStreet**.
- **In short**: the AI's two-sentence summary; minimum experience, education, languages,
  whether an agency posted it; **What they ask for**: each must-have skill marked as in your
  profile or not ("5 of 12 in your profile"); anything worth knowing (for example
  commission-only pay).
- **Your fit** panel: the tape, the headline, a bar per part of the score, why you fit, gaps
  with tips. (The *Tailor my application* button arrives with the Apply Kit.)
- The full job ad.
- Opening a new job marks it seen.

### Email

When the radar's "Email me the brief too" is on: subject "13 new jobs fit you this
morning", the top five with their Fit %, and a link to Today. Development email goes to
Mailpit (http://localhost:8405).

## How a brief is built

```
radar searches (LinkedIn + JobStreet, cached, waiting politely on rate limits)
  → AI relevance screen per role → radar filters → skip jobs already shown (any site)
  → job catalog (shared by all users):
        full description (LinkedIn one at a time with pauses; failed fetches retried next brief)
        AI reading per job (ilmu-mini-v3.3): summary, must-have and nice skills, years, level,
            mode, type, pay, languages, education, agency, concerns
        embedding (bge-m3)
  → re-check the radar with what the ad revealed (mode, level, pay, must-have words)
  → quick Fit for every candidate → AI review of the best 15 (ilmu-v3.1)
  → keep jobs at or above the user's bar → matches → live event → email
```

Jobs whose description couldn't be read yet are held back (judging by title alone would be
guesswork) and tried again in the next brief.

### The Fit score

| Part | Weight | How |
|---|---|---|
| Skills | 40 | Share of the ad's must-haves the profile shows (listed skills, or named in achievements; shorthand like k8s ↔ Kubernetes understood), refined by the AI review's skill coverage |
| Role | 20 | Title matches a radar role; penalty when the level is far from the chosen levels |
| Experience | 15 | Profile years (overlapping roles counted once) against the ad's minimum, refined by the AI |
| Location | 10 | Within the chosen places, remote, or unknown |
| Pay | 5 | Against the radar's minimum (unknown pay is neutral) |
| Overall similarity | 10 | Cosine similarity of profile and job vectors |

The AI review (`matching/review.py`) is honest by instruction: a weak fit reads as weak; reasons
must cite profile facts.

### Scheduling

`brief.dispatch_due` runs every five minutes on the single scheduler. It locks due radars
(`FOR UPDATE SKIP LOCKED`), moves each radar's `next_brief_at` forward first (so a slow brief
can never be dispatched twice) and queues `brief.build` for each user. Paused radars have no
`next_brief_at`.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/briefs/today` | Latest brief with matches, next brief time, readiness flags |
| `POST` | `/api/v1/briefs/run` | Build a brief now (202); returns the brief already building if any |
| `GET` | `/api/v1/briefs/{id}` | One brief |
| `GET` | `/api/v1/matches?status=&min_score=&limit=&offset=` | Matches, newest first, with counts per status |
| `GET` | `/api/v1/matches/{id}` | One match with description, AI reading and requirements |
| `PATCH` | `/api/v1/matches/{id}` | `{status: saved \| dismissed \| seen \| new}` |

Limits: 8 manual runs per user per day.

## Data

- `jobs`: the shared catalog (unique per source + external id; fingerprint for cross-site
  duplicates; description; `insights` JSON; 1024-d `embedding` with an HNSW index).
- `briefs`: per user per run (status, stage, stats, error, emailed_at).
- `matches`: one per user and job (unique), score, parts, AI review, status.
- `profiles.embedding` / `embedded_version`: the profile vector, refreshed when the profile changes.

## Tests

- `tests/unit/matching/test_fit.py`: skill aliases, experience years, evidence in achievements,
  each Fit part, level penalties, weights and refinement, insights tidying, re-checking the radar
  after reading.
- `tests/integration/test_brief.py`: a full brief with fake sites and fake AI (screening,
  duplicates across sites, ranking, reviews, email), no repeats in the next brief, below-the-bar
  behaviour, triage and counts, privacy, and the scheduler dispatching due briefs once.
