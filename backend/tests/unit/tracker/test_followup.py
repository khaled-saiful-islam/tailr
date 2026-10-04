from __future__ import annotations

import uuid
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

import pytest

from app.ai.fake import FakeAIClient
from app.core.errors import UpstreamError
from app.modules.tracker.followup import FollowUpFacts, _Draft, draft_follow_up, template
from app.modules.tracker.nudges import when

USER = uuid.uuid4()
FACTS = FollowUpFacts(
    applicant="Nur Aina Rahman",
    title="Senior AI Engineer",
    company="Selat Pay",
    applied_on=datetime(2026, 9, 28, 3, 0, tzinfo=UTC),
    contact="Wei Ling",
    source="I built a RAG assistant used by 40,000 staff.",
    language="en",
)


def answer(body: str) -> Any:
    return lambda messages, schema: _Draft(subject="Following up", body=body)


async def test_a_truthful_draft_is_kept(fake_ai: FakeAIClient) -> None:
    body = (
        "Hello Wei Ling,\n\nI applied for Senior AI Engineer on 28 Sep. My RAG assistant "
        "serves 40,000 staff. Is there an update on next steps?\n\nThank you,\nNur Aina Rahman"
    )
    fake_ai.on("tracker.follow_up", answer(body))
    subject, text = await draft_follow_up(FACTS, USER)
    assert subject == "Following up"
    assert "40,000 staff" in text


@pytest.mark.parametrize(
    "body",
    [
        "Hello,\nI grew revenue 300% at Selat Pay.\nNur Aina",  # invented number
        "Hello [Name],\nJust checking in.\nNur Aina",  # placeholder
        "Hello,\nJust checking in.\nRegards",  # no name
    ],
)
async def test_an_untrue_draft_falls_back(fake_ai: FakeAIClient, body: str) -> None:
    fake_ai.on("tracker.follow_up", answer(body))
    subject, text = await draft_follow_up(FACTS, USER)
    assert subject == "Following up on my application: Senior AI Engineer"
    assert text.startswith("Hello Wei Ling,")
    assert "28 Sep" in text
    assert text.endswith("Nur Aina Rahman")


async def test_falls_back_when_the_ai_is_down(fake_ai: FakeAIClient) -> None:
    def down(messages: Any, schema: Any) -> Any:
        raise UpstreamError("busy")

    fake_ai.on("tracker.follow_up", down)
    _, text = await draft_follow_up(FACTS, USER)
    assert "Could you tell me the timeline" in text


def test_malay_template() -> None:
    draft = template(replace(FACTS, language="ms", contact=None))
    assert draft.subject == "Susulan permohonan: Senior AI Engineer"
    assert draft.body.startswith("Salam sejahtera,")
    assert "28 Sep" in draft.body


def test_reminder_times_are_local() -> None:
    moment = datetime(2026, 10, 6, 2, 0, tzinfo=UTC)
    assert when(moment, "Asia/Kuala_Lumpur") == "Tue 6 Oct, 10:00 am"
