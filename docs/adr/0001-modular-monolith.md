# ADR 0001: A modular monolith with background workers

- **Status:** accepted (2026-10-04)

## Context

Tailr has request/response features (accounts, profile editing) and slow work (reading CVs,
fetching jobs, matching, tailoring, PDFs). The team is small and wants one codebase that is
easy to run, test and hand over.

## Decision

- One FastAPI codebase split into feature **modules** with a fixed shape
  (models · schemas · repository · service · router · tasks).
- The same image runs as **API**, **worker** and **scheduler** (taskiq on Redis Streams).
- Infrastructure (AI, storage, email, job sources) sits behind small interfaces.
- A separate **Node renderer** only because headless Chromium is the best HTML→PDF engine.

## Consequences

- Modules can be extracted into services later along their existing boundaries if one needs
  to scale independently; until then there is no network or deployment overhead between them.
- Slow work never blocks a request; state that matters is in Postgres, so a worker restart
  loses nothing and the UI can always show progress.
- Exactly one scheduler process must run (documented in `docker-compose.yml`).
