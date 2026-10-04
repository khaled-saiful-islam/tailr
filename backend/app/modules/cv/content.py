"""A CV's words, first taken straight from the profile."""

from __future__ import annotations

import re

from app.modules.kits.schemas import (
    TailoredBullet,
    TailoredProject,
    TailoredResume,
    TailoredRole,
)
from app.modules.profile.document import Bullet, ProfileDocument

PLACEHOLDER = re.compile(r"\[[^\]]{1,40}\]")
MAX_SKILLS = 30


def _lines(bullets: list[Bullet]) -> list[TailoredBullet]:
    """Every finished line, citing itself. Unfinished ones ("by [X%]") stay out."""
    return [
        TailoredBullet(text=b.text, fact_ids=[b.id])
        for b in bullets
        if not PLACEHOLDER.search(b.text)
    ]


def content_from_profile(document: ProfileDocument) -> TailoredResume:
    return TailoredResume(
        headline=document.basics.headline or "",
        summary=document.basics.summary or "",
        roles=[
            TailoredRole(experience_id=role.id, bullets=_lines(role.bullets))
            for role in document.experiences
        ],
        projects=[
            TailoredProject(project_id=project.id, bullets=_lines(project.bullets))
            for project in document.projects
        ],
        skills=[skill.name for skill in document.skills][:MAX_SKILLS],
    )
