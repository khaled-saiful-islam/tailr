# Profile Builder

**Status:** shipped in M1.

The profile is everything Tailr knows about a person's career. Every tailored resume,
cover letter and match score is built from it, so it has to be complete, accurate and easy
to keep up to date.

## What users see

### Import (`/profile/import`)

- **Drop a CV** on the cutting mat, or choose a file: PDF, Word (.docx), a photo/scan
  (PNG, JPG, WebP) or a .txt file, up to 10 MB. LinkedIn's "Save to PDF" works too.
- **Paste as text** when a file won't open.
- **Start from scratch** goes straight to the builder.

### Reading and review (`/profile/import/:id`)

Live progress, pushed over server-sent events (with polling as a fallback):

| Stage | What happens |
|---|---|
| Uploaded | File stored privately |
| Reading your CV | Text layer extracted (PDF/Word/text); scans and photos are read by the vision model |
| Understanding your experience | The AI turns the text into a structured profile |
| Ready to review | Counts (roles, achievements, skills, qualifications) and a live resume preview |

Nothing is saved until the user chooses **Save to my profile**. If a profile already exists
they choose **Add to my profile** (merge: adds what's new, never overwrites their edits) or
**Replace my profile**. Scanned files carry a note to check names and numbers.

### Builder (`/profile`)

- Sections: About you, Summary, Experience, Projects, Education, Skills, Certifications,
  Languages. Lists can be reordered and items opened/closed.
- **Autosave**: changes save ~1 second after you stop typing. The indicator shows unsaved,
  saving, saved, or a problem with a one-click fix. Saves carry a version number, so an
  edit in another tab is never silently overwritten ("Changed in another tab. Load latest").
- **Profile strength** (0–100, the tape at the top left): ten checks with weights and
  plain-language hints; click one to jump to its section.
- **Achievement hints** on each bullet: *Fill in the [brackets]*, *Starts weakly*,
  *No number yet*, *Too short*, *Long: trim it*.
- **Bullet Coach** (✨ on any achievement): rewrites it with a strong verb and visible impact,
  **never inventing numbers**; where a number would help it puts a `[placeholder]` and asks
  for it. Use it, try again, or keep yours.
- **Write it for me** (Summary): a 40–80 word summary built only from profile facts.
- **Live preview**: an A4 page in the same single-column, ATS-safe layout Tailr's PDFs use
  (beside the editor on wide screens; the Preview button elsewhere).

## How it works

```
upload ─▶ storage (private disk) ─▶ cv_imports row (queued) ─▶ worker: profile.process_import
   reading:        pdfium text layer │ python-docx │ utf-8 │ image → vision OCR (ilmu-vision-v1.3)
   understanding:  ilmu-v3.1, strict JSON schema → ProfileDraft → ids assigned → ProfileDocument
   ready:          draft stored on the import; live event "profile.import"
apply ─▶ replace or merge into profiles.document (version + 1), onboarding moves to "radar"
```

- The profile is one validated JSON document per user (`profiles.document`), see
  [ADR 0002](../adr/0002-profile-as-document.md). Every item has a stable id; bullets are the
  **facts** that tailoring will cite.
- Strength is deterministic (no AI): instant, stable and explainable (`strength.py`).
- AI calls go through `app/ai/client.py`: strict structured output with one repair retry,
  retries with backoff on 429/5xx, a concurrency gate, per-user daily token budget, and every
  call metered in `ai_runs`.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/profile` | Document, version, strength (`exists: false` before the first save) |
| `PUT` | `/api/v1/profile` | Save `{document, version}`; 409 `version_conflict` if stale |
| `POST` | `/api/v1/profile/imports` | Upload a CV (multipart `file`) → 202 + import |
| `POST` | `/api/v1/profile/imports/text` | Paste CV text → 202 + import |
| `GET` | `/api/v1/profile/imports/{id}` | Status, error, draft and stats |
| `POST` | `/api/v1/profile/imports/{id}/apply` | `{mode: "replace" \| "merge"}` |
| `POST` | `/api/v1/profile/coach/bullet` | `{text, title?, company?}` → suggestion, reason, questions |
| `POST` | `/api/v1/profile/coach/summary` | → summary written from the profile |

Limits: 12 imports per hour, 60 coaching calls per hour, AI daily token budget per user.
Error codes: `unsupported_file`, `bad_file`, `file_too_large`, `version_conflict`,
`import_not_ready`, `profile_too_thin`, `rate_limited`, `ai_budget`, `ai_not_configured`.

## Privacy

CVs are stored on the server's private volume (never the web root), readable only through the
owner's account. The extractor ignores IC/NRIC numbers, date of birth, marital status and
religion. Generated documents never include them.

## Tests

- `tests/unit/profile/`: document validation, ids, merge rules, strength checks, bullet
  hints, strict schema conversion, text extraction from real PDF/PNG/DOCX/TXT fixtures.
- `tests/integration/test_profile.py`: save/versioning/conflicts, PDF import end to end (real
  PDF, fake AI), image import via vision, paste + merge, failure messages, bad uploads,
  privacy between users, coach, summary.
- Frontend: `features/profile/__tests__/types.test.ts`, `lib/__tests__/list.test.ts`.
