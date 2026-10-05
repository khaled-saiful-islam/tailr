# Tracker and Momentum

**Status:** shipped in M8.

> **Users see:** *My applications* (`/applications`), with the stages Saved, Preparing, Applied, Interview, Offer, Not successful; *This week* and *What employers want* on Home.

The tracker is where every job you're pursuing lives, from saved to signed. Momentum is what
brings you back: a weekly goal, a streak of brief-check days, an honest funnel, and a pulse of
what your market asks for and pays.

## Tracker (`/applications`)

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

### The page, top to bottom

1. **Needs you now**: what to do today, most urgent first (`next.ts`, `needsYou`).
   - A next step in the next three days: "Technical interview with Selat Pay".
   - A follow-up that's due: "Follow up with Gajah Logistics".
   - An interview whose date has passed: "How did it go with Nusantara Telco?"
   - An application ready to send: "Send your application to Teratai Bank".
   - An interview with no date yet.

   Each one opens the application. When nothing is due, it says so, and points at saved
   jobs still waiting for an application.
2. **All your applications**, the board.
   - Five columns along the path: **Saved, Preparing, Applied, Interview, Offer**. Each has
     its count and a few words on what it holds ("Sent. Waiting to hear back").
   - **Not successful** sits under the board as a drop zone that opens into a list.
   - Each card shows the job, its match, and the **one next thing** (`nextAction`):
     "Prepare your application", "Ready: check it and send it", "Follow up today",
     "Technical interview, Tue 6 Oct, 10:00", "Sent 2 days ago. Waiting to hear back".
   - Drag a card to move it. With a keyboard: Space picks a card up, Left and Right move
     it a stage, Up and Down move it within one, Space drops it, Escape cancels, and
     Enter opens it. Screen readers hear where it is at each step. The lifted card is
     drawn in a portal, so page transitions can't shift it.
   - On phones: one stage at a time as a list, with the stage's meaning under the picker.
3. **How far you've got**: a sentence first ("Of the 8 jobs you've saved, you applied to
   5. 2 led to interviews, and 1 to an offer."), then a bar per step. It counts the
   furthest stage each application reached, so moving a card back never hides progress.
   The card says why these numbers can be bigger than the columns.

### One application (`/applications/<id>`)

A page of its own (it used to be a side sheet). Old links (`/applications?open=<id>`)
redirect here.

- **Header**: back to My applications, the job, its match, links to the ad and job details.
- **Where it stands**: the five steps with a line that fills up to the current one. Press
  a step to move it there. **It didn't work out** closes it. Reaching an interview or an
  offer gets a short confetti burst (none with reduced motion).
- **What to do now**, one card that changes with the stage:

  | Stage | The card |
  |---|---|
  | Saved | **Next: prepare your application** (language and **Prepare my application**), **Mark as applied** if it's already sent, **Not interested any more** (takes it off the board; the job stays on Jobs) |
  | Preparing | While it's written: a running stitch and **Watch it being written**. When ready: three steps, **Open my application**, **Open the job ad**, **I've applied**. If preparing failed: open it to try again |
  | Applied | **Sent. Now, wait to hear back** (or **Next: follow up** after a week), with the follow-up draft below; **I got an interview** / **They said no** |
  | Interview | What it is and when (Tailr reminds you the day before), **Get ready for it**, which links to Interview prep (`/apply/<kit>?tab=interview`, or prepares an application first), then **I got an offer** / **They said no**. After the date: **How did it go?** |
  | Offer | Congratulations, and three things to check before saying yes |
  | Not successful | Said kindly; **Look at other jobs** or **Reopen it** (back to Applied if it was sent, otherwise Saved) |

- **Notes and contact** (folded away until it's sent, or until there's something in it):
  who you're talking to and their email (used by **Open in email**), notes, anything
  coming up (while applied or with an offer), and the date you applied (which you can
  correct). Saved as you type; anything still waiting is sent when you leave.
- **History** (folded): added, each move, next steps, follow-ups.
- **About the job**: where, pay, type, when it was posted, saved and applied.
- **Remove from My applications** (asks first; its notes go with it).

## Follow-up nudges

- **A week after applying**, if you haven't followed up, Tailr sends a notification:
  "Follow up with Selat Pay?", which opens the application's page.
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
| POST | `/api/v1/applications/{id}/follow-up/draft` | Draft a truthful follow-up email (202, a [background task](10-background-work.md); saved on the application and notified) |
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
- Frontend: `src/features/tracker/` (`TrackerPage` with Needs you now, the board and How
  far you've got; `ApplicationPage` with the stage cards in `components/detail/now/`; pure
  logic in `board.ts` and `next.ts`), `src/features/momentum/` (goal, streak, Market Pulse), plus the tracker row
  on the job page and **I've applied** on the kit page.
