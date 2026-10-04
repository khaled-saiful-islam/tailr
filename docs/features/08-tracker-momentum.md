# Tracker and Momentum

**Status:** shipped in M8.

The tracker is where every job you're pursuing lives, from saved to signed. Momentum is what
brings you back: a weekly goal, a streak of brief-check days, an honest funnel, and a pulse of
what your market asks for and pays.

## Tracker (`/tracker`)

### How jobs get there

| You do this | The job lands in |
|---|---|
| Save a job from your brief or Jobs, or paste one in | **Saved** |
| Tailor an application (build a kit) | **Preparing** (moved forward if it was saved) |
| Press **I've applied** on the kit or job page | **Applied** |
| Press **Add to tracker** on a job page | **Saved** |

Un-saving or skipping a job takes it off the board only if nothing has happened to it yet
(still saved, no kit, no notes, no next step). Jobs saved or tailored before the tracker
existed were added by a one-off migration.

### The board

- Five columns along the path: **Saved, Preparing, Applied, Interviewing, Offer**, and
  **Not this time** as a drop zone under the board that opens into a list.
- Drag a card to move it. With a keyboard: Space picks a card up, Left and Right move it a
  stage, Up and Down move it within one, Space drops it, Escape cancels; Enter opens it.
  Screen readers hear where it is at each step.
- Each card shows the job, its Fit %, and the one thing that matters now: "Time to follow
  up", the next step and when, "Kit ready to send", or how long it has been.
- On phones: one stage at a time as a list (pick the stage above it); moving happens in the
  card's sheet.
- Above the board, the **funnel**: how many applications ever reached each stage and what
  share moved on from the stage before. It counts the furthest stage each one reached, so
  moving a card back never hides progress.

### One application (a sheet, `?open=<id>`)

- The job, links to the ad, its fit and your kit.
- **Where it stands**: the five steps, and *Not this time* (reopen goes back to Applied if
  it was sent, otherwise Saved).
- **Follow up** (while applied): see below.
- **Details**, saved as you type: applied on, next step and when, contact name and email,
  notes. Anything still being saved when you close the sheet is sent at once.
- **History**: added, each move, next steps, follow-ups.
- **Remove from tracker** (asks first; its notes go with it).

Moving to Applied (or past it) records the date, which you can correct.

## Follow-up nudges

- **A week after applying**, if you haven't followed up, Tailr sends a notification:
  "Follow up with Selat Pay?", which opens the application.
- **Draft a follow-up** writes a short email (under 110 words) from your tailored cover
  letter, or your profile's headline and summary. It may add one line on why you fit, from
  those words only. Every number must appear in that source, and there are no placeholders.
  If not, or if the AI is unavailable, a plain template is used instead. A Bahasa Malaysia
  kit gets a Malay note.
- Copy it, **Open in email** (to the contact's address if you saved one), then **I've sent
  it**.
- **Next steps**: the day before a next step with a date, a notification:
  "Technical interview: Selat Pay", with the time in your time zone.

The scheduler checks every 15 minutes (`tracker.send_nudges`). Each nudge is sent once;
changing the next step's date re-arms its reminder.

## Momentum (on Today)

- **This week's goal**: applications marked applied since Monday (your time zone) against
  your weekly goal (5 unless you change it, 1 to 50). It celebrates once when met.
- **Streak**: days in a row you opened your brief. Days with no brief scheduled (your radar's
  days off, or a paused radar) neither count nor break it, and today only breaks it once
  it's over. The week strip shows each day: opened, missed, day off, today, still to come,
  or before your streak began. Best streak too.
- **This week in your market** (Market Pulse), from the jobs Tailr matched to you in the
  last seven days, with no AI involved:
  - the skills they ask for, with the share of jobs and whether your profile shows each one
    (the rest are worth learning);
  - typical monthly pay (the middle of what ads state, to the nearest RM 100) when at least
    three ads state pay, next to your radar's minimum;
  - where you'd work (on-site, hybrid, remote, not stated);
  - who's hiring most.
  It appears once there are at least three matched jobs in the week.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/applications` | The board: every application with its job, fit and kit status, and counts |
| POST | `/api/v1/applications` | Track a match (`match_id`, optional `stage`) |
| GET | `/api/v1/applications/{id}` | One application with its history |
| PATCH | `/api/v1/applications/{id}` | Move (`stage`, `position`) or edit; only sent fields change, `null` clears |
| DELETE | `/api/v1/applications/{id}` | Remove from the tracker |
| POST | `/api/v1/applications/{id}/follow-up/draft` | Draft a truthful follow-up email |
| POST | `/api/v1/applications/{id}/follow-up/done` | Record that you followed up |
| GET | `/api/v1/momentum` | Weekly goal, streak (with this week's days) and funnel |
| PUT | `/api/v1/momentum/goal` | Set the weekly goal |
| GET | `/api/v1/momentum/pulse` | Market Pulse |

Job and kit responses carry `application` (`id`, `stage`, `applied_at`) so their pages show
where the job stands.

## Data

- `applications`: one per user and job, with stage, board position, the furthest stage
  reached, dates, contact, notes, and follow-up state (due, nudged, done, last draft).
- `application_events`: the history.
- `goals`: the weekly target per user.
- `activity_days`: one row per local day the user opened their brief.

## Code

- Backend: `app/modules/tracker/` (`service.py` the board and moves, `followup.py` the
  draft and its truth check, `nudges.py` and `tasks.py` the reminders),
  `app/modules/momentum/` (`streak.py`, `pulse.py`, `service.py`).
- Frontend: `src/features/tracker/` (board, columns, sheet, funnel; pure logic in
  `board.ts`), `src/features/momentum/` (goal, streak, Market Pulse), plus the tracker row
  on the job page and **I've applied** on the kit page.
