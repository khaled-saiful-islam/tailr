# Job sources

Tailr reads public job listings from the sites Malaysians use. Each site is a **connector**
behind one contract (`app/modules/sources/base.py`):

```python
class JobSource(Protocol):
    key: str
    label: str
    async def search(self, query: SearchQuery) -> list[JobCard]   # search results
    async def details(self, ref: JobRef) -> JobDetail              # the full description
```

## Connectors

| Site | Search | Details | Runs on |
|---|---|---|---|
| LinkedIn | Public guest search (`/jobs-guest/jobs/api/seeMoreJobPostings/search`), 10 per page | Public job page (`/jobs-guest/jobs/api/jobPosting/{id}`) | Server |
| JobStreet (SEEK) | JSON search API (`/api/jobsearch/v5/search`, `siteKey=MY-Main`) | GraphQL `jobDetails` | Server |
| Indeed, Glassdoor | — | — | Tailr Desktop (planned): their sites block server addresses (tested from AWS, 2026-10-02) |

Both server connectors use the same requests the sites' own logged-out pages make. No
accounts, no logins, no passwords. The parsers are pure functions tested against real
recorded responses in `backend/tests/fixtures/sources/`.

## Being a good citizen

- **Shared cache:** each search is cached for an hour (`SOURCE_SEARCH_CACHE_SECONDS`), so
  many users with similar radars cost one request.
- **Rate limit:** `SOURCE_REQUESTS_PER_MINUTE` per site across all workers (Redis), plus a
  short random pause before each request and at most two requests at a time per site.
- **Circuit breaker:** three failures in a row (or a 403/429/999) rest the site for ten
  minutes; the UI says it isn't answering instead of retrying hard.
- **Kill switch:** remove a key from `SOURCES_ENABLED` to switch a site off everywhere.
- **Run log:** every search and detail fetch is recorded in `source_runs` (status, results,
  duration, error), to spot a site that changed its pages.

## Normalised data

`JobCard`: source, external id, URL, title, company, location, posted time (absolute; relative
texts like "19h ago" are converted), salary text and parsed monthly RM range
(`salary.py`), work mode, employment type, snippet, logo.

Salary parsing understands "RM 15,000 – RM 20,000 per month", "MYR 20K-MYR 25K / month",
yearly figures (divided by 12) and ignores hourly rates and other currencies.

## Adding a source

1. `app/modules/sources/<site>.py` with `parse_search`/`parse_details` (pure) and a class with
   `key`, `label`, `search`, `details` using `http.fetch` (rate limit, breaker, jitter).
2. Record real responses into `tests/fixtures/sources/` and test the parsers.
3. Register it in `registry.py` and add the key to `SOURCES_ENABLED`.

## Terms of service

Reading public listings at low volume, cached and rate-limited, is how Tailr operates. Before
any public launch, get legal advice on each site's terms, and keep "paste a job link" (any
site) as the fallback that always works.
