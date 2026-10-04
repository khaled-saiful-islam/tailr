"""LinkedIn: public job search, no sign-in.

Uses the same guest endpoints LinkedIn's own logged-out job pages load:
search results come ten at a time; each job's page has the full description.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

from selectolax.lexbor import LexborHTMLParser, LexborNode

from app.core.clock import utcnow
from app.modules.sources import http
from app.modules.sources.base import JobCard, JobDetail, JobRef, SearchQuery, SourceError
from app.modules.sources.salary import parse_salary
from app.modules.sources.text import clean, html_to_text, parse_relative

SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
JOB_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{id}"
PAGE_SIZE = 10
_MYT = ZoneInfo("Asia/Kuala_Lumpur")
_ID = re.compile(r"(\d{6,})")


def _text(node: LexborNode | None) -> str | None:
    return clean(node.text()) if node is not None else None


def parse_search(html: str, *, now: datetime | None = None) -> list[JobCard]:
    now = now or utcnow()
    tree = LexborHTMLParser(html)
    cards: list[JobCard] = []
    for node in tree.css("div.base-search-card"):
        urn = node.attributes.get("data-entity-urn") or ""
        link = node.css_first("a.base-card__full-link")
        href = (link.attributes.get("href") or "") if link else ""
        match = _ID.search(urn) or _ID.search(href)
        title = _text(node.css_first(".base-search-card__title"))
        company = _text(node.css_first(".base-search-card__subtitle"))
        if not match or not title or not company:
            continue
        time_node = node.css_first("time")
        posted_text = _text(time_node)
        posted_at = parse_relative(posted_text, now)
        if posted_at is None and time_node is not None and time_node.attributes.get("datetime"):
            day = datetime.fromisoformat(str(time_node.attributes["datetime"])).date()
            posted_at = datetime.combine(day, time(9), tzinfo=_MYT).astimezone(UTC)
        salary_text = _text(node.css_first(".job-search-card__salary-info"))
        salary = parse_salary(salary_text)
        logo = node.css_first("img.artdeco-entity-image")
        cards.append(
            JobCard(
                source="linkedin",
                external_id=match.group(1),
                url=f"https://www.linkedin.com/jobs/view/{match.group(1)}/",
                title=title,
                company=company,
                location=_text(node.css_first(".job-search-card__location")),
                posted_at=posted_at,
                posted_text=posted_text,
                salary_text=salary_text,
                salary_min=salary.minimum if salary else None,
                salary_max=salary.maximum if salary else None,
                snippet=_text(node.css_first(".job-posting-benefits__text")),
                company_logo=(logo.attributes.get("data-delayed-url") if logo else None),
            )
        )
    return cards


def parse_details(html: str, external_id: str) -> JobDetail:
    tree = LexborHTMLParser(html)
    body = tree.css_first(".show-more-less-html__markup") or tree.css_first(".description__text")
    if body is None:
        raise SourceError("linkedin", "job page had no description")
    criteria: dict[str, str] = {}
    for item in tree.css(".description__job-criteria-item"):
        label = _text(item.css_first(".description__job-criteria-subheader"))
        value = _text(item.css_first(".description__job-criteria-text"))
        if label and value:
            criteria[label.lower()] = value
    markup = body.inner_html or ""
    return JobDetail(
        source="linkedin",
        external_id=external_id,
        description_text=html_to_text(markup),
        description_html=markup,
        seniority=criteria.get("seniority level"),
        employment_type=criteria.get("employment type"),
        industries=criteria.get("industries"),
        applicants=_text(tree.css_first(".num-applicants__caption")),
    )


class LinkedInSource:
    key = "linkedin"
    label = "LinkedIn"
    # LinkedIn throttles its job pages quickly: one at a time, with a pause.
    detail_concurrency = 1
    detail_pause = (1.0, 2.2)

    async def search(self, query: SearchQuery) -> list[JobCard]:
        cards: list[JobCard] = []
        seen: set[str] = set()
        for start in range(0, query.limit, PAGE_SIZE):
            response = await http.fetch(
                self.key,
                "GET",
                SEARCH_URL,
                params={
                    "keywords": query.keywords,
                    "location": query.location,
                    "f_TPR": f"r{query.freshness_days * 86400}",
                    "sortBy": "DD",
                    "start": start,
                },
            )
            page = [card for card in parse_search(response.text) if card.external_id not in seen]
            seen.update(card.external_id for card in page)
            cards += page
            if len(page) < PAGE_SIZE // 2:
                break  # the last page
        return cards[: query.limit]

    async def details(self, ref: JobRef) -> JobDetail:
        response = await http.fetch(
            self.key, "GET", JOB_URL.format(id=ref.external_id), kind="details"
        )
        return parse_details(response.text, ref.external_id)
