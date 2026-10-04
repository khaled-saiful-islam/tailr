"""JobStreet Malaysia (SEEK): the JSON search API and GraphQL job details that
JobStreet's own website uses. Its HTML pages sit behind a bot check; these don't.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from app.core.clock import utcnow
from app.modules.sources import http
from app.modules.sources.base import JobCard, JobDetail, JobRef, SearchQuery, SourceError, WorkMode
from app.modules.sources.salary import parse_salary
from app.modules.sources.text import clean, html_to_text

SEARCH_URL = "https://my.jobstreet.com/api/jobsearch/v5/search"
GRAPHQL_URL = "https://my.jobstreet.com/graphql"
JOB_PAGE = "https://my.jobstreet.com/job/{id}"
DETAILS_QUERY = (
    "query jobDetails($jobId: ID!) { jobDetails(id: $jobId) { job { id title "
    "advertiser { name } location { label } salary { label } workTypes { label } "
    "content(platform: WEB) } } }"
)
_MODES = {
    "remote": WorkMode.REMOTE,
    "hybrid": WorkMode.HYBRID,
    "on-site": WorkMode.ONSITE,
    "onsite": WorkMode.ONSITE,
}
_TYPES = {
    "full time": "full_time",
    "part time": "part_time",
    "contract/temp": "contract",
    "contract": "contract",
    "casual/vacation": "part_time",
    "internship": "internship",
}


_GLUED_NEW = re.compile(r"(?<=[a-z0-9)])New$")


def _title(raw: str | None) -> str | None:
    """Some employers glue a "New" badge onto the title ("Backend EngineerNew")."""
    title = clean(raw)
    return _GLUED_NEW.sub("", title).strip() if title else None


def _mode(job: dict[str, Any]) -> WorkMode | None:
    label = ((job.get("workArrangements") or {}).get("displayText") or "").strip().lower()
    return _MODES.get(label)


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_search(payload: dict[str, Any]) -> list[JobCard]:
    cards: list[JobCard] = []
    for job in payload.get("data") or []:
        job_id = str(job.get("id") or "")
        title = _title(job.get("title"))
        company = clean(job.get("companyName") or (job.get("advertiser") or {}).get("description"))
        if not job_id or not title or not company:
            continue
        locations = job.get("locations") or [{}]
        salary_text = clean(job.get("salaryLabel"))
        salary = parse_salary(salary_text)
        work_types = job.get("workTypes") or []
        bullets = [clean(b) for b in (job.get("bulletPoints") or [])]
        snippet = " ".join(filter(None, [clean(job.get("teaser")), *bullets]))
        cards.append(
            JobCard(
                source="jobstreet",
                external_id=job_id,
                url=JOB_PAGE.format(id=job_id),
                title=title,
                company=company,
                location=clean(locations[0].get("label")),
                posted_at=_parse_date(job.get("listingDate")),
                posted_text=clean(job.get("listingDateDisplay")),
                salary_text=salary_text,
                salary_min=salary.minimum if salary else None,
                salary_max=salary.maximum if salary else None,
                work_mode=_mode(job),
                employment_type=_TYPES.get(str(work_types[0]).strip().lower())
                if work_types
                else None,
                snippet=snippet or None,
            )
        )
    return cards


def parse_details(payload: dict[str, Any], external_id: str) -> JobDetail:
    job = (((payload.get("data") or {}).get("jobDetails") or {}).get("job")) or {}
    content = job.get("content")
    if not content:
        raise SourceError("jobstreet", "job details had no description")
    location = (job.get("location") or {}).get("label")
    return JobDetail(
        source="jobstreet",
        external_id=external_id,
        description_text=html_to_text(content),
        description_html=content,
        title=_title(job.get("title")),
        company=clean((job.get("advertiser") or {}).get("name")),
        location=clean(location.removesuffix(", MY")) if location else None,
        salary_text=clean((job.get("salary") or {}).get("label")),
        employment_type=_TYPES.get(
            str((job.get("workTypes") or {}).get("label", "")).strip().lower()
        ),
    )


class JobStreetSource:
    key = "jobstreet"
    label = "JobStreet"
    detail_concurrency = 2
    detail_pause = (0.2, 0.8)

    async def search(self, query: SearchQuery) -> list[JobCard]:
        location = "" if query.location.strip().lower() == "malaysia" else query.location
        response = await http.fetch(
            self.key,
            "GET",
            SEARCH_URL,
            params={
                "siteKey": "MY-Main",
                "where": location or "Malaysia",
                "keywords": query.keywords,
                "daterange": query.freshness_days,
                "sortmode": "ListedDate",
                "page": 1,
                "pageSize": min(query.limit, 30),
            },
            headers={"Accept": "application/json"},
        )
        try:
            payload = response.json()
        except ValueError as error:
            raise SourceError(self.key, "search answer was not JSON") from error
        now = utcnow()
        cutoff = now.timestamp() - query.freshness_days * 86400
        cards = parse_search(payload)
        return [c for c in cards if c.posted_at is None or c.posted_at.timestamp() >= cutoff][
            : query.limit
        ]

    async def details(self, ref: JobRef) -> JobDetail:
        response = await http.fetch(
            self.key,
            "POST",
            GRAPHQL_URL,
            json={
                "operationName": "jobDetails",
                "variables": {"jobId": ref.external_id},
                "query": DETAILS_QUERY,
            },
            headers={
                "Content-Type": "application/json",
                "seek-request-brand": "jobstreet",
                "seek-request-country": "MY",
            },
        )
        try:
            payload = response.json()
        except ValueError as error:
            raise SourceError(self.key, "details answer was not JSON") from error
        return parse_details(payload, ref.external_id)
