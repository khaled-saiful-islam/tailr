# CV Studio

**Status:** shipped in M6.

> **Users see:** *My CV* (`/profile/cv`).

A CV made from the profile, in one of five print-quality designs. Edit it by hand or
with AI (every line checked against the profile), download it as a PDF, or share a
link. Profile, CV and Portfolio sit together under **Profile** as tabs.

## What users see (`/profile/cv`)

- **Download PDF** at the top, always; it waits while edits are saving.
- A live preview of the exact document the PDF prints, with faint lines where pages
  end and a page count. Updates swap in without flashing.
- **Design**
  - Five designs, shown as thumbnails of the user's own CV:

    | Design | Character | Best for |
    |---|---|---|
    | Meridian | Two columns, tinted side panel on every page, serif headings | Most roles |
    | Ledger | Swiss grid, one column, mono labels | Online application systems (ATS) |
    | Atelier | Colour band, bold display name, side column | Modern, creative roles |
    | Monogram | Centred, spacious, fine rules | Senior roles |
    | Broadsheet | Newspaper masthead, drop cap, two columns | Business, communications |

  - Six colours, photo (optional; initials otherwise), spacing (comfortable or compact),
    paper (A4 or US Letter), headings in English or Bahasa Malaysia, show email, show
    phone (own downloads only), and which sections appear.
- **Words**: the same editor as the Apply Kit (headline, summary, every line with the
  profile facts it came from, skills). The user is the author: their edits aren't
  re-checked.
- **AI edits** (run in the background; a notification says when they're done):
  - Polish every line (impact first, sharper headline, new summary)
  - Fit on one page
  - New headline and summary
  - Translate to Bahasa Malaysia / English
  - Free text ("Emphasise leadership. Aim at product manager roles.")
  - After each: what changed, lines checked, lines put back, skills left out, and
    **Undo this change**.
- When the profile changes after the CV was written: a banner offers **Start again from
  my profile** (keeps the design, replaces the words).
- **Share**: Off / Anyone with the link / Public, the address (shared with the
  portfolio), copy link, open, QR code.

## The share page (`/cv/<address>`)

The CV itself, scaled to fit any screen, under a bar with **Download PDF** and **Share**
(phone share sheet, or copy link / WhatsApp / LinkedIn). Link previews show the CV's
first page beside the person's name (rendered by the renderer, 1200x630 JPEG, about
70 KB). A shared CV never shows the phone number. "Anyone with the link" is marked
`noindex`.

## How it works

- `cvs` table: design (`template`, `accent`, `options`), words (`content`, the same
  shape as a tailored resume, every line citing fact ids), `previous_content` for undo,
  `profile_version` (to spot an out-of-date CV), status for background edits,
  visibility, cached preview image.
- Designs are Jinja templates (`app/modules/cv/templates/`) with fonts inlined
  (`app/assets/fonts`, all SIL OFL). The same HTML is the preview, the share page's
  document and the PDF (printed by the renderer with the chosen paper size).
- Meridian's side panel reaches the paper's edge on every page: page margins are drawn
  by table header and footer spacers, which repeat on each printed page.
- AI edits (`app/modules/cv/ai.py`) use the Apply Kit's truth lock: fact-cited lines,
  numbers must match their facts, the AI judge, skills from the profile only, every
  role kept, restored lines translated faithfully. The headline and summary may only
  use numbers that appear in the profile.

## API

| Method | Path | What it does |
|---|---|---|
| GET / PUT | `/api/v1/cv` | Your CV (made on first visit); save design, words, visibility (`version`) |
| POST | `/api/v1/cv/ai` | Start an AI edit: `polish`, `one_page`, `summary`, `translate`, `custom` (202) |
| POST | `/api/v1/cv/undo?version=`, `/reset?version=` | Undo the last change; start again from the profile |
| GET | `/api/v1/cv/document.html?template=&accent=` | The document (preview; overrides don't save) |
| GET | `/api/v1/cv/cv.pdf` | Your PDF |
| GET | `/api/v1/public/cv/{slug}/document.html`, `/cv.pdf`, `/og.jpg` | The shared CV |
| GET | `/cv/{slug}` | The share page |

Limits: 30 AI edits a day; 30 PDF downloads an hour (per person, or per visitor IP).

## Code

- Backend: `app/modules/cv/` (`ai`, `content`, `render`, `og`, `service`, `router`,
  `worker`, `tasks`, `templates/`), `app/assets/fonts.py`.
- Frontend: `src/features/cv/` (`CvStudio`, `components/`), `src/public/CvViewer.tsx`.
- Tests: `tests/unit/cv/`, `tests/integration/test_cv.py`.
