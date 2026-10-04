# ADR 0002: Store the profile as one validated document

- **Status:** accepted (2026-10-04)
- **Context:** M1, Profile Builder

## Context

A profile has many nested parts: basics, roles with achievements, projects with
achievements, education, skills, certifications and languages. It is:

- edited by one person, usually a section at a time, with autosave;
- produced in one piece by the AI when a CV is imported;
- read in one piece by matching and tailoring;
- never queried across users ("everyone who knows Kubernetes").

## Options

1. **Normalised tables**: one table per part (experiences, bullets, skills …) with CRUD
   endpoints for each.
2. **One JSONB document per user**, validated by Pydantic on every write, with stable ids on
   every item.

## Decision

Option 2. `profiles.document` holds a `ProfileDocument`; `profiles.version` gives optimistic
concurrency; `profiles.strength` is denormalised for listing.

## Consequences

- One `PUT` saves the whole profile atomically, so autosave and AI imports are simple and
  consistent. Validation (lengths, unique ids, dates) lives in one model.
- Every item carries a stable `id`, so a tailored resume can cite the exact achievements
  ("facts") it used, and the UI can track items across edits.
- Concurrency is explicit: a stale `version` gets `409 version_conflict` instead of a lost update.
- Cross-user analytics on profile contents would need extraction (or a materialised view)
  later. That's acceptable: it's not a v1 need, and job-side analytics use the jobs tables.
- Documents are small (well under 100 KB) so whole-document writes are cheap.
