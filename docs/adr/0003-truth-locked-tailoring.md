# ADR 0003: Truth-locked tailoring

- **Status:** accepted (2026-10-04)
- **Context:** M5, Apply Kit

## Context

A tailored resume is only useful if every claim in it is true: an invented metric can cost
someone the job at interview, or later. Language models rewrite well but also embellish:
they round numbers up, borrow achievements from other roles, add skills the job asks for,
and leave `[placeholders]`. In testing, a single prompt telling the model "don't invent"
reduced this but didn't stop it.

## Options

1. **Prompt only**: ask the model to stay truthful and trust the output.
2. **AI judge only**: a second model call reviews each line against its source.
3. **Citations + deterministic checks + AI judge**: every line must cite the profile facts
   it was written from; code checks what can be checked exactly; a judge catches the rest;
   anything that fails falls back to the user's own words.

## Decision

Option 3.

- The tailoring prompt gets the profile with an id on every role, project and fact, and
  must return `fact_ids` for every line.
- Deterministic rules (`app/modules/kits/checks.py`): citation from the same role, numbers
  must appear in the cited facts, no placeholders, skills only from the profile, all roles
  present in profile order.
- The judge (`kits.judge`, temperature 0) flags lines that claim more than their facts.
  If the judge is unavailable, the deterministic rules still apply.
- A failing line is replaced by the cited fact's original text (or dropped if that fact has
  a placeholder). Every change is reported to the user.
- Non-English kits translate restored lines; a translation is kept only if its numbers
  match the original exactly (`app/modules/kits/localise.py`).
- Edits the user makes afterwards are theirs and are not re-checked.

## Consequences

- Users can see why to trust the kit: lines checked, lines corrected (with before and
  after), skills left off.
- A corrected line can read less polished than the rest, because it's the user's own
  wording. That trade-off is deliberate: truth beats polish.
- Rule checks are cheap and fully unit-tested; the judge adds one AI call per kit.
- The cover letter and extras are generated from the same fact-tagged profile but aren't
  line-checked; they're prose, and the user reviews them before sending.
