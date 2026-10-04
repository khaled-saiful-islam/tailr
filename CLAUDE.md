# Tailr — notes for contributors and coding agents

Read `PLAN.md` (scope, decisions, build order) and `docs/architecture.md` first.

## Ground rules

- **Run with Docker via `make`.** `make up`, `make test`, `make lint`. Ports 8400–8405.
- **Tests use `tailr_test`**, never the dev database. Each test rolls back.
- **Backend module shape** is fixed: models · schemas · repository · service · router · tasks.
  Routers are thin; modules talk through services; raise `AppError` subclasses.
- **After a model change:** `make migration m="…"`, review it, then `make up` (the backend
  migrates on start). Then `make gen-api` if the API changed.
- **Frontend:** feature folders, TanStack Query for server data, only design tokens for colour,
  text wraps (never truncate), check 1440/1024/768/390 in light and dark.
- **AI:** ILMU models only, behind `app/ai`. Generated resume content must trace to profile facts.
- **Docs:** every feature gets `docs/features/NN-name.md`; update README's status table and
  PLAN.md checkboxes when a milestone lands.
- **Git:** conventional commits; commit locally; do not push unless the owner asks.

## Default admin

`admin` / `admin` (seeded on start; production refuses this password).
