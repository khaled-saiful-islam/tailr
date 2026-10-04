from __future__ import annotations

import pytest

from app.modules.sources.salary import SalaryRange, parse_salary


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("RM 15,000 \u2013 RM 20,000 per month", SalaryRange(15000, 20000)),
        ("MYR 20K-MYR 25K / month", SalaryRange(20000, 25000)),
        ("MYR 120,000.00/yr - MYR 150,000.00/yr", SalaryRange(10000, 12500)),
        ("RM 4,500 per month", SalaryRange(4500, 4500)),
        ("RM5,000 - RM7,000", SalaryRange(5000, 7000)),
    ],
)
def test_parses_common_shapes(text: str, expected: SalaryRange) -> None:
    assert parse_salary(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        None,
        "",
        "Competitive",
        "RM 25 per hour",
        "USD 5,000 per month",
        "SGD 8,000 - 10,000",
        "Up to 30 days leave",
    ],
)
def test_ignores_what_it_cannot_compare(text: str | None) -> None:
    assert parse_salary(text) is None


def test_label() -> None:
    assert SalaryRange(5000, 7000).label == "RM 5,000 to RM 7,000 a month"
