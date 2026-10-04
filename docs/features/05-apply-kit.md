# Apply Kit and Notifications

**Status:** shipped in M5.

Pick a job and Tailr writes the application for it: a tailored resume, a cover letter,
answers for the application form, a note to the recruiter and interview prep. Every line is
checked against the profile before it's shown. It runs in the background; Tailr says when
it's ready. Jobs found elsewhere can be added by link or by pasting the ad.

## What users see

### On a job (`/jobs/:id`)

- **Tailor my application** sits in the Your fit panel, under the score, with a language
  choice (English or Bahasa Malaysia).
- Starting it doesn't leave the page. A toast says it takes about half a minute, with a
  **Watch** link. The button turns into **Tailoring your application** (with a spinner),
  then **Open my application** when it's done.
- The first time, the browser asks whether Tailr may send notifications (only after this
  click, never on page load).

### Add a job (`/jobs`, **Add a job**)

- **Paste a link**: LinkedIn and JobStreet links are read through their job sources; any
  other public page is read best-effort.
- **Paste the ad**: title, company and the full description (at least 200 characters).
- If a link can't be read, the dialog switches to **Paste the ad** and says why.
- The job is read by the AI, measured like a brief job, saved, and opened.

### The kit (`/kits/:id`)

- Header: job, company, **View the ad**, the Fit tape.
- A sentence of settings: "Written in [English | Bahasa Malaysia] with a
  [Confident | Warm | Concise] tone." **Tailor again** rebuilds it; replacing a finished
  kit asks first, because edits are lost.
- While it's built: three live stages (reading the job, tailoring, checking every line).
- **Resume PDF**, **Cover letter PDF**, **Copy letter text**, and the save status.
- **Checked against your profile**: how many lines were traced back to facts, how many went
  too far and were put back to the user's own words (with each correction listed), and how
  many skills from the ad were left off because they aren't in the profile.
- **Speaks the job's language**: the share of the ad's skills the resume uses, before and
  after tailoring, with each skill marked as covered or not in the profile.
- Tabs:
  - **Resume**: edit the headline, summary, every line (each shows the profile facts it was
    written from), and skills; a live preview of the exact document the PDF prints.
  - **Cover letter**: greeting, paragraphs, closing, a word count; live preview.
  - **Answers**: four likely application-form questions answered from the profile, and a
    short note to the recruiter, each with **Copy**.
  - **Interview prep**: five likely questions, why they're asked, and the story from the
    profile that answers each (with the facts it uses).
- Edits save as you type (versioned, so another tab never silently overwrites them). Edits
  are the user's own and aren't re-checked.
- On phones the editor and preview switch with **Edit / Preview**.

### Notifications

- **The bell** (top of the side rail; top bar on phones) lists the latest notifications
  with an unread count. Opening one marks it read and goes to it; **Mark all as read**.
- When something finishes: a toast with **Open** if Tailr is the active tab; a system
  notification if the tab is in the background and permission was given. If you're
  already on the page it links to, it's just marked read.
- Sent for: an application ready or failed, a brief ready or failed. The newest 100 per
  person are kept.

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
| POST | `/api/v1/jobs/paste` | Add a job by link or text; returns the match (201) |
| POST | `/api/v1/kits` | Start a kit for a match (`language`, `tone`); 202 |
| GET | `/api/v1/kits` | Your kits, newest first |
| GET | `/api/v1/kits/by-match/{match_id}` | The kit for a job, or `null` |
| GET / PUT | `/api/v1/kits/{id}` | Read; save edits with `version` (409 `version_conflict`) |
| POST | `/api/v1/kits/{id}/regenerate` | Tailor again, optionally in another language or tone |
| GET | `/api/v1/kits/{id}/resume.html`, `letter.html` | The documents as HTML (preview) |
| GET | `/api/v1/kits/{id}/resume.pdf`, `letter.pdf` | PDFs, printed by the renderer |
| GET | `/api/v1/notifications?limit=30` | Latest notifications and the unread count |
| POST | `/api/v1/notifications/{id}/read`, `/read-all` | Mark read (204) |

Live events: `kit.progress`, `kit.ready`, `notification`.

## Limits and safety

- 20 kits and 30 pasted jobs per person per day.
- Pasted links are fetched only if they are plain http(s) on the standard port and every
  address the host resolves to is public. Redirects are re-checked hop by hop, the request
  goes to the checked address, and pages are capped at 2 MB of text
  (`app/core/safe_http.py`).
- Kits, documents and notifications are private to their owner (404 for anyone else).

## Code

- Backend: `app/modules/kits/` (`builder`, `checks`, `localise`, `prompts`, `render`,
  `service`, `router`, `templates/`), `app/modules/jobs/paste.py`,
  `app/modules/notifications/`, `app/core/safe_http.py`.
- Frontend: `src/features/kits/` (`KitPage`, `components/`), `src/features/notifications/`,
  `src/lib/browserNotifications.ts`.
- Tests: `tests/unit/kits/`, `tests/unit/core/test_safe_http.py`,
  `tests/integration/test_kits.py`, `tests/integration/test_notifications.py`.
