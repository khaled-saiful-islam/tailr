# Preparing an application, interview prep and notifications

**Status:** shipped in M5.

> **Users see:** *Prepare my application* and *Your application* (`/apply/<id>`), with four steps: check your CV, check your cover letter, apply on the job site, mark as applied. "Kit" is the internal name; the fact check is shown as *Why you can trust this*.

Pick a job and Tailr writes the application for it: a tailored resume, a cover letter,
answers for the application form, a note to the recruiter and interview prep. Every line is
checked against the profile before it's shown. It runs in the background; Tailr says when
it's ready. Jobs found elsewhere can be added by link or by pasting the ad.

## What users see

### On a job (`/jobs/:id`)

- **Prepare my application** sits in the **How well you match** panel, under the score,
  with a language choice (English or Bahasa Malaysia).
- Starting it doesn't leave the page. A toast says it takes about a minute, with a
  **Watch** link. The button turns into **Preparing your application** (with a spinner),
  then **Open my application** when it's done. A notification says when it's ready.
- The first time, the browser asks whether Tailr may send notifications (only after this
  click, never on page load).

### Add any job

**Add a job by link** on the Jobs page (and on My applications):

- **Paste a link**: LinkedIn and JobStreet links work best (read through their job sources);
  any other public page is read best-effort.
- **Paste the ad**: job title, company and the whole description (at least 200 characters;
  the dialog counts down and says "Looks complete.").
- Quick problems answer inside the dialog at once: a link Tailr won't open (private or local
  addresses), too short, no title or company, no profile yet.
- Otherwise the dialog closes straight away: "Adding the job in the background. It'll
  appear on your Jobs page; we'll let you know." The job is read by the AI, measured like a
  found job and saved; the notification **Job added: {title}** ("Teratai Bank. A 93% match.")
  opens it. If the link can't be read, **Couldn't add that job** says why (paste the ad
  instead). Added jobs stay on the Jobs page until removed.

### Your application (`/apply/:id`)

From top to bottom:

- **Breadcrumb** *Jobs › {job title} › Your application* (the side menu keeps **Jobs** lit),
  the job and company, **View the ad on the job site**, the match tape, and a status pill:
  *Ready to check and send*, *Being written*, *Applied 3 Oct* or *Didn't finish*.
- **Four steps to apply**, with "N of 4 done" and a bar:
  1. **Check your CV**: opens the CV tab. Ticks when you download the PDF.
  2. **Check your cover letter**: opens the Cover letter tab. Ticks when you copy or download it.
  3. **Apply on LinkedIn/JobStreet**: opens the ad. Ticks when you open it.
  4. **Mark as applied**: **I've applied** moves it to Applied on My applications and ticks
     every step; Tailr reminds you to follow up after a week.

  The next step is highlighted ("Next"); ticks animate in and are kept in this browser.
