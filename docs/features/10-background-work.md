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
| Improve my CV with AI | My CV | The new version, with undo |
| Add a job by link or pasted text | Jobs | The job appears on your Jobs page; a notification links to it |
| Suggest job titles from my CV | Job preferences | Suggestions to pick from |
| A quick look at what your preferences find (only when you press **Check now**) | Job preferences | Sample jobs and counts, kept with when they were checked |
| Improve this point / write my summary | My profile | A suggestion to accept or ignore |
| Suggest key numbers / draft with AI | My website | Suggestions to use or dismiss; a notification for drafts |
| Draft a follow-up email | My applications | The draft, saved on the application; a notification |

Quick checks still answer straight away (a link Tailr can't open, a pasted ad that's too
short, no job titles to search for), so mistakes show where you made them.

## What you see

- **Working on it**, next to the notification bell (side rail on a computer, top bar on a
  phone): a spinner and a count while anything runs. It lists each task with what it's doing
  now ("Reading each job ad"), how long it's been running, and **Open** when it's done.
- The button you pressed says what's happening ("Suggesting…", "Drafting…") while the rest
  of the page stays usable.
- A job search shows as a slim banner above your jobs, never a screen you have to watch.
- When something finishes while you're on another page, a small message with **Open** tells
  you. Longer work also lands in your notifications.

## How it works

One table, `background_tasks`, holds each task: its kind, status (queued, running, done,
failed), a title and the current step for people, its input, its result or a plain error,
and where to see it. Work that already had its own pipeline (job searches, CV reads,
prepared applications, CV edits) keeps its own tables; the task list reads them too, so
there's one place that says "working on it".

- Starting: the endpoint runs the quick checks, then `BackgroundService.start` saves the task,
  queues `background.run` on the taskiq worker and answers **202** with the task. Asking twice
  for the same thing while it runs returns the first task; at most six run at once per person
  (`too_many_tasks`).
- Running: `runner.run` marks it running, calls the handler for its kind
  (`background/handlers.py`, each one calling the feature's own service), keeps the result,
  and sends a notification for longer work. Every change publishes the live event `task`;
  the browser refetches, and polls gently while something runs in case an event is missed.
- Failing: the task keeps a plain message ("That's a lot of suggestions for one hour. Try
  again a little later."), never a stack trace. Work that notifies when done also notifies
  when it fails.
- Tidying: tasks older than seven days are removed each night.

The frontend uses one hook, `useBackgroundTask(start, { onDone, onFailed })`
(`src/features/tasks/api.ts`): `run()` returns at once, `running` stays true until the task
finishes, and `result` appears when it's done. `useLatestTask(kind)` lets a page show a
result left from an earlier visit.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/tasks` | Everything running, and what finished in the last hour (`items`, `running`) |
| GET | `/api/v1/tasks/{id}` | One task, with its result when done |
| GET | `/api/v1/tasks/latest/{kind}` | The latest task of a kind, or nothing |

These now answer **202** with a task: `POST /jobs/paste`, `/radar/suggest`,
`/radar/preview`, `/profile/coach/bullet`, `/profile/coach/summary`,
`/public-profile/highlights/suggest`, `/public-profile/draft` and
`/applications/{id}/follow-up/draft`.
