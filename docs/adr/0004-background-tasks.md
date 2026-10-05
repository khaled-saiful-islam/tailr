# ADR 0004: One generic module for slow work people ask for

- **Status:** accepted (2026-10-04)
- **Context:** after M9, "nothing slow should block me"

## Context

Some work already ran on the worker with its own state in Postgres: job searches (briefs),
CV imports, prepared applications (kits) and CV edits. Every other AI action (suggesting job
titles, the job-preferences preview, improving a line, writing a summary, website drafts,
follow-up emails, adding a job by link) ran inside the HTTP request: 10 to 60 seconds of a
spinner, lost if the person left the page. Users asked for every slow action to run in the
background, with a way to see what's running and a result that waits for them.

## Options

1. **A pipeline per feature**, like briefs and kits: a status column and a task in each
   module. Proven, but eight more copies of the same lifecycle, and no single list of
   what's running.
2. **taskiq's result backend**: results in Redis, keyed by task id. Little code, but Redis
   holds only rebuildable data here, results would expire silently, and nothing records
   who started what or where to look.
3. **One generic module** (`app/modules/background`): a `background_tasks` table (kind,
   status, title, step, input, result, link, error) and one runner that calls a handler per
   kind; each handler calls its feature's own service.

## Decision

Option 3, and the list also reads the existing pipelines' tables.

- An endpoint runs its quick checks first (so mistakes answer at once with 422), then
  `BackgroundService.start` saves the task and queues `background.run`; the response is
  202 with the task. The same kind and input while one runs returns that task; at most six
  run at once per person.
- `runner.run` keeps the result (JSON) and a link to where it shows; longer work sends a
  notification when done or failed. Each change publishes the live event `task`.
- `GET /api/v1/tasks` merges these with running and recently finished searches, kits, CV
  reads and CV edits, so the app has one **Working on it** list.
- The browser follows a task with `useBackgroundTask`; `useLatestTask(kind)` lets a page
  pick up a result from an earlier visit. Pages never start work just because they opened.
- Tasks older than seven days are removed nightly. No migration is needed to add a kind:
  a handler and an entry in `HANDLERS`.

## Consequences

- Leaving a page loses nothing; results and failures are on the task, in plain words.
- Adding slow work is a handler plus a 202 endpoint; the tray, alerts and notifications come
  with it.
- Tests stay simple: under `APP_ENV=test` the broker runs tasks in place, so the 202
  response already carries the finished result (`tests/background.py`).
- Two places hold "running" state (the generic table and the older pipelines). The task list
  hides the difference; moving the older pipelines onto the generic module is possible later
  but not needed.
- Which answers a person used or dismissed is remembered in their browser, not on the task,
  so a dismissed suggestion can reappear on another device within the hour.