- **How it's written**: "Now: English, confident tone."
  - Language: **English** ("Most job ads in Malaysia") or **Bahasa Malaysia** ("When the ad
    is in Malay").
  - Tone, each with its own icon and an example line: **Confident** ("Direct, leads
    with results"), **Warm** ("Friendly, shows why you care about the work"), **Concise**
    ("Short and to the point").
  - Both groups mark the pick the same way (the accent border, a light tint and a check);
    **Now** marks the version you have. These are radio cards (arrow keys work). Picking something different opens a row:
    "Tailr writes a fresh CV, cover letter and answers. Edits you made to this version are
    replaced." with **Keep it as it is** and a button that names the change (**Rewrite in
    Bahasa Malaysia, warm tone**); it asks once more before replacing. While it writes,
    the card says "Writing it now in …".
- **Why you can trust this**: one line ("Every line comes from your profile (10 checked, 1
  fixed). It uses 88% of the skills the ad asks for, up from 63%."), with **Show details**:
  - each line that went too far, what it said and what it says now;
  - skills from the ad left off because they aren't in your profile;
  - before/after keyword coverage, each skill marked covered or not in your profile.
- Tabs (the underline slides; content slides in; finished steps show a tick):
  - **CV**: edit the headline, summary, every line (each shows the profile facts it was
    written from) and skills; a live preview of the exact document the PDF prints;
    **Download PDF**.
  - **Cover letter**: greeting, paragraphs, closing, a word count; live preview;
    **Copy text** and **Download PDF**.
  - **Form answers**: likely application-form questions answered from the profile, and a
    short note to the recruiter, each with **Copy**.
  - **Interview prep**: see below.
- Edits save as you type (versioned, so another tab never silently overwrites them). Edits
  are the user's own and aren't re-checked. On phones the editor and preview switch with
  **Edit / Preview**; single-line fields wrap instead of cutting text off.
- `?tab=interview` (or `resume`, `letter`, `answers`) opens straight on that tab; the tab you
  pick is kept in the address.
- While it's being written: a page filling with lines beside a running stitch, and three
  stages (Reading the job ad, Writing your CV and cover letter, Checking every line). "This
  takes a minute or two. You can leave this page; Tailr keeps going."

### Interview prep (the fourth tab)

Five likely questions come with every application (why they ask, and the story from your
profile that answers each). **Build my full plan** turns that into a full preparation, built
in the background in about a minute; a notification (**Your interview plan is ready**)
links back here, and a build started earlier is picked up when you return.

| Part | What it is |
|---|---|
| **Ready for N of M** | A progress bar of the questions you've marked **I'm confident**, and **Practise all** |
| **Tell me about yourself** | A spoken answer of about a minute (the time to say it is shown), from your own facts, with the facts it uses. **Practise it in your words** |
| Filters | **All**, **Not confident yet**, and one per kind, with counts |
| **The job's skills** | What this job needs, asked the way the hiring manager would |
| **Your past work** | "Tell me about a time…" questions, built around your strongest facts for this job |
| **Why this job** | Why them and why now, from what the ad says |
| **Skills to explain** | Must-haves your profile doesn't show yet: be honest, then bridge from related work |
| **What would you do** | Real situations from this job, thought through step by step |
| **Questions to ask them** | Five questions specific to the ad, each with what the answer tells you |
| **Before the day** | A checklist (parts of the ad to re-read, your numbers to have ready, stories to rehearse); ticks kept in this browser |

Each question opens to: **Why they ask**, **A strong answer covers** (three or four coaching
points), **Your story** as Situation, Task, Action, Result with the profile lines it comes
from (or, for a gap, **Bridge from your work**), **They may follow up with**, and the one
pitfall to avoid. Mark it **I'm confident** or **Needs practice**.

- **Practise**: one question at a time, your answer hidden until you reveal your story, an
  optional two-minute timer, next and previous. Keyboard: ← → move, S (or Space) shows the
  story, C marks confident, P needs practice, T starts or pauses the timer.
- **Practise this answer**: type your answer (at least 12 words) and **Get feedback**, in the
  background. You get four scores from 1 to 5 (**Clear story**, **Specific**, **On point**,
  **Length**), a verdict, **What worked**, **Make it stronger**, a tighter version ready to
  say aloud, and **Be ready to back these up** (claims in your answer your profile doesn't
  show). The last attempt per question is kept.
- **Write the plan again** after changing your profile; your marks and practice stay.

**Truth rules for interview prep** (`kits/interview_checks.py`, `interview_judge.py`):

- A story must cite real facts, and every number in it must appear in those facts;
  otherwise it's left out. Pitch and checklist sentences with numbers your profile doesn't
  have are dropped.
- Each story (its set of facts) is told once, where it matters most: past-work questions
  first, then gaps, the job's skills, situations and motivation.
- An AI honesty check (`kits.interview_judge`) reads each story with its question and its
  facts, and each pitch sentence with its facts, and removes anything that claims more
  (a merged claim, an invented step) or a story that doesn't really answer its question.
  If it's unavailable, the number checks still apply.
- Where a story or the tighter answer needs a detail the facts don't give, it says so as a
  highlighted prompt for you to fill in, such as **[how you divided the work]**, instead of
  inventing it.
- If the checks cut the pitch to almost nothing (under 30 words), it falls back to your own
  words: your headline, two of your facts, and a prompt for why this role is your next step.
- Feedback's tighter version may not add numbers; the honesty check removes anything else
  it can't trace to your answer or profile.

### Notifications

- **The bell** (top of the side rail; top bar on phones) lists the latest notifications
  with an unread count. Opening one marks it read and goes to it; **Mark all as read**.
- When something finishes: a toast with **Open** if Tailr is the active tab; a system
  notification if the tab is in the background and permission was given. If you're
  already on the page it links to, it's just marked read.
- Sent for: an application ready or failed; a job search done (new jobs, none, or failed);
  a CV read or not; CV edits ready or failed; a job added (or not); a website draft ready
  (or not); a follow-up email ready (or not); an interview plan ready (or not); a follow-up
  due, and the day before a next step such as an interview; a new message from your website. The newest 100 per person
  are kept. Quicker work without its own notification announces itself with a small toast
  when it finishes on another page (see [background work](10-background-work.md)).

## How a kit is built

```
POST /kits (202) → worker task kits.build
  reading ─▶ tailoring: resume, cover letter, extras (three AI calls in parallel, ilmu-v3.1)
          ─▶ checking: AI judge flags lines that claim more than their facts
                       + deterministic truth check (see ADR 0003)
                       + non-English kits: restored lines translated faithfully
          ─▶ keyword report ─▶ ready ─▶ live event + notification
```

The tailoring prompt sees the profile with an id on every role, project and fact, and must
cite fact ids for every line. The truth check then enforces, without AI:

1. A line cites at least one fact from its own role or project.
2. Every number in a line appears in the facts it cites ("40,000" = "40k"; a unit letter
   must stand alone, so the "k" in "kakitangan" is not a thousand).
3. No unfilled `[placeholders]`; citation tags written into the text are removed.
4. Skills come only from the profile's skill list; others are reported in `skills_removed`.
5. Every role in the profile appears, in profile order; roles the AI left out come back
   with their original facts.

A line that fails (or that the judge flagged) is restored to the fact's own wording, or
dropped if that fact has a placeholder. In a Bahasa Malaysia kit, restored lines are
translated, and a translation is kept only if it carries exactly the same numbers.

## API

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/jobs/paste` | Add a job by link or text; quick checks answer at once, then a [background task](10-background-work.md) (202) adds it and notifies with a link to the job |
| POST | `/api/v1/kits` | Start a kit for a match (`language`, `tone`); 202 |
| GET | `/api/v1/kits` | Your kits, newest first |
| GET | `/api/v1/kits/by-match/{match_id}` | The kit for a job, or `null` |
| GET / PUT | `/api/v1/kits/{id}` | Read; save edits with `version` (409 `version_conflict`) |
| POST | `/api/v1/kits/{id}/regenerate` | Write it again, optionally in another language or tone (202) |
| GET | `/api/v1/kits/{id}/resume.html`, `letter.html` | The documents as HTML (preview) |
| GET | `/api/v1/kits/{id}/resume.pdf`, `letter.pdf` | PDFs, printed by the renderer |
| GET | `/api/v1/kits/{id}/interview` | Interview prep: the basic questions, the full plan, practice and marks |
| POST | `/api/v1/kits/{id}/interview/plan` | Build the full plan (202, a background task; 6 a day) |
| POST | `/api/v1/kits/{id}/interview/feedback` | Feedback on a typed answer (202, a background task; 30 an hour) |
| PUT | `/api/v1/kits/{id}/interview/marks` | Mark a question confident, needs practice, or clear |
| GET | `/api/v1/notifications?limit=30` | Latest notifications and the unread count |
| POST | `/api/v1/notifications/{id}/read`, `/read-all` | Mark read (204) |

Live events: `kit.progress`, `kit.ready`, `notification`, `task`.

## Limits and safety

- 20 kits (including rewrites) and 30 added jobs per person per day; 6 interview plans per
  day and 30 practice answers per hour. Every AI call also counts against the daily AI
  allowance (see [settings and admin](09-settings-admin.md)).
- Pasted links are fetched only if they are plain http(s) on the standard port and every
  address the host resolves to is public. Redirects are re-checked hop by hop, the request
  goes to the checked address, and pages are capped at 2 MB of text
  (`app/core/safe_http.py`).
- Kits, documents and notifications are private to their owner (404 for anyone else).

## Code

- Backend: `app/modules/kits/` (`builder`, `checks`, `localise`, `prompts`, `render`,
  `service`, `router`, `templates/`; interview prep in `interview.py`,
  `interview_schemas.py`, `interview_prompts.py`, `interview_checks.py`,
  `interview_judge.py`), `app/modules/jobs/paste.py`, `app/modules/notifications/`,
  `app/core/safe_http.py`.
- Frontend: `src/features/kits/` (`KitPage`, `components/` for the header, steps, writing
  card, trust strip and documents; `interview/` for interview prep), `status.ts` and
  `progress.ts`, `src/features/notifications/`, `src/lib/browserNotifications.ts`.
- Tests: `tests/unit/kits/` (truth checks, interview checks, localisation),
  `tests/unit/core/test_safe_http.py`, `tests/integration/test_kits.py`,
  `tests/integration/test_interview.py`, `tests/integration/test_notifications.py`;
  frontend `src/features/kits/__tests__/` and `src/features/kits/interview/__tests__/`.
