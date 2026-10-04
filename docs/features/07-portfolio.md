# Portfolio

**Status:** shipped in M7 (foundation in M6).

A personal website at `/p/<address>`, made from the profile. It is a portfolio, not a CV:
photo, about me, what I do, achievements, projects with their own case-study pages, a
career timeline, kind words from others, and a contact form. One page or several.

## What visitors see

| Part | Where it comes from |
|---|---|
| **Hero** | Your line ("I build AI that bank staff actually use."), name, title, city, availability, and actions: see my work, download CV (when the CV is shared), email me |
| **About** | Up to three short paragraphs in your voice, "Currently", quick facts (based in, experience, languages, studied) and interests |
| **What I do** | Three or four areas, each with one sentence and the tools you use there |
| **Achievements** | Highlights "by the numbers", your awards and your certifications |
| **Work** | Every project with its cover; each opens its own page |
| **Case study** (`/p/<address>/work/<project>`) | Overview, role, timeline, team, link, cover, the problem, how I did it, what happened, tools, lessons, a gallery, and the next project |
| **Experience** | Roles and education as a timeline, then skills by group |
| **Kind words** | Up to three real recommendations you paste in. Tailr never writes these |
| **Contact** | A form (job, freelance, or just saying hi), your email button, WhatsApp if you add a number, and your links |

**One page or several.** One page puts every section on home and the navigation scrolls.
Several pages gives Home (hero, achievements, three projects, a short about), About, Work
and Contact. Every address works both ways: `/p/<address>/about` scrolls to About on a
one-page site. Projects always get their own page.

## Four designs

All four are built phone-first with container queries, so the editor's desktop and phone
previews are exact. Each has light and dark modes and respects reduced motion.

| Design | For | Character |
|---|---|---|
| **Blueprint** | Engineers | A spec sheet: grid paper, path labels (`/work`), monospace details, a sidebar on wide screens |
| **Broadsheet** | Business and consulting | A newspaper: serif headlines, rules, a lead story, drop caps on case studies |
| **Salon** | Designers | A gallery: giant type, museum labels, pictures revealed behind a curtain, a "View" cursor |
| **Poster** | Graduates and generalists | Bright shapes, a bento "at a glance", stickers and bold colour |

Big headings never split a word. A heading marked `data-fit` keeps its designed size
unless its longest word ("recommendations" on a phone) is wider than the line, then
shrinks just enough (`src/public/portfolio/fit.ts`).

## The editor (Profile, Portfolio)

Tabs: **Publish** (visibility, address, QR, visits), **Design** (template, light or dark,
one page or several, contact form, WhatsApp, which sections show), **About** (photo,
availability, story, what you do),
**Highlights** (numbers, awards, recommendations), **Projects** (covers, the lead project,
case studies with a gallery), and **Inbox**. Changes save as you type and show in the live
preview at once, before saving.

## AI drafting, under the truth rules

"Draft with AI" writes your line and about, your areas, or every case study, from the
profile. You see each draft before it replaces anything.

- Only profile facts: numbers must appear in the facts they came from; a case study uses
  only its own project's summary and facts; tools come only from your skills.
- A second pass (the judge) reads each statement next to its source and drops anything
  the source doesn't say: an invented decision, reason, tool or result. If the judge is
  unavailable, case studies keep only the overview, outcome and tools.
- Anything Tailr couldn't write is listed under "Tailr needs more from you", in names you
  recognise ("the key decisions behind Policy assistant"), and only for the parts you
  asked for.

## Contact form

The owner's email address is never in the page. A message is stored, emailed to the owner
with Reply-To set to the visitor, and shown in the Inbox and as a notification.

- Bots: a hidden field, and a signed time stamp (sent faster than 3 seconds or older than
  a day) get a normal-looking success and nothing else.
- Limits: 3 messages per sender per 10 minutes, 10 a day, 50 a day per page. Senders are
  identified by a salted hash of their address, never stored raw.
- Link-heavy or repeated messages are flagged in the Inbox.

## Also in place (from M6)

- **Publishing**: Off / Anyone with the link / Public, a custom address shared with the
  CV, copy link, open, QR code.
- **Pictures**: checked by their bytes, stripped of all metadata (GPS included), resized
  and re-encoded as WebP.
- **Link previews**: title, Open Graph and Twitter tags, canonical URL, robots and
  schema.org `ProfilePage` JSON-LD written into the page by the backend, for every
  sub-page too; a 1200x630 preview image per template.
- **Visits**: once per visitor per day with a salted hash (no cookies), never bots or the
  owner, with sources (LinkedIn, WhatsApp, QR, other).
- **Privacy**: no phone unless you add WhatsApp, city-level location only, web links
  only, unfinished lines ("by [X%]") never shown, strict Content Security Policy.

## API

| Method | Path | What it does |
|---|---|---|
| GET / PUT | `/api/v1/public-profile` | Settings, portfolio words and visits; save (`version`) |
| GET | `/api/v1/public-profile/slug-check?slug=` | Is an address free |
| GET | `/api/v1/public-profile/preview` | The page as visitors would see it |
| POST | `/api/v1/public-profile/highlights/suggest` | Truth-checked highlights |
| POST | `/api/v1/public-profile/draft` | Draft story, expertise or case studies (`parts`) |
| GET | `/api/v1/public-profile/messages` | The inbox |
| POST | `/api/v1/public-profile/messages/{id}/read` | Mark a message read |
| DELETE | `/api/v1/public-profile/messages/{id}` | Delete a message |
| GET | `/api/v1/public-profile/qr.svg?page=portfolio\|cv` | QR code |
| POST / DELETE | `/api/v1/images`, `/api/v1/images/{id}` | Upload (avatar, project) or delete a picture |
| GET | `/api/v1/images/{id}.webp` | A picture (public by unguessable id, cached a year) |
| GET | `/api/v1/public/profiles/{slug}`, `/og.jpg` | For visitors: the page data, the preview image |
| POST | `/api/v1/public/profiles/{slug}/contact` | Reveal the email button's address |
| POST | `/api/v1/public/profiles/{slug}/messages` | The contact form |
| GET | `/p/{slug}`, `/p/{slug}/{about,work,contact,work/<project>}` | The portfolio pages |

## Code

- Backend: `app/modules/public_profile/` (`assemble.py` builds the page, `drafting.py`
  the AI drafts and judge, `contact.py` the form, `shell.py` the head tags),
  `app/modules/media/`, `app/modules/notifications/`.
- Frontend: `src/public/portfolio/` (site, router, contact form, fitting),
  `src/public/templates/<design>/` (each design's parts), `src/features/public-page/`
  (the editor).
