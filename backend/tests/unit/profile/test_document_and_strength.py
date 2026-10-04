from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.ai.schema import strict_json_schema
from app.modules.profile.document import (
    Bullet,
    Experience,
    ProfileDocument,
    ProfileDraft,
    Skill,
    draft_to_document,
)
from app.modules.profile.service import merge_documents, profile_as_text
from app.modules.profile.strength import bullet_issues, has_metric, score_profile
from tests.factories import sample_draft


def test_draft_gets_ids_and_clean_text() -> None:
    draft = sample_draft()
    draft.experiences[0].bullets[0].text = "  Built   a RAG   assistant  "
    document = draft_to_document(draft)
    assert document.experiences[0].id
    assert document.experiences[0].bullets[0].text == "Built a RAG assistant"
    ids = [getattr(item, "id", None) for item in document.all_items()]
    assert len(ids) == len(set(ids))


def test_empty_entries_are_dropped() -> None:
    draft = sample_draft()
    draft.experiences[0].bullets.append(
        draft.experiences[0].bullets[0].model_copy(update={"text": "   "})
    )
    draft.skills.append(draft.skills[0].model_copy(update={"name": " "}))
    document = draft_to_document(draft)
    assert all(b.text for b in document.experiences[0].bullets)
    assert all(s.name for s in document.skills)


def test_current_role_has_no_end_date() -> None:
    experience = Experience(
        title="X", company="Y", current=True, end={"year": 2024, "month": 1}, bullets=[]
    )
    assert experience.end is None


def test_duplicate_ids_are_rejected() -> None:
    with pytest.raises(ValidationError):
        ProfileDocument(
            skills=[
                Skill(id="same", name="Python", category="tool"),
                Skill(id="same", name="Go", category="tool"),
            ]
        )


def test_duplicate_skill_names_are_merged() -> None:
    document = ProfileDocument(
        skills=[Skill(name="Python", category="tool"), Skill(name="python", category="technical")]
    )
    assert [s.name for s in document.skills] == ["Python"]


def test_strong_profile_scores_high() -> None:
    strength = score_profile(draft_to_document(sample_draft()))
    failing = {check.key for check in strength.checks if not check.done}
    assert failing == set()
    assert strength.score == 100


def test_empty_profile_scores_zero_with_hints() -> None:
    strength = score_profile(ProfileDocument())
    assert strength.score == 0
    assert all(check.hint for check in strength.checks)
    assert sum(check.weight for check in strength.checks) == 100


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Responsible for evaluation pipelines.", {"weak_opener", "no_metric", "too_short"}),
        ("Cut serving cost by 38% by batching requests across services.", set()),
        ("Led two squads to ship the onboarding redesign on time.", set()),
        ("Built evaluation pipelines that cut regressions by [X%].", {"placeholder", "no_metric"}),
    ],
)
def test_bullet_issues(text: str, expected: set[str]) -> None:
    assert set(bullet_issues(Bullet(text=text))) == expected


def test_has_metric_reads_words_and_digits() -> None:
    assert has_metric("Grew revenue 3x")
    assert has_metric("Managed a team of five")
    assert not has_metric("Improved the developer experience")


def test_merge_adds_without_overwriting() -> None:
    current = draft_to_document(sample_draft())
    current.basics.headline = "My own headline"
    incoming_draft = sample_draft()
    incoming_draft.basics.headline = "Imported headline"
    incoming_draft.experiences[0].bullets.append(
        incoming_draft.experiences[0]
        .bullets[0]
        .model_copy(update={"text": "Mentored 6 graduates."})
    )
    incoming_draft.skills.append(incoming_draft.skills[0].model_copy(update={"name": "Go"}))
    merged = merge_documents(current, draft_to_document(incoming_draft))

    assert merged.basics.headline == "My own headline"
    assert len(merged.experiences) == 2
    texts = [b.text for b in merged.experiences[0].bullets]
    assert "Mentored 6 graduates." in texts
    assert len(texts) == len(set(t.casefold() for t in texts))
    assert {s.name for s in merged.skills} >= {"Python", "Go"}


def test_profile_as_text_mentions_roles_and_skills() -> None:
    text = profile_as_text(draft_to_document(sample_draft()))
    assert "Senior AI Engineer at Selat Pay (2023 to present)" in text
    assert "Skills: Python" in text


def test_strict_schema_is_accepted_shape() -> None:
    schema = strict_json_schema(ProfileDraft)
    assert "$defs" not in str(schema)
    assert schema["additionalProperties"] is False
    experience = schema["properties"]["experiences"]["items"]
    assert set(experience["required"]) == set(experience["properties"])
    assert "title" in experience["properties"]  # property names survive, metadata titles don't
