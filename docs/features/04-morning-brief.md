# Jobs, the daily search and the match score

**Status:** shipped in M3 + M4.

> **Users see:** *Home*, *Jobs* and the *daily job update*. "Brief" is the internal name for one search. Since the usability pass, every job a search finds (up to 60 per run) is saved to the Jobs page, best match first; jobs at or above the user's *minimum match* are their *good matches* (counted in `stats.good`, highlighted and emailed), the rest are listed below them. Scores are shown as *% match* (Great 85+, Good 70 to 84, Partial 50 to 69, Weak under 50).

Every morning (at the user's chosen time and days) Tailr searches, reads every new job ad,
measures each against the profile, and adds the jobs to the Jobs page, each with a **% match**
and a plain explanation. Users can also press **Find new jobs now**; the search runs in the
background and never blocks a page.

## What users see

### Home (`/`, once the job preferences are set)

- Greeting and one status line about the latest search: "Tailr found 13 jobs today. 4 are
  good matches." (or that it's searching, didn't finish, or found nothing new).
- **See all jobs** and **Find new jobs now** ("Searching in the background…" toast), and when
  the next daily update runs, with a link to change it.
- **Best matches**: the top three jobs from the latest search (match badge, title, company,
  and why it suits you: Tailr's take or the skills you share), and **See all N jobs**.
- While a search runs: a slim banner ("Searching LinkedIn and JobStreet for new jobs. This
  takes a minute or two; you can keep using Tailr. We'll tell you when they're ready."), the
  current step ("Step 2 of 4: Reading each job ad") and a progress bar; the best matches from
  earlier searches stay visible and clickable underneath.
- Search didn't finish: the reason and **Try again**. Nothing new: "No new jobs this time",
  with **Change preferences** and **Search again**. Before the first search: **Find jobs now**.
- **This week** (weekly goal and streak) and **What employers want** (Market Pulse), see
  [My applications and this week](08-tracker-momentum.md).
- Before the CV and preferences exist, Home shows **Get started** instead (see
  [accounts](01-accounts.md)).

### Jobs (`/jobs`)

- **Find new jobs now** and **Add a job by link** (a link or pasted ad; added in the
  background, see [preparing an application](05-apply-kit.md#add-any-job)).
- Tabs with counts: **All**, **New**, **Saved**, **Hidden**.
- **Good matches** (at or above your minimum match, best first), then **Other jobs** (or
  **Closest jobs** when none is good), folded behind **Show N other jobs** when there are many.
- Each row: the match tape and %, title, company, place, mode, pay, where and when it was
  posted, when Tailr found it ("Found 3 days ago"; "Added …" for jobs you added yourself),
  the one-line reason, and quick **Save** / **Hide**. New jobs have a dot. Rows stagger in.
- While a search runs, the same slim banner as Home sits above the list; the list stays usable.

**How long jobs stay** (`JOBS_KEPT_DAYS = 14`, `brief/service.py`): a job Tailr found stays on
the Jobs page and Home for 14 days, then drops off on its own; the page says so near the
top. Jobs you saved, added yourself (by link or text) or put on My applications stay until
you remove them. Hidden jobs stay on the Hidden tab however old they are. Old jobs are only
hidden, never deleted, so a link to one still opens it. Changing your preferences doesn't
remove earlier jobs; the next search adds jobs that fit the new ones, and the old ones age
out.

### Job detail (`/jobs/:id`)

- Back to Jobs; the title, company, place, mode, pay, where and when it was posted, when it
  was found; **Save job** / **Saved**, **Not interested**, **View on LinkedIn/JobStreet**.
- **In short**: the AI's two-sentence summary; minimum experience, education, languages,
  whether an agency posted it; **What they ask for**: each must-have skill marked as in your
  profile or not ("6 of 8 in your profile"); anything worth knowing (for example
  commission-only pay).
- **How well you match** panel: the tape (it measures out and counts up), what the score
  means, **Tailr's take** (the AI's one-line read: a tinted note with a sparkle, so it's
  clearly Tailr's opinion and not a link), then:
  - **Prepare my application** with a language choice (English or Bahasa Malaysia), or
    **Preparing your application** / **Open my application** once started;
  - the job's place in My applications ("In My applications: Preparing. Open") or
    **Add to My applications**, and **I've applied**;
  - a bar per part of the score (filling and counting up), why you fit, and gaps with tips.
- The full job ad. Opening a new job marks it seen. The side menu keeps **Jobs** lit here.

### When a search finishes

A notification: **New jobs for you** ("13 new jobs: 4 are good matches; the best is at Teratai
Bank"), **No new jobs this time**, or **Your job search didn't finish** with the reason. The
search also shows in **Working on it** while it runs (see [background work](10-background-work.md)).

### Email

When **Email me the update** is on in job preferences: subject "13 new jobs for you this
morning", the best matches (or the closest, if none is strong yet) with their % match and
Tailr's take, and a link to the Jobs page. Development email goes to
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

### The match score (internally, Fit)

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
| `GET` | `/api/v1/matches?status=&min_score=&limit=&offset=` | Matches from the last 14 days (plus saved, added and tracked ones; any age for `status=dismissed`), newest first, with counts per status and `kept_days` |
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
  behaviour, triage and counts, jobs dropping off after 14 days unless saved, applied to or
  hidden, privacy, and the scheduler dispatching due briefs once.
