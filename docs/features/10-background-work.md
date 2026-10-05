# Working in the background

**Status:** shipped after M9.

Nothing slow makes you wait. Job searches, reading a CV, preparing an application, improving
a CV and every AI writing action run on the server while you keep using Tailr. Leaving the
page loses nothing: results stay on the task, and longer work sends a notification when it's
done.

## What runs in the background

| Action | Where | When it's done |
|---|---|---|
| Find new jobs (the daily search, or **Find new jobs now**) | Home, Jobs | Jobs appear on your Jobs page; a notification says how many |
| Read a CV you uploaded | My profile | The check-your-details page; a notification |
| Prepare an application | A job | The application page; a notification |
| Improve my CV with AI | My CV | The new version, with undo; a notification |
| Add a job by link or pasted text | Jobs | The job appears on your Jobs page; a notification links to it |
| Suggest job titles from my CV | Job preferences | Suggestions to pick from |
| A quick look at what your preferences find (only when you press **Check now**) | Job preferences | Sample jobs and counts, kept with when they were checked |
| Improve this point / write my summary | My profile | A suggestion to accept or ignore |
| Suggest key numbers / draft with AI | My website | Suggestions to use or dismiss; a notification for drafts |
| Draft a follow-up email | An application's page | The draft, saved on the application; a notification |
| Build my full interview plan | Your application › Interview prep | The plan; a notification |
| Get feedback on a practice answer | Your application › Interview prep | Scores and a tighter version, kept per question |

Quick checks still answer straight away (a link Tailr can't open, a pasted ad that's too
short, no job titles to search for), so mistakes show where you made them.

## What you see

- **Working on it**, next to the notification bell (side rail on a computer, top bar on a
  phone): an hourglass, which turns into a spinner with a count while anything runs. Its
  list shows each task with its title, what it's doing now ("Reading each job ad"), how long
  ("Running for 2 minutes", "Finished 5 minutes ago"), and **Open** when it's done; a
  failed task shows its reason. Empty: "Nothing running. Slow work like job searches and AI
  writing happens here, so you can keep using Tailr." Keyboard accessible; Escape returns
  focus to the button.
- The button you pressed says what's happening ("Suggesting…", "Drafting…", "Writing…")
  while the rest of the page stays usable.
- A job search shows as a slim banner above your jobs, never a screen you have to watch.
- When something finishes while you're on another page, a small message with **Open** tells
  you. Longer work lands in your notifications instead (so you never get both):

  | Notifies when done (and when it fails) | A small message instead, only if you're elsewhere |
  |---|---|
  | job search, CV read, application prepared, CV edit, job added, website draft, follow-up email, interview plan | job title ideas, a quick look, key numbers, improve a point, your summary, practice feedback |

- Coming back to a page picks up where it left off: a page shows its latest task of that kind
  if it's still running, or if it finished recently and you haven't used or dismissed the
  result (within an hour for suggestions and drafts; the latest quick look always shows).

## How it works

One table, `background_tasks`, holds each task: its kind, status (queued, running, done,
failed), a title and the current step for people, its input, its result or a plain error,
and where to see it. Work that already had its own pipeline (job searches, CV reads,
prepared applications, CV edits) keeps its own tables; the task list reads them too, so
there's one place that says "working on it".

- Starting: the endpoint runs the quick checks, then `BackgroundService.start` saves the task,
  queues `background.run` on the taskiq worker and answers **202** with the task. Asking twice
  for the same thing while it runs returns the first task; at most six run at once per person
  (`too_many_tasks`). When it's known up front, the task carries its `link` from the start
  (a follow-up: `/applications/{id}`), so a page can recognise its own running work on any
  device.
- Running: `runner.run` marks it running, calls the handler for its kind
  (`background/handlers.py`, each one calling the feature's own service), keeps the result,
  and sends a notification for longer work. Every change publishes the live event `task`;
  the browser refetches, and polls gently while something runs in case an event is missed.
- Failing: the task keeps a plain message ("That's a lot of suggestions for one hour. Try
  again a little later."), never a stack trace. Work that notifies when done also notifies
  when it fails.
- Tidying: tasks older than seven days are removed each night.

### Kinds

| Kind | Started by | Link when done | Notifies |
|---|---|---|---|
| `job.add` | `POST /jobs/paste` | `/jobs/{match}` | yes |
| `preferences.suggest` | `POST /radar/suggest` | `/preferences` | no |
| `preferences.preview` | `POST /radar/preview` | `/preferences` | no |
| `profile.improve_point` | `POST /profile/coach/bullet` | `/profile` | no |
| `profile.summary` | `POST /profile/coach/summary` | `/profile` | no |
| `website.highlights` | `POST /public-profile/highlights/suggest` | `/profile/website` | no |
| `website.draft` | `POST /public-profile/draft` | `/profile/website` | yes |
| `applications.follow_up` | `POST /applications/{id}/follow-up/draft` | `/applications/{id}` | yes |
| `interview.plan` | `POST /kits/{id}/interview/plan` | `/apply/{id}?tab=interview` | yes |
| `interview.feedback` | `POST /kits/{id}/interview/feedback` | `/apply/{id}?tab=interview` | no |

The list also shows work from its own pipelines, read from their tables: `job.search`
(briefs), `application.prepare` (kits), `cv.read` (CV imports) and `cv.improve` (CV edits).

### In the browser (`src/features/tasks/`)

- `useBackgroundTask(start, { onDone, onFailed })` (`api.ts`): `run()` returns at once,
  `running` stays true until the task finishes, and `result` appears when it's done.
- `useLatestTask(kind)`: the latest task of a kind, for a result left from an earlier visit.
  `useResumableTask` builds on both: it shows your own task, or one left behind that still
  belongs on the page, and `dismiss()` puts an answer away for good (remembered in this
  browser).
- `useTasks()` (mounted once, in the app shell) follows the list with live events and
  gentle polling; other readers use `useTaskList()`.
- `TaskTray.tsx` is the tray; `useTaskAlerts.ts` and the pure `describe.ts` decide when a
  finished task deserves a message (never on first load, never twice, never for work that
  notifies, never when you're already on its page).

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/tasks` | Everything running, and what finished in the last hour (`items`, `running`) |
| GET | `/api/v1/tasks/{id}` | One task, with its result when done |
| GET | `/api/v1/tasks/latest/{kind}` | The latest task of a kind, or nothing |

Every endpoint in the kinds table answers **202** with a task.

## Code and tests

- Backend: `app/modules/background/` (`models`, `schemas`, `service` for starting and the
  combined list, `runner`, `handlers`, `router`, `tasks` with `background.run` and the nightly
  `clear_old`); migration `20261004_7ea7bc3dd486_background_tasks.py`.
- Frontend: `src/features/tasks/` (`api.ts`, `useResumableTask.ts`, `TaskTray.tsx`,
  `useTaskAlerts.ts`, `describe.ts`).
- Tests: `tests/integration/test_background.py` (results and failures kept, quick checks
  answer at once, privacy, a running task keeps its link and isn't started twice), plus the
  202 flows in each feature's tests via `tests/background.py`; frontend
  `features/tasks/__tests__/` (when to announce a finished task; which results come back).
