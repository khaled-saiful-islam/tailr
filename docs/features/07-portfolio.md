# Portfolio

**Status:** foundation shipped in M6; the full portfolio site is M7.

A personal website at `/p/<address>`, made from the profile: not a CV, but a portfolio
with photo, about me, expertise, achievements, projects (each with its own page),
career timeline, testimonials and a contact form. One page or several.

## In place (M6)

- **Publishing**: Off / Anyone with the link / Public, a custom address (shared with the
  CV), copy link, open, QR code.
- **Four visual identities**, light and dark, built phone-first with container queries
  so the editor's live preview (desktop and phone frames) is exact:
  Blueprint (engineers), Broadsheet (business), Salon (designers, gallery-led),
  Poster (graduates).
- **Pictures**: a photo and a picture per project. Uploads are checked by their bytes,
  stripped of all metadata (GPS included), resized and re-encoded as WebP.
- **By the numbers**: AI suggests up to four highlights from the profile; every number
  must match the fact it came from.
- **Contact**: an email of the user's choice, revealed only when a visitor clicks
  (never in the page source).
- **Link previews**: the backend writes title, Open Graph and Twitter tags, canonical
  URL, robots, and schema.org `ProfilePage` JSON-LD into the page; a 1200x630 preview
  image is rendered per template.
- **Visits**: counted once per visitor per day with a salted hash (no cookies), never
  bots or the owner, with sources (LinkedIn, WhatsApp, QR, other).
- **Privacy**: no phone, city-level location only, web links only, unfinished lines
  ("by [X%]") never shown, strict Content Security Policy.

## Next (M7)

About me, expertise, achievements and testimonials as their own sections; project
case-study pages (cover, gallery, problem, approach, outcome); a career timeline; a
contact form that reaches the owner's inbox without exposing their email; a one-page or
multi-page choice; AI drafting of the about, expertise and case studies from the
profile, under the same truth rules.

## API (so far)

| Method | Path | What it does |
|---|---|---|
| GET / PUT | `/api/v1/public-profile` | Settings and visits; save (`version`) |
| GET | `/api/v1/public-profile/slug-check?slug=` | Is an address free |
| GET | `/api/v1/public-profile/preview` | The page as visitors would see it |
| POST | `/api/v1/public-profile/highlights/suggest` | Truth-checked highlights |
| GET | `/api/v1/public-profile/qr.svg?page=portfolio\|cv` | QR code |
| POST / DELETE | `/api/v1/images`, `/api/v1/images/{id}` | Upload (avatar, project) or delete a picture |
| GET | `/api/v1/images/{id}.webp` | A picture (public by unguessable id, cached a year) |
| GET | `/api/v1/public/profiles/{slug}`, `/contact` (POST), `/og.jpg`, `/cv.pdf` | For visitors |
| GET | `/p/{slug}` | The portfolio page |

## Code

- Backend: `app/modules/public_profile/`, `app/modules/media/`, `app/core/safe_http.py`.
- Frontend: `src/public/` (page entry, templates, motion kit, actions),
  `src/features/public-page/` (the editor).
