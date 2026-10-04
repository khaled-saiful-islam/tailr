"""Is this job title the kind of job the user is looking for?

Job sites match keywords loosely: a search for "AI Engineer" also returns
"Support Engineer, L1". The AI screens titles against the user's target roles
(understanding seniority variants, related titles and Malay titles). Answers are
cached per role set, so tweaking other settings costs nothing. If the AI is
unavailable, a keyword rule keeps the preview working.
"""

from __future__ import annotations

import hashlib
import re

from pydantic import BaseModel

from app.ai.client import get_ai
from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.redis import get_redis

log = get_logger(__name__)

CACHE_SECONDS = 7 * 24 * 3600
BATCH = 80

SYSTEM = """\
You screen job titles for a job seeker. Their target role is given. For each numbered job
title, decide whether it is the same kind of job or a close variant they would want to see:
the same profession at any seniority, or a closely related title in the same field. Exclude
different professions (support, sales, operations, admin, finance, QA) even if they mention
the same technology. Titles may be in English or Malay. Return the numbers of relevant titles.
"""

# Words that say nothing about the field of a job.
_GENERIC_WORDS = (
    "engineer engineering developer development dev specialist executive officer senior sr snr "
    "junior jr lead principal staff associate assistant intern internship trainee team and of for "
    "in the a an with i ii iii l1 l2 l3 remote hybrid contract full time part"
)
_GENERIC = frozenset(_GENERIC_WORDS.split())


class Screened(BaseModel):
    relevant: list[int]


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9+#]+", text.lower()) if t not in _GENERIC and len(t) > 1}


def keyword_match(roles: list[str], title: str) -> bool:
    """Fallback rule: the title shares a meaningful word with a target role."""
    title_tokens = _tokens(title)
    return any(_tokens(role) & title_tokens for role in roles)


def _role_key(role: str) -> str:
    return "radar:relevance:" + hashlib.sha256(role.casefold().strip().encode()).hexdigest()[:20]


async def _screen_role(role: str, titles: list[str], user_id: object) -> set[str]:
    """Titles relevant to one role; answers cached per role so they never shift."""
    redis = get_redis()
    key = _role_key(role)
    cached = await redis.hmget(key, titles)
    answers: dict[str, bool] = {
        t: v == "1" for t, v in zip(titles, cached, strict=True) if v is not None
    }
    pending = [t for t in titles if t not in answers]
    for start in range(0, len(pending), BATCH):
        batch = pending[start : start + BATCH]
        numbered = "\n".join(f"{index}. {title}" for index, title in enumerate(batch))
        try:
            result = await get_ai().structured(
                [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": f"Target role: {role}\n\nJob titles:\n{numbered}"},
                ],
                Screened,
                purpose="radar.relevance",
                user_id=user_id,  # type: ignore[arg-type]
                temperature=0.0,
                max_tokens=600,
            )
            chosen = {i for i in result.relevant if 0 <= i < len(batch)}
            batch_answers = {title: index in chosen for index, title in enumerate(batch)}
            await redis.hset(
                key, mapping={t: "1" if ok else "0" for t, ok in batch_answers.items()}
            )
            await redis.expire(key, CACHE_SECONDS)
        except AppError as error:
            log.warning("relevance_fallback", error=error.message)
            batch_answers = {title: keyword_match([role], title) for title in batch}
        answers.update(batch_answers)
    return {title for title, ok in answers.items() if ok}


async def relevant_titles(
    roles: list[str], titles: list[str], *, user_id: object = None
) -> set[str]:
    """Titles relevant to any of the roles. Adding a role can only add titles."""
    unique = list(dict.fromkeys(t for t in titles if t))
    if not roles or not unique:
        return set(unique)
    relevant: set[str] = set()
    for role in roles:
        relevant |= await _screen_role(role, unique, user_id)
    return relevant
